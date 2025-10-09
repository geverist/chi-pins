import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function EmployeeCheckIn({
  employee,
  onCheckIn,
  onCheckOut,
  onDismiss
}) {
  const [currentShift, setCurrentShift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [pinError, setPinError] = useState(false)
  const [needsPinVerification, setNeedsPinVerification] = useState(true)

  // Check if employee has an active shift
  useEffect(() => {
    const checkActiveShift = async () => {
      if (!employee) return

      try {
        const { data, error } = await supabase
          .from('employee_attendance')
          .select('*')
          .eq('employee_id', employee.id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .single()

        if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('[EmployeeCheckIn] Error checking active shift:', error)
        }

        setCurrentShift(data || null)
      } catch (error) {
        console.error('[EmployeeCheckIn] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkActiveShift()
  }, [employee])

  const verifyPin = () => {
    if (pinCode === employee.pin_code) {
      setPinError(false)
      setNeedsPinVerification(false)
      return true
    } else {
      setPinError(true)
      setPinCode('')
      return false
    }
  }

  const handlePinInput = (digit) => {
    if (pinCode.length < 4) {
      const newPin = pinCode + digit
      setPinCode(newPin)
      setPinError(false)

      // Auto-verify when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === employee.pin_code) {
            setPinError(false)
            setNeedsPinVerification(false)
          } else {
            setPinError(true)
            setTimeout(() => {
              setPinCode('')
              setPinError(false)
            }, 1000)
          }
        }, 100)
      }
    }
  }

  const handleCheckIn = async () => {
    if (needsPinVerification) {
      if (!verifyPin()) return
    }

    setProcessing(true)

    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .insert({
          employee_id: employee.id,
          check_in_time: new Date().toISOString(),
          check_in_photo_url: employee.capturedPhoto || null,
          check_in_confidence: employee.faceConfidence || null,
        })
        .select()
        .single()

      if (error) throw error

      console.log('[EmployeeCheckIn] Checked in successfully')
      setCurrentShift(data)

      if (onCheckIn) {
        onCheckIn(employee, data)
      }

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        if (onDismiss) onDismiss()
      }, 3000)
    } catch (error) {
      console.error('[EmployeeCheckIn] Error checking in:', error)
      alert('Error checking in. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCheckOut = async () => {
    if (!currentShift) return

    // Check-out requires PIN verification too
    if (needsPinVerification) {
      if (!verifyPin()) return
    }

    setProcessing(true)

    try {
      const checkOutTime = new Date()
      const checkInTime = new Date(currentShift.check_in_time)
      const durationMinutes = Math.round((checkOutTime - checkInTime) / 1000 / 60)

      const { data, error } = await supabase
        .from('employee_attendance')
        .update({
          check_out_time: checkOutTime.toISOString(),
          shift_duration_minutes: durationMinutes,
          check_out_photo_url: employee.capturedPhoto || null,
          check_out_confidence: employee.faceConfidence || null,
        })
        .eq('id', currentShift.id)
        .select()
        .single()

      if (error) throw error

      console.log('[EmployeeCheckIn] Checked out successfully')

      if (onCheckOut) {
        onCheckOut(employee, data)
      }

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        if (onDismiss) onDismiss()
      }, 3000)
    } catch (error) {
      console.error('[EmployeeCheckIn] Error checking out:', error)
      alert('Error checking out. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (!employee) return null

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: 'fadeIn 0.3s ease-in',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '600px',
          width: '90%',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          cursor: 'default',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Welcome Message */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '800',
            color: '#3b82f6',
            marginBottom: '16px',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
          }}>
            {currentShift ? 'Welcome Back!' : 'Hello!'}
          </h1>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '600',
            color: 'white',
            marginBottom: '8px',
          }}>
            {employee.name}
          </h2>
          {employee.role && (
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'capitalize',
            }}>
              {employee.role}
            </p>
          )}
        </div>

        {/* PIN Entry (if needed) */}
        {needsPinVerification && !loading && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: pinError ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              Enter your 4-digit PIN
            </p>

            {/* PIN Display */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: pinError
                      ? 'rgba(239, 68, 68, 0.2)'
                      : i < pinCode.length
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                    border: pinError
                      ? '2px solid rgba(239, 68, 68, 0.5)'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: 'white',
                    transition: 'all 0.2s',
                  }}
                >
                  {i < pinCode.length ? '●' : ''}
                </div>
              ))}
            </div>

            {/* PIN Keypad */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              maxWidth: '300px',
              margin: '0 auto',
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((digit, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (digit === '⌫') {
                      setPinCode(pinCode.slice(0, -1))
                      setPinError(false)
                    } else if (digit !== '') {
                      handlePinInput(digit.toString())
                    }
                  }}
                  disabled={digit === ''}
                  style={{
                    padding: '20px',
                    fontSize: '24px',
                    fontWeight: '600',
                    color: 'white',
                    background: digit === ''
                      ? 'transparent'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: digit === ''
                      ? 'none'
                      : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    cursor: digit === '' ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {digit}
                </button>
              ))}
            </div>

            {pinError && (
              <p style={{
                marginTop: '16px',
                fontSize: '16px',
                color: '#ef4444',
                textAlign: 'center',
                fontWeight: '600',
              }}>
                Incorrect PIN. Try again.
              </p>
            )}
          </div>
        )}

        {/* Shift Status */}
        {!loading && !needsPinVerification && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            {currentShift ? (
              <>
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '8px',
                }}>
                  Checked in at:
                </p>
                <p style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#10b981',
                }}>
                  {new Date(currentShift.check_in_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </>
            ) : (
              <p style={{
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
              }}>
                Ready to start your shift?
              </p>
            )}
          </div>
        )}

        {/* Action Buttons (only show after PIN verified) */}
        {!needsPinVerification && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {!currentShift ? (
              <button
                onClick={handleCheckIn}
                disabled={processing || loading}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  background: processing ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {processing ? '⏳ Checking In...' : '✅ Check In'}
              </button>
            ) : (
              <button
                onClick={handleCheckOut}
                disabled={processing || loading}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'white',
                  background: processing ? 'rgba(239, 68, 68, 0.5)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {processing ? '⏳ Checking Out...' : '🚪 Check Out'}
              </button>
            )}
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
