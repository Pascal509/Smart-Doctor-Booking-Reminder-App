import React, { useState, useMemo } from 'react';
import { usePatientAppointments } from '../../hooks/usePatientAppointments';
import { format, isAfter, parseISO } from 'date-fns';

type FilterTab = 'all' | 'upcoming' | 'completed';

const AppointmentHistory: React.FC = () => {
  const { appointments, loading, error, refetch } = usePatientAppointments();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter appointments based on active tab
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    
    switch (activeTab) {
      case 'upcoming':
        return appointments.filter(apt => {
          const appointmentDate = parseISO(apt.appointment_time);
          return isAfter(appointmentDate, now) && apt.status !== 'CANCELLED';
        });
      case 'completed':
        return appointments.filter(apt => {
          const appointmentDate = parseISO(apt.appointment_time);
          return !isAfter(appointmentDate, now) || apt.status === 'COMPLETED';
        });
      default:
        return appointments;
    }
  }, [appointments, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAppointmentDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy - h:mm a');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Appointment History</h2>
        
        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Appointments', count: appointments.length },
              { key: 'upcoming', label: 'Upcoming', count: appointments.filter(apt => {
                const now = new Date();
                const appointmentDate = parseISO(apt.appointment_time);
                return isAfter(appointmentDate, now) && apt.status !== 'CANCELLED';
              }).length },
              { key: 'completed', label: 'Completed', count: appointments.filter(apt => {
                const now = new Date();
                const appointmentDate = parseISO(apt.appointment_time);
                return !isAfter(appointmentDate, now) || apt.status === 'COMPLETED';
              }).length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as FilterTab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab === 'all' ? '' : activeTab} appointments found
          </h3>
          <p className="text-gray-600">
            {activeTab === 'upcoming' 
              ? 'You have no upcoming appointments scheduled.'
              : activeTab === 'completed'
              ? 'You have no completed appointments.'
              : 'You have no appointments in your history.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map(appointment => (
            <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Dr. {appointment.doctor?.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                      </svg>
                      <span>{appointment.doctor?.specialty?.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1-1V8a1 1 0 011-1h3z" />
                      </svg>
                      <span>{formatAppointmentDate(appointment.appointment_time)}</span>
                    </div>
                    
                    {appointment.patient_notes && (
                      <div className="flex items-start gap-2 mt-2">
                        <svg className="h-4 w-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-700">{appointment.patient_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    ID: {appointment.id}
                  </div>
                  {appointment.created_at && (
                    <div className="text-xs text-gray-400 mt-1">
                      Booked: {format(parseISO(appointment.created_at), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentHistory;