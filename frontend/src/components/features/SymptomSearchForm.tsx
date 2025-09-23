import React, { useState } from 'react';

interface SymptomSearchFormProps {
  onAISuggest?: (symptom: string) => void;
  className?: string;
}

const SymptomSearchForm: React.FC<SymptomSearchFormProps> = ({ 
  onAISuggest,
  className = '' 
}) => {
  const [symptom, setSymptom] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Placeholder function for AI suggest functionality
  const handleAISuggest = async (symptom: string): Promise<void> => {
    if (!symptom.trim()) {
      alert('Please enter a symptom before requesting AI suggestions.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the optional callback if provided
      if (onAISuggest) {
        onAISuggest(symptom);
      } else {
        // Default behavior - show alert with suggestion
        console.log(`AI Suggest called with symptom: ${symptom}`);
        alert(`AI Analysis for "${symptom}":\n\nBased on your symptom, here are some possible conditions to discuss with a doctor:\n\n• Common cold or flu\n• Allergic reaction\n• Stress-related symptoms\n\nPlease consult with a healthcare professional for proper diagnosis.`);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      alert('Sorry, there was an error getting AI suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleAISuggest(symptom);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSymptom(e.target.value);
  };

  return (
    <div className={`max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Symptom Analysis
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="symptom-input" 
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Describe your symptom
          </label>
          <input
            id="symptom-input"
            type="text"
            value={symptom}
            onChange={handleInputChange}
            placeholder="e.g., headache, fever, cough..."
            className="input-field"
            disabled={isLoading}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !symptom.trim()}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isLoading || !symptom.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 transform hover:scale-105'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                />
              </svg>
              <span>AI Suggest</span>
            </div>
          )}
        </button>
      </form>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>💡 AI suggestions are for informational purposes only.</p>
        <p>Always consult a healthcare professional for medical advice.</p>
      </div>
    </div>
  );
};

export default SymptomSearchForm;