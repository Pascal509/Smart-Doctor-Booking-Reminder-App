// Smart Doctor Booking & Reminder App - Client Side JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
});

function initializeApp() {
    // Add event listeners
    setupEventListeners();
    
    // Initialize date inputs
    setupDateInputs();
    
    // Add animations
    addAnimations();
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Filter functionality
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', handleFilter);
    }
    
    // Appointment cancellation
    const cancelButtons = document.querySelectorAll('.cancel-appointment');
    cancelButtons.forEach(button => {
        button.addEventListener('click', handleCancelAppointment);
    });
    
    // Form validation
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', validateBookingForm);
    }
    
    // Time slot selection
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', selectTimeSlot);
    });
}

function setupDateInputs() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        input.min = today;
        
        // Set maximum date to 3 months from now
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        input.max = maxDate.toISOString().split('T')[0];
    });
}

function addAnimations() {
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100);
    });
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const doctorCards = document.querySelectorAll('.doctor-card');
    
    doctorCards.forEach(card => {
        const doctorName = card.querySelector('h3').textContent.toLowerCase();
        const specialty = card.querySelector('.specialty').textContent.toLowerCase();
        
        if (doctorName.includes(searchTerm) || specialty.includes(searchTerm)) {
            card.style.display = 'block';
            card.classList.add('fade-in');
        } else {
            card.style.display = 'none';
            card.classList.remove('fade-in');
        }
    });
}

function handleFilter(event) {
    const selectedSpecialty = event.target.value;
    const url = new URL(window.location);
    
    if (selectedSpecialty === 'all') {
        url.searchParams.delete('specialty');
    } else {
        url.searchParams.set('specialty', selectedSpecialty);
    }
    
    window.location.href = url.toString();
}

function selectTimeSlot(event) {
    // Remove selection from other time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    event.target.classList.add('selected');
    
    // Update hidden input
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = event.target.textContent;
    }
}

function validateBookingForm(event) {
    const form = event.target;
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    // Clear previous error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            showFieldError(field, 'This field is required');
        }
    });
    
    // Validate email
    const emailField = form.querySelector('input[type="email"]');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            isValid = false;
            showFieldError(emailField, 'Please enter a valid email address');
        }
    }
    
    // Validate phone
    const phoneField = form.querySelector('input[type="tel"]');
    if (phoneField && phoneField.value) {
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        if (!phoneRegex.test(phoneField.value) || phoneField.value.length < 10) {
            isValid = false;
            showFieldError(phoneField, 'Please enter a valid phone number');
        }
    }
    
    // Validate date
    const dateField = form.querySelector('input[type="date"]');
    if (dateField && dateField.value) {
        const selectedDate = new Date(dateField.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            isValid = false;
            showFieldError(dateField, 'Please select a future date');
        }
    }
    
    if (!isValid) {
        event.preventDefault();
        showAlert('Please correct the errors and try again', 'error');
    }
}

function showFieldError(field, message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.style.color = '#dc3545';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.textContent = message;
    
    field.parentNode.appendChild(errorElement);
    field.style.borderColor = '#dc3545';
}

function handleCancelAppointment(event) {
    event.preventDefault();
    
    const appointmentId = event.target.dataset.appointmentId;
    const patientName = event.target.dataset.patientName;
    
    if (confirm(`Are you sure you want to cancel the appointment for ${patientName}?`)) {
        cancelAppointment(appointmentId, event.target);
    }
}

async function cancelAppointment(appointmentId, button) {
    try {
        // Show loading state
        const originalText = button.textContent;
        button.innerHTML = '<span class="loading"></span> Cancelling...';
        button.disabled = true;
        
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            // Remove the appointment row
            const row = button.closest('tr');
            if (row) {
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                }, 300);
            }
            
            showAlert('Appointment cancelled successfully', 'success');
        } else {
            throw new Error('Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showAlert('Failed to cancel appointment. Please try again.', 'error');
        
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.alert').forEach(alert => {
        alert.remove();
    });
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
    alert.textContent = message;
    
    // Insert at the top of the main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(alert, main.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.transition = 'opacity 0.3s';
                alert.style.opacity = '0';
                setTimeout(() => {
                    alert.remove();
                }, 300);
            }
        }, 5000);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleSearch,
        validateBookingForm,
        formatDate,
        formatTime
    };
}