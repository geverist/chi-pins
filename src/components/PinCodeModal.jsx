// src/components/PinCodeModal.jsx
import { useState, useEffect, useRef } from 'react'

export default function PinCodeModal({ open, onSuccess, onCancel, title = 'Enter PIN Code' }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const correctPin = import.meta.env.VITE_ADMIN_PIN || '1234'

  useEffect(() => {
    if (open) {
      setCode('')
      setError('')
      // Auto-focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (code === correctPin) {
      onSuccess?.()
    } else {
      setError('Incorrect PIN')
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
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCode(value)
    setError('')
    // Auto-submit when 4 digits entered
    if (value.length === 4) {
      setTimeout(() => {
        if (value === correctPin) {
          onSuccess?.()
        } else {
          setError('Incorrect PIN')
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
      onClick={onCancel}
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
