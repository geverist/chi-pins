/**
 * Error Toast Component
 * User-friendly error messages with retry and dismiss actions
 * Appears at bottom of screen with slide-up animation
 */

export function ErrorToast({ message, onRetry, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
        padding: '20px 32px',
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
        zIndex: 10000,
        maxWidth: '90%',
        minWidth: 320,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 32, flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            Oops! Something went wrong
          </div>
          <div style={{ fontSize: 14, opacity: 0.95 }}>{message}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              minHeight: 56,
            }}
          >
            🔄 Try Again
          </button>
        )}
        <button
          onClick={onDismiss}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 56,
          }}
        >
          Dismiss
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
