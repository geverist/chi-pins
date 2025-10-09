// src/components/LayoutEditModeIndicator.jsx

/**
 * Visual indicator when layout edit mode is active
 */
export default function LayoutEditModeIndicator({ isActive, onExit }) {
  if (!isActive) return null;

  return (
    <>
      {/* Top banner */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%)',
          color: 'white',
          padding: '12px 20px',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
        }}
      >
        <div>
          <strong style={{ fontSize: '16px', marginRight: '12px' }}>🎨 Layout Edit Mode</strong>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>
            Drag widgets to snap to Top/Middle/Bottom positions on Left/Right sides
          </span>
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          Exit Edit Mode
        </button>
      </div>

      {/* Corner indicators */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '80px',
          height: '80px',
          border: '3px dashed rgba(59, 130, 246, 0.5)',
          borderRight: 'none',
          borderBottom: 'none',
          pointerEvents: 'none',
          zIndex: 99998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          border: '3px dashed rgba(59, 130, 246, 0.5)',
          borderLeft: 'none',
          borderBottom: 'none',
          pointerEvents: 'none',
          zIndex: 99998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '80px',
          height: '80px',
          border: '3px dashed rgba(59, 130, 246, 0.5)',
          borderLeft: 'none',
          borderTop: 'none',
          pointerEvents: 'none',
          zIndex: 99998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '80px',
          height: '80px',
          border: '3px dashed rgba(59, 130, 246, 0.5)',
          borderRight: 'none',
          borderTop: 'none',
          pointerEvents: 'none',
          zIndex: 99998,
        }}
      />
    </>
  );
}
