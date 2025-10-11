// src/components/PinCodeModal.jsx
import { useState, useEffect, useRef } from 'react'

export default function PinCodeModal({ open, onSuccess, onCancel, title = 'Enter PIN Code', expectedPin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const inputRef = useRef(null)
  const openTimeRef = useRef(0)

  // Use provided PIN or fallback to env var or default
  // Ensure PIN is a 4-digit string
  const correctPin = String(expectedPin || import.meta.env.VITE_ADMIN_PIN || '1111').replace(/\D/g, '').slice(0, 4) || '1111'

  // Rate limiting: max 5 attempts before lockout
  const MAX_ATTEMPTS = 5
  const isLockedOut = attempts >= MAX_ATTEMPTS

  useEffect(() => {
    if (open) {
      openTimeRef.current = Date.now()
      setCode('')
      setError('')
      setAttempts(0)
      // Auto-focus input with longer delay to avoid touch sequence interference
      setTimeout(() => {
        inputRef.current?.focus()
        // Force keyboard to show on mobile
        if (inputRef.current) {
          inputRef.current.click()
        }
      }, 300)
    }
  }, [open])

  const handleCancel = () => {
    // Prevent dismissal within first 500ms to avoid touch sequence interference
    const timeSinceOpen = Date.now() - openTimeRef.current
    if (timeSinceOpen > 500) {
      onCancel?.()
    }
  }

  const handleSubmit = (e) => {
    e?.preventDefault()

    if (isLockedOut) {
      setError('Too many attempts. Please refresh.')
      return
    }

    // Validate input is exactly 4 digits
    if (!/^\d{4}$/.test(code)) {
      setError('PIN must be exactly 4 digits')
      setCode('')
      setTimeout(() => setError(''), 2000)
      return
    }

    if (code === correctPin) {
      setAttempts(0)
      onSuccess?.()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setError(`Incorrect PIN (${newAttempts}/${MAX_ATTEMPTS})`)
      setCode('')
      setTimeout(() => setError(''), 2000)
    }
  }

  const handleKeyDown = (e) => {
    // Only allow numbers
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault()
    }
    // Submit on Enter
    if (e.key === 'Enter' && code.length === 4) {
      handleSubmit()
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  const handleChange = (e) => {
    if (isLockedOut) return

    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCode(value)
    setError('')
    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => {
        if (!/^\d{4}$/.test(value)) return

        if (value === correctPin) {
          // Dismiss virtual keyboard on success
          if (inputRef.current) {
            inputRef.current.blur()
          }
          setAttempts(0)
          onSuccess?.()
        } else {
          const newAttempts = attempts + 1
          setAttempts(newAttempts)
          setError(`Incorrect PIN (${newAttempts}/${MAX_ATTEMPTS})`)
          setCode('')
          setTimeout(() => setError(''), 2000)
        }
      }, 100)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={handleCancel}
      onTouchEnd={(e) => {
        // Prevent backdrop touch from dismissing if touch is on the modal content
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        style={{
          background: '#11141a',
          borderRadius: 12,
          padding: 32,
          border: '1px solid #2a2f37',
          minWidth: 320,
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 24px', color: '#f3f5f7', fontSize: 24 }}>{title}</h2>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            autoComplete="off"
            disabled={isLockedOut}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: 32,
              textAlign: 'center',
              letterSpacing: '0.5em',
              background: '#1a1e25',
              border: error ? '2px solid #ef4444' : '2px solid #2a2f37',
              borderRadius: 8,
              color: '#f3f5f7',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? '#ef4444' : '#2a2f37'
            }}
          />

          {error && (
            <div
              style={{
                marginTop: 12,
                color: '#ef4444',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 24,
              fontSize: 13,
              color: '#a7b0b8',
            }}
          >
            Enter 4-digit PIN code
          </div>

          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 24px',
                background: '#1a1e25',
                border: '1px solid #2a2f37',
                borderRadius: 8,
                color: '#f3f5f7',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={code.length !== 4}
              style={{
                padding: '10px 24px',
                background: code.length === 4 ? '#3b82f6' : '#2a2f37',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                cursor: code.length === 4 ? 'pointer' : 'not-allowed',
                opacity: code.length === 4 ? 1 : 0.5,
              }}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
