import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFaceRecognition } from '../hooks/useFaceRecognition'

/**
 * Employee Registration Flow with Privacy Disclosure
 * Allows new employees to register with facial recognition and PIN
 */
export default function EmployeeRegistration({ onComplete, onCancel }) {
  const [step, setStep] = useState('privacy') // privacy, info, pin, photo, review
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Employee data
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    pin_code: '',
    privacy_consent_accepted: false,
    face_descriptor: null,
    face_image_url: null,
  })

  // PIN state
  const [pinCode, setPinCode] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMatch, setPinMatch] = useState(true)

  // Video/Camera state
  const videoRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  // Face recognition hook
  const { modelsLoaded, isProcessing, detectFace } = useFaceRecognition()

  // Privacy disclosure text
  const privacyText = `
# Privacy Disclosure - Facial Recognition for Timekeeping

## What We Collect
We will capture and store a mathematical representation (face descriptor) of your facial features for the purpose of employee check-in and timekeeping.

## How It's Used
- **Timekeeping Only**: Your facial data will ONLY be used for employee check-in/check-out and attendance tracking
- **No Third Parties**: We will never share, sell, or transfer your facial data to any third party
- **Silent Photos**: A photo will be captured during each check-in/out for audit purposes only
- **Secure Storage**: All facial data is encrypted and stored securely in our database

## Your Rights
- You may request deletion of your facial data at any time
- You may view your attendance records and captured photos
- You may opt out by using an alternative check-in method (if available)

## Data Retention
Your facial recognition data will be retained for as long as you are an active employee, plus 2 years for audit purposes, unless you request earlier deletion.

By clicking "I Accept" below, you consent to the collection and use of your facial biometric data as described above.
  `.trim()

  // Start camera for face capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error('[EmployeeRegistration] Camera error:', err)
      setError('Unable to access camera. Please check permissions.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  // Capture face photo and descriptor
  const captureFace = async () => {
    if (!videoRef.current || !modelsLoaded) {
      setError('Camera or face recognition not ready')
      return
    }

    setLoading(true)
    try {
      const faceData = await detectFace(videoRef.current, true)

      if (faceData && faceData.descriptor && faceData.photo) {
        setEmployeeData(prev => ({
          ...prev,
          face_descriptor: Array.from(faceData.descriptor), // Convert to array for JSON storage
          face_image_url: faceData.photo,
        }))
        setFaceDetected(true)
        stopCamera()
        setStep('review')
      } else {
        setError('No face detected. Please position your face in the frame and try again.')
      }
    } catch (err) {
      console.error('[EmployeeRegistration] Face capture error:', err)
      setError('Error capturing face. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Submit registration
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from('employees')
        .insert({
          name: employeeData.name,
          email: employeeData.email || null,
          phone: employeeData.phone || null,
          role: employeeData.role,
          pin_code: pinCode,
          face_descriptor: employeeData.face_descriptor,
          face_image_url: employeeData.face_image_url,
          privacy_consent_accepted: true,
          privacy_consent_date: new Date().toISOString(),
          active: true,
        })
        .select()
        .single()

      if (dbError) throw dbError

      console.log('[EmployeeRegistration] Employee registered:', data)

      if (onComplete) {
        onComplete(data)
      }
    } catch (err) {
      console.error('[EmployeeRegistration] Registration error:', err)
      setError('Error registering employee. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Start camera when entering photo step
  useEffect(() => {
    if (step === 'photo' && !cameraActive) {
      startCamera()
    }
  }, [step])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.90)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '24px',
          padding: '48px',
          maxWidth: '700px',
          width: '100%',
          border: '2px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Privacy Disclosure Step */}
        {step === 'privacy' && (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Employee Registration
            </h1>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              maxHeight: '400px',
              overflow: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <pre style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'rgba(255, 255, 255, 0.9)',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {privacyText}
              </pre>
            </div>

            <button
              onClick={() => {
                setEmployeeData(prev => ({ ...prev, privacy_consent_accepted: true }))
                setStep('info')
              }}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              ✓ I Accept - Continue Registration
            </button>

            <button
              onClick={onCancel}
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
              }}
            >
              Decline - Cancel Registration
            </button>
          </>
        )}

        {/* Employee Info Step */}
        {step === 'info' && (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Your Information
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '32px',
            }}>
              Step 1 of 3
            </p>

            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px',
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={employeeData.name}
                onChange={(e) => setEmployeeData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  marginBottom: '20px',
                }}
              />

              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px',
              }}>
                Email (optional)
              </label>
              <input
                type="email"
                value={employeeData.email}
                onChange={(e) => setEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  marginBottom: '20px',
                }}
              />

              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px',
              }}>
                Phone (optional)
              </label>
              <input
                type="tel"
                value={employeeData.phone}
                onChange={(e) => setEmployeeData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  marginBottom: '20px',
                }}
              />

              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px',
              }}>
                Role
              </label>
              <select
                value={employeeData.role}
                onChange={(e) => setEmployeeData(prev => ({ ...prev, role: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: 'white',
                }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={() => employeeData.name && setStep('pin')}
              disabled={!employeeData.name}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                background: employeeData.name
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '12px',
                cursor: employeeData.name ? 'pointer' : 'not-allowed',
                marginBottom: '16px',
              }}
            >
              Continue to PIN Setup →
            </button>

            <button
              onClick={() => setStep('privacy')}
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
              }}
            >
              ← Back
            </button>
          </>
        )}

        {/* PIN Setup Step */}
        {step === 'pin' && (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Create Your PIN
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '32px',
            }}>
              Step 2 of 3 - Choose a 4-digit PIN for check-in
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <p style={{
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.7)',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                {pinCode.length === 0 ? 'Enter your 4-digit PIN' : pinCode.length === 4 && confirmPin.length === 0 ? 'Confirm your PIN' : 'PINs match!'}
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
                      background: !pinMatch && confirmPin.length === 4
                        ? 'rgba(239, 68, 68, 0.2)'
                        : (pinCode.length === 4 ? i < confirmPin.length : i < pinCode.length)
                          ? 'rgba(59, 130, 246, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    {(pinCode.length === 4 ? i < confirmPin.length : i < pinCode.length) ? '●' : ''}
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
                        if (pinCode.length === 4 && confirmPin.length > 0) {
                          setConfirmPin(confirmPin.slice(0, -1))
                          setPinMatch(true)
                        } else if (pinCode.length > 0 && confirmPin.length === 0) {
                          setPinCode(pinCode.slice(0, -1))
                        }
                      } else if (digit !== '') {
                        if (pinCode.length < 4) {
                          setPinCode(pinCode + digit)
                        } else if (confirmPin.length < 4) {
                          const newConfirm = confirmPin + digit
                          setConfirmPin(newConfirm)

                          // Check if PINs match when confirm is complete
                          if (newConfirm.length === 4) {
                            if (newConfirm === pinCode) {
                              setPinMatch(true)
                              // Auto-advance after brief delay
                              setTimeout(() => setStep('photo'), 500)
                            } else {
                              setPinMatch(false)
                              setTimeout(() => {
                                setPinCode('')
                                setConfirmPin('')
                                setPinMatch(true)
                              }, 1500)
                            }
                          }
                        }
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
                    }}
                  >
                    {digit}
                  </button>
                ))}
              </div>

              {!pinMatch && (
                <p style={{
                  marginTop: '16px',
                  fontSize: '16px',
                  color: '#ef4444',
                  textAlign: 'center',
                  fontWeight: '600',
                }}>
                  PINs don't match. Try again.
                </p>
              )}
            </div>

            <button
              onClick={() => setStep('info')}
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
              }}
            >
              ← Back
            </button>
          </>
        )}

        {/* Photo Capture Step */}
        {step === 'photo' && (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Capture Your Photo
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '32px',
            }}>
              Step 3 of 3 - Position your face in the frame
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              {!modelsLoaded && (
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '16px' }}>
                  Loading face recognition models...
                </p>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '12px',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  marginBottom: '16px',
                }}
              />

              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '16px',
              }}>
                • Look directly at the camera<br/>
                • Ensure good lighting<br/>
                • Remove glasses if possible
              </p>

              {error && (
                <p style={{
                  color: '#ef4444',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}>
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={captureFace}
              disabled={!modelsLoaded || loading}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                background: modelsLoaded && !loading
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '12px',
                cursor: modelsLoaded && !loading ? 'pointer' : 'not-allowed',
                marginBottom: '16px',
              }}
            >
              {loading ? '📸 Capturing...' : '📸 Capture Photo'}
            </button>

            <button
              onClick={() => {
                stopCamera()
                setStep('pin')
              }}
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
              }}
            >
              ← Back
            </button>
          </>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#3b82f6',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Review & Confirm
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              marginBottom: '32px',
            }}>
              Please review your information before submitting
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Captured Photo */}
              {employeeData.face_image_url && (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <img
                    src={employeeData.face_image_url}
                    alt="Your photo"
                    style={{
                      width: '200px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '2px solid rgba(59, 130, 246, 0.3)',
                    }}
                  />
                </div>
              )}

              {/* Info Summary */}
              <div style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Name:</strong> {employeeData.name}
                </p>
                {employeeData.email && (
                  <p style={{ marginBottom: '12px' }}>
                    <strong>Email:</strong> {employeeData.email}
                  </p>
                )}
                {employeeData.phone && (
                  <p style={{ marginBottom: '12px' }}>
                    <strong>Phone:</strong> {employeeData.phone}
                  </p>
                )}
                <p style={{ marginBottom: '12px' }}>
                  <strong>Role:</strong> {employeeData.role}
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong>PIN:</strong> ••••
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Face Data:</strong> ✓ Captured
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Privacy Consent:</strong> ✓ Accepted
                </p>
              </div>
            </div>

            {error && (
              <p style={{
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                background: loading
                  ? 'rgba(59, 130, 246, 0.5)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '16px',
              }}
            >
              {loading ? '⏳ Registering...' : '✓ Complete Registration'}
            </button>

            <button
              onClick={() => setStep('photo')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '18px',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              ← Retake Photo
            </button>
          </>
        )}
      </div>
    </div>
  )
}
