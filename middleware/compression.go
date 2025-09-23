package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	// "smart-doctor-booking-app/utils"
)

// CompressionConfig holds compression configuration
type CompressionConfig struct {
	Enabled           bool
	Level             int      // gzip compression level (1-9)
	MinLength         int      // minimum response size to compress
	ExcludedPaths     []string // paths to exclude from compression
	ExcludedMimeTypes []string // MIME types to exclude from compression
}

// DefaultCompressionConfig returns default compression configuration
func DefaultCompressionConfig() CompressionConfig {
	return CompressionConfig{
		Enabled:   true,
		Level:     gzip.DefaultCompression,
		MinLength: 1024, // Only compress responses larger than 1KB
		ExcludedPaths: []string{
			"/health",
			"/metrics",
		},
		ExcludedMimeTypes: []string{
			"image/",
			"video/",
			"audio/",
			"application/zip",
			"application/gzip",
			"application/x-gzip",
		},
	}
}

// gzipWriter wraps gin.ResponseWriter to provide gzip compression
type gzipWriter struct {
	gin.ResponseWriter
	writer *gzip.Writer
	logger *logrus.Logger
}

// Write compresses and writes data
func (g *gzipWriter) Write(data []byte) (int, error) {
	return g.writer.Write(data)
}

// WriteString compresses and writes string data
func (g *gzipWriter) WriteString(s string) (int, error) {
	return g.writer.Write([]byte(s))
}

// Close closes the gzip writer
func (g *gzipWriter) Close() error {
	return g.writer.Close()
}

// gzipWriterPool manages a pool of gzip writers for better performance
var gzipWriterPool = sync.Pool{
	New: func() interface{} {
		return &gzip.Writer{}
	},
}

// getGzipWriter gets a gzip writer from the pool
func getGzipWriter(level int, w io.Writer) *gzip.Writer {
	gzw := gzipWriterPool.Get().(*gzip.Writer)
	gzw.Reset(w)
	// Note: We can't change the compression level after creation in the standard library
	// For production, consider using a different gzip library that supports level changes
	return gzw
}

// putGzipWriter returns a gzip writer to the pool
func putGzipWriter(gzw *gzip.Writer) {
	gzw.Close()
	gzipWriterPool.Put(gzw)
}

// CompressionMiddleware creates a response compression middleware
func CompressionMiddleware(config CompressionConfig, logger *logrus.Logger) gin.HandlerFunc {
	if !config.Enabled {
		// Return a no-op middleware if compression is disabled
		return func(c *gin.Context) {
			c.Next()
		}
	}

	return func(c *gin.Context) {
		// Check if client accepts gzip encoding
		if !shouldCompress(c, config) {
			c.Next()
			return
		}

		// Create gzip writer
		gzw := getGzipWriter(config.Level, c.Writer)
		defer putGzipWriter(gzw)

		// Wrap the response writer
		gzipWriter := &gzipWriter{
			ResponseWriter: c.Writer,
			writer:         gzw,
			logger:         logger,
		}

		// Set compression headers
		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")

		// Replace the writer
		c.Writer = gzipWriter

		// Process the request
		c.Next()

		// Ensure the gzip writer is closed
		gzipWriter.Close()

		logger.Debug("Response compressed",
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"status", c.Writer.Status())
	}
}

// shouldCompress determines if the response should be compressed
func shouldCompress(c *gin.Context, config CompressionConfig) bool {
	// Check if client accepts gzip
	if !strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
		return false
	}

	// Check if path is excluded
	for _, excludedPath := range config.ExcludedPaths {
		if strings.HasPrefix(c.Request.URL.Path, excludedPath) {
			return false
		}
	}

	// Check if this is a WebSocket upgrade request
	if c.GetHeader("Upgrade") == "websocket" {
		return false
	}

	// Check if Content-Type should be excluded
	contentType := c.GetHeader("Content-Type")
	for _, excludedType := range config.ExcludedMimeTypes {
		if strings.HasPrefix(contentType, excludedType) {
			return false
		}
	}

	return true
}

// SmartCompressionMiddleware provides intelligent compression based on response characteristics
func SmartCompressionMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	config := DefaultCompressionConfig()

	return func(c *gin.Context) {
		if !shouldCompress(c, config) {
			c.Next()
			return
		}

		// Use a custom response writer to capture response data
		smartWriter := &smartCompressionWriter{
			ResponseWriter: c.Writer,
			config:         config,
			logger:         logger,
			buffer:         make([]byte, 0),
		}

		c.Writer = smartWriter
		c.Next()

		// Finalize the response
		smartWriter.finalize()
	}
}

// smartCompressionWriter buffers response data to make intelligent compression decisions
type smartCompressionWriter struct {
	gin.ResponseWriter
	config         CompressionConfig
	logger         *logrus.Logger
	buffer         []byte
	headersWritten bool
	compressed     bool
}

// Write buffers the response data
func (w *smartCompressionWriter) Write(data []byte) (int, error) {
	if w.headersWritten {
		// Headers already written, write directly
		return w.ResponseWriter.Write(data)
	}

	// Buffer the data
	w.buffer = append(w.buffer, data...)
	return len(data), nil
}

// WriteHeader writes the status code and decides on compression
func (w *smartCompressionWriter) WriteHeader(statusCode int) {
	if w.headersWritten {
		return
	}

	w.headersWritten = true

	// Decide whether to compress based on buffered data
	if w.shouldCompressResponse() {
		w.compressed = true
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Vary", "Accept-Encoding")
		w.Header().Del("Content-Length") // Remove content-length as it will change
	}

	w.ResponseWriter.WriteHeader(statusCode)
}

// shouldCompressResponse determines if the buffered response should be compressed
func (w *smartCompressionWriter) shouldCompressResponse() bool {
	// Check minimum length
	if len(w.buffer) < w.config.MinLength {
		return false
	}

	// Check content type
	contentType := w.Header().Get("Content-Type")
	for _, excludedType := range w.config.ExcludedMimeTypes {
		if strings.HasPrefix(contentType, excludedType) {
			return false
		}
	}

	// Estimate compression ratio for text-based content
	if strings.HasPrefix(contentType, "application/json") ||
		strings.HasPrefix(contentType, "text/") ||
		strings.HasPrefix(contentType, "application/xml") {
		return true
	}

	return false
}

// finalize writes the buffered data, applying compression if decided
func (w *smartCompressionWriter) finalize() {
	if !w.headersWritten {
		w.WriteHeader(http.StatusOK)
	}

	if len(w.buffer) == 0 {
		return
	}

	if w.compressed {
		// Compress and write the data
		gzw := getGzipWriter(w.config.Level, w.ResponseWriter)
		defer putGzipWriter(gzw)

		_, err := gzw.Write(w.buffer)
		if err != nil {
			w.logger.Error("Failed to compress response", "error", err)
			// Fall back to uncompressed
			w.Header().Del("Content-Encoding")
			w.ResponseWriter.Write(w.buffer)
			return
		}

		err = gzw.Close()
		if err != nil {
			w.logger.Error("Failed to close gzip writer", "error", err)
		}

		w.logger.Debug("Smart compression applied",
			"original_size", len(w.buffer),
			"content_type", w.Header().Get("Content-Type"))
	} else {
		// Write uncompressed
		w.ResponseWriter.Write(w.buffer)
	}
}
