import React from 'react';
import SymptomSearchForm from './components/features/SymptomSearchForm';
import AppointmentScheduler from './components/features/AppointmentScheduler';
import { TimeSlotPickerDemo } from './components/TimeSlotPickerDemo';
import { AppointmentList } from './components/features/AppointmentList';
import AppointmentHistory from './components/features/AppointmentHistory';
// import { LoginForm } from './components/features/LoginForm'; // Commented out - not currently used
import { AuthProvider } from './contexts/AuthContext';
import HealthStatus from './components/layout/HealthStatus';
import CacheStatus from './components/layout/CacheStatus';
import DebugPanel from './components/layout/DebugPanel';
import './App.css';

function App() {
  // Custom handler for AI suggestions
  const handleAISuggest = (symptom: string): void => {
    console.log('AI Suggest triggered for symptom:', symptom);
    
    // Here you can integrate with your backend AI service
    // For now, we'll show a custom response
    const suggestions = {
      'headache': [
        'Tension headache - Consider stress management',
        'Migraine - Avoid triggers like bright lights',
        'Dehydration - Increase water intake'
      ],
      'fever': [
        'Viral infection - Rest and hydration',
        'Bacterial infection - May need antibiotics',
        'Heat exhaustion - Cool environment needed'
      ],
      'cough': [
        'Common cold - Rest and fluids',
        'Allergies - Identify and avoid allergens',
        'Bronchitis - May need medical evaluation'
      ]
    };

    const lowerSymptom = symptom.toLowerCase();
    const matchedSuggestions = Object.keys(suggestions).find(key => 
      lowerSymptom.includes(key)
    );

    if (matchedSuggestions) {
      const suggestionList = suggestions[matchedSuggestions as keyof typeof suggestions];
      alert(`AI Analysis for "${symptom}":\n\n${suggestionList.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n⚠️ Please consult a healthcare professional for proper diagnosis.`);
    } else {
      alert(`AI Analysis for "${symptom}":\n\nI recommend consulting with a healthcare professional for a proper evaluation of your symptoms.\n\nGeneral advice:\n• Monitor your symptoms\n• Stay hydrated\n• Get adequate rest\n• Seek medical attention if symptoms worsen`);
    }
  };

  return (
    <AuthProvider>
      <div className="App min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Doctor Booking
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <button className="text-gray-600 hover:text-primary-600 transition-colors">
                Find Doctors
              </button>
              <button className="text-gray-600 hover:text-primary-600 transition-colors">
                Appointments
              </button>
              <button className="text-gray-600 hover:text-primary-600 transition-colors">
                Health Records
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Symptom Analysis
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Describe your symptoms and get AI-powered insights to help you understand 
            potential conditions and find the right healthcare professional.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          <div className="flex justify-center">
            <SymptomSearchForm 
              onAISuggest={handleAISuggest}
              className="w-full max-w-lg"
            />
          </div>
          <div className="flex justify-center">
            <AppointmentScheduler className="w-full max-w-lg" />
          </div>
        </div>

        {/* TimeSlot Picker Demo Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Doctor Availability System
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Experience our new time slot picker that shows real-time doctor availability 
              and allows patients to select their preferred appointment times.
            </p>
          </div>
          <TimeSlotPickerDemo />
        </div>

        {/* Appointment Management Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Manage Your Appointments
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              View, manage, and cancel your scheduled appointments with ease. 
              Stay on top of your healthcare schedule.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <AppointmentList className="bg-white rounded-lg shadow-md p-6" />
          </div>
        </div>

        {/* Appointment History Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Appointment History
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Review your complete appointment history with filtering options for upcoming and completed visits. 
              Track your healthcare journey over time.
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <AppointmentHistory />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h3>
            <p className="text-gray-600">Get instant insights about your symptoms using advanced AI technology.</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Specialists</h3>
            <p className="text-gray-600">Connect with qualified doctors and specialists in your area.</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Booking</h3>
            <p className="text-gray-600">Book appointments securely with end-to-end encryption and privacy protection.</p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center text-gray-600">
              <p>&copy; 2024 Smart Doctor Booking. All rights reserved.</p>
              <p className="mt-2 text-sm">AI suggestions are for informational purposes only. Always consult healthcare professionals.</p>
            </div>
            
            {/* System Status for Developers */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">API:</span>
                <HealthStatus compact={true} autoRefresh={true} refreshInterval={60000} />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Cache:</span>
                <CacheStatus compact={true} autoRefresh={true} refreshInterval={60000} />
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Debug Panel for Development */}
      {process.env.NODE_ENV === 'development' && (
        <DebugPanel initiallyVisible={false} />
      )}
      </div>
    </AuthProvider>
  );
}

export default App;