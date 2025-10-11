// src/components/EmployeeCheckinModal.jsx
import { useState, useEffect, useRef } from 'react';

/**
 * Employee Check-in/out Modal
 * Shows when someone stares at the screen for extended period
 * Allows employees to clock in or out with their PIN
 */
export default function EmployeeCheckinModal({ open, onClose, capturedPhoto }) {
  const [step, setStep] = useState('welcome'); // 'welcome' | 'pin' | 'success'
  const [action, setAction] = useState(null); // 'checkin' | 'checkout'
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const inputRef = useRef(null);

  // Mock employee database - in production this would come from Supabase
  const employees = {
    '1234': { name: 'John Doe', currentlyClocked: false },
    '5678': { name: 'Jane Smith', currentlyClocked: true },
    '9999': { name: 'Test User', currentlyClocked: false },
  };

  useEffect(() => {
    if (open) {
      setStep('welcome');
      setAction(null);
      setPin('');
      setError('');
      setEmployeeName('');
    }
  }, [open]);

  useEffect(() => {
    if (step === 'pin' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [step]);

  const handleActionSelect = (selectedAction) => {
    setAction(selectedAction);
    setStep('pin');
  };

  const handlePinSubmit = (e) => {
    e?.preventDefault();

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setPin('');
      setTimeout(() => setError(''), 2000);
      return;
    }

    const employee = employees[pin];

    if (!employee) {
      setError('Employee not found');
      setPin('');
      setTimeout(() => setError(''), 2000);
      return;
    }

    setEmployeeName(employee.name);

    // In production, save to Supabase:
    // - Record timestamp
    // - Save action (checkin/checkout)
    // - Save employee ID
    // - Save optional photo if captured
    console.log(`[EmployeeCheckin] ${action} for ${employee.name} at ${new Date().toISOString()}`);

    setStep('success');

    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose?.();
    }, 3000);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');

    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => {
        const employee = employees[value];

        if (!employee) {
          setError('Employee not found');
          setPin('');
          setTimeout(() => setError(''), 2000);
          return;
        }

        setEmployeeName(employee.name);
        console.log(`[EmployeeCheckin] ${action} for ${employee.name} at ${new Date().toISOString()}`);

        // Dismiss virtual keyboard
        if (inputRef.current) {
          inputRef.current.blur();
        }

        setStep('success');

        setTimeout(() => {
          onClose?.();
        }, 3000);
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
    if (e.key === 'Enter' && pin.length === 4) {
      handlePinSubmit();
    }
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'welcome') {
          onClose?.();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1e25 0%, #11141a 100%)',
          borderRadius: 20,
          padding: 48,
          border: '2px solid #2a2f37',
          minWidth: 400,
          maxWidth: 500,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Welcome Screen */}
        {step === 'welcome' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h2 style={{ margin: '0 0 16px', color: '#f3f5f7', fontSize: 28 }}>
              Employee Check-in
            </h2>
            <p style={{ margin: '0 0 32px', color: '#a7b0b8', fontSize: 16 }}>
              Are you starting or ending your shift?
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                onClick={() => handleActionSelect('checkin')}
                style={{
                  flex: 1,
                  padding: '20px 32px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                ⏰ Clock In
              </button>
              <button
                onClick={() => handleActionSelect('checkout')}
                style={{
                  flex: 1,
                  padding: '20px 32px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                🏁 Clock Out
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: 24,
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid #2a2f37',
                borderRadius: 8,
                color: '#a7b0b8',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {/* PIN Entry Screen */}
        {step === 'pin' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {action === 'checkin' ? '⏰' : '🏁'}
            </div>
            <h2 style={{ margin: '0 0 16px', color: '#f3f5f7', fontSize: 28 }}>
              Enter Your PIN
            </h2>
            <p style={{ margin: '0 0 32px', color: '#a7b0b8', fontSize: 16 }}>
              {action === 'checkin' ? 'Clocking in for your shift' : 'Clocking out of your shift'}
            </p>

            <form onSubmit={handlePinSubmit}>
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handleKeyDown}
                placeholder="••••"
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  fontSize: 40,
                  textAlign: 'center',
                  letterSpacing: '0.5em',
                  background: '#11141a',
                  border: error ? '2px solid #ef4444' : '2px solid #3b82f6',
                  borderRadius: 12,
                  color: '#f3f5f7',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />

              {error && (
                <div style={{ marginTop: 16, color: '#ef4444', fontSize: 14, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 24, fontSize: 13, color: '#6b7280' }}>
                Enter your 4-digit employee PIN
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('welcome');
                  setPin('');
                  setError('');
                }}
                style={{
                  marginTop: 24,
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid #2a2f37',
                  borderRadius: 8,
                  color: '#a7b0b8',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </form>
          </>
        )}

        {/* Success Screen */}
        {step === 'success' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 16px', color: '#f3f5f7', fontSize: 28 }}>
              {action === 'checkin' ? 'Clocked In!' : 'Clocked Out!'}
            </h2>
            <p style={{ margin: '0 0 8px', color: '#10b981', fontSize: 20, fontWeight: 600 }}>
              {employeeName}
            </p>
            <p style={{ margin: 0, color: '#a7b0b8', fontSize: 14 }}>
              {new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </p>
            <div style={{ marginTop: 24, fontSize: 13, color: '#6b7280' }}>
              Closing automatically...
            </div>
          </>
        )}
      </div>
    </div>
  );
}
