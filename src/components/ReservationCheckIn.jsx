// src/components/ReservationCheckIn.jsx
import { useState } from 'react';

export default function ReservationCheckIn({ onClose }) {
  const [step, setStep] = useState('search'); // search, confirm, success
  const [searchType, setSearchType] = useState('phone'); // phone or name
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Mock reservations data
  const mockReservations = (phone.length >= 10 || name.length >= 3) ? [
    {
      id: 1,
      name: 'Smith Party',
      size: 4,
      time: '6:30 PM',
      status: 'confirmed',
      table: 'Table 12',
    },
    {
      id: 2,
      name: 'Johnson',
      size: 2,
      time: '7:00 PM',
      status: 'confirmed',
      table: 'Table 5',
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
              🍽️ Reservation Check-In
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: 30, textAlign: 'center', fontSize: 16 }}>
              Check in for your reservation
            </p>

            {/* Search Type Toggle */}
            <div style={{ marginBottom: 24, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSearchType('phone')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: searchType === 'phone' ? '2px solid #3b82f6' : '1px solid #2a2f37',
                  background: searchType === 'phone' ? '#1e3a8a' : '#16181d',
                  color: searchType === 'phone' ? '#60a5fa' : '#e9eef3',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: searchType === 'phone' ? 600 : 400,
                }}
              >
                📱 Phone Number
              </button>
              <button
                onClick={() => setSearchType('name')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: searchType === 'name' ? '2px solid #3b82f6' : '1px solid #2a2f37',
                  background: searchType === 'name' ? '#1e3a8a' : '#16181d',
                  color: searchType === 'name' ? '#60a5fa' : '#e9eef3',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: searchType === 'name' ? 600 : 400,
                }}
              >
                👤 Name
              </button>
            </div>

            {searchType === 'phone' ? (
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
            ) : (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 15, fontWeight: 600 }}>
                  Name on Reservation
                </label>
                <input
                  type="text"
                  placeholder="Last name or party name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
            )}

            {mockReservations.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 16, fontSize: 18 }}>Your Reservations Today</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {mockReservations.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => {
                        setSelectedReservation(res);
                        setStep('confirm');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05))',
                        border: '2px solid #f97316',
                        borderRadius: 12,
                        padding: 20,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(249, 115, 22, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
                            {res.name}
                          </div>
                          <div style={{ color: '#9ca3af', fontSize: 14 }}>
                            Party of {res.size} • {res.table}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>
                            {res.time}
                          </div>
                          <div style={{
                            marginTop: 4,
                            padding: '4px 8px',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {res.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {((phone.length >= 10 && searchType === 'phone') || (name.length >= 3 && searchType === 'name')) && mockReservations.length === 0 && (
              <div style={{
                padding: 20,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                color: '#fca5a5',
                textAlign: 'center',
              }}>
                No reservations found. Please check with the host stand.
              </div>
            )}
          </>
        )}

        {step === 'confirm' && selectedReservation && (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 32, textAlign: 'center' }}>
              ✅ Confirm Arrival
            </h2>
            <p style={{ color: '#9ca3af', marginBottom: 30, textAlign: 'center', fontSize: 16 }}>
              Please confirm your reservation details
            </p>

            <div style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.05))',
              border: '1px solid #f97316',
              borderRadius: 12,
              padding: 24,
              marginBottom: 30,
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Reservation Name</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedReservation.name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Party Size</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedReservation.size} guests</div>
                </div>
                <div>
                  <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Time</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#f97316' }}>{selectedReservation.time}</div>
                </div>
              </div>
              <div>
                <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 4 }}>Table Assignment</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedReservation.table}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <button
                onClick={handleCheckIn}
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#f97316',
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✓ I'm Here - Notify Host
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
            <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 32, marginBottom: 10 }}>Welcome!</h2>
            <p style={{ color: '#9ca3af', fontSize: 18, marginBottom: 20 }}>
              Your host has been notified of your arrival
            </p>
            <div style={{
              padding: 16,
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid #f97316',
              borderRadius: 8,
              color: '#f97316',
              marginBottom: 16,
            }}>
              Please wait at the host stand
            </div>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Your table will be ready shortly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
