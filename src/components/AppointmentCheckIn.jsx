// src/components/AppointmentCheckIn.jsx
import { useState } from 'react';

export default function AppointmentCheckIn({ onClose }) {
  const [step, setStep] = useState('search'); // search, confirm, success
  const [phone, setPhone] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Mock appointments data
  const mockAppointments = phone.length >= 10 ? [
    {
      id: 1,
      date: 'Today',
      time: '2:30 PM',
      service: 'Annual Checkup',
      provider: 'Dr. Sarah Johnson',
      type: 'healthcare',
    },
    {
      id: 2,
      date: 'Today',
      time: '3:15 PM',
      service: 'Facial Treatment',
      provider: 'Maria Garcia',
      type: 'medspa',
    },
  ] : [];

  const handleCheckIn = () => {
    setStep('success');
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 40,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#ef4444',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          ✕ Close
        </button>

        {step === 'search' && (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 32, textAlign: 'center' }}>
              📋 Appointment Check-In
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: 30, textAlign: 'center', fontSize: 16 }}>
              Enter your phone number to check in for your appointment
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 15, fontWeight: 600 }}>
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="(312) 555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: 18,
                  borderRadius: 8,
                  border: '1px solid #2a2f37',
                  background: '#16181d',
                  color: '#e9eef3',
                }}
                autoFocus
              />
            </div>

            {mockAppointments.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: 18 }}>Your Appointments Today</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {mockAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setStep('confirm');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
                        border: '2px solid #22c55e',
                        borderRadius: 12,
                        padding: 20,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 197, 94, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                            {apt.service}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: 14 }}>
                            with {apt.provider}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
                            {apt.time}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: 14 }}>
                            {apt.date}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phone.length >= 10 && mockAppointments.length === 0 && (
              <div style={{
                padding: 20,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                color: '#fca5a5',
                textAlign: 'center',
              }}>
                No appointments found for this phone number
              </div>
            )}
          </>
        )}

        {step === 'confirm' && selectedAppointment && (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 32, textAlign: 'center' }}>
              ✅ Confirm Check-In
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: 30, textAlign: 'center', fontSize: 16 }}>
              Please confirm your appointment details
            </p>

            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
              border: '1px solid #3b82f6',
              borderRadius: 12,
              padding: 24,
              marginBottom: 30,
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Service</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedAppointment.service}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Provider</div>
                <div style={{ fontSize: 18 }}>{selectedAppointment.provider}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Date</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedAppointment.date}</div>
                </div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Time</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#22c55e' }}>{selectedAppointment.time}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <button
                onClick={handleCheckIn}
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#22c55e',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✓ Check In Now
              </button>
              <button
                onClick={() => setStep('search')}
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  border: '1px solid #2a2f37',
                  background: '#16181d',
                  color: '#e9eef3',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Go Back
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 32, marginBottom: 10 }}>Check-In Complete!</h2>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 20 }}>
              Please have a seat and you'll be called shortly
            </p>
            <div style={{
              padding: 16,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              borderRadius: 8,
              color: '#22c55e',
            }}>
              Estimated wait time: 10-15 minutes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
