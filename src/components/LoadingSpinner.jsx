/**
 * Loading Spinner Component
 * Full-screen loading overlay with spinner and message
 * Used during async operations (saving, loading, processing)
 */

export function LoadingSpinner({ message = 'Loading...', fullScreen = true }) {
  const containerStyle = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        animation: 'fadeIn 0.2s ease-out',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        padding: 40,
      }

  return (
    <div style={containerStyle}>
      {/* Spinner */}
      <div
        style={{
          width: 80,
          height: 80,
          border: '8px solid rgba(255, 255, 255, 0.2)',
          borderTop: '8px solid #fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />

      {/* Message */}
      <div
        style={{
          color: '#fff',
          fontSize: 24,
          fontWeight: 600,
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        {message}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
