// src/components/LayoutEditModeOverlay.jsx
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * Full-screen overlay that blocks all map and UI interactions during layout edit mode
 * Also displays grid lines to show available positioning zones
 */
export default function LayoutEditModeOverlay({ isActive, onExit }) {
  const { settings: adminSettings } = useAdminSettings();

  if (!isActive) return null;

  const gridLayout = adminSettings.layoutGridType || '2x3';

  // Calculate grid lines based on layout type
  const getGridLines = () => {
    const lines = { vertical: [], horizontal: [] };

    switch (gridLayout) {
      case '2x2': // 4 quadrants
        lines.vertical = ['50%'];
        lines.horizontal = ['50%'];
        break;

      case '2x3': // 6 sections (2 rows x 3 cols)
        lines.vertical = ['33.333%', '66.666%'];
        lines.horizontal = ['50%'];
        break;

      case '3-2-3': // 8 sections
        lines.vertical = ['30%', '70%'];
        lines.horizontal = ['33.333%', '66.666%'];
        break;

      default:
        lines.vertical = ['33.333%', '66.666%'];
        lines.horizontal = ['50%'];
    }

    return lines;
  };

  const gridLines = getGridLines();

  return (
    <>
      {/* Full-screen interaction blocking overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9999, // Below draggable widgets (10000) but above everything else
          backdropFilter: 'blur(2px)',
          pointerEvents: 'auto', // Block all pointer events
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />

      {/* Grid lines overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'none', // Don't block dragging
        }}
      >
        {/* Vertical grid lines */}
        {gridLines.vertical.map((left, i) => (
          <div
            key={`v-${i}`}
            style={{
              position: 'absolute',
              left,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'rgba(59, 130, 246, 0.4)',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
            }}
          />
        ))}

        {/* Horizontal grid lines */}
        {gridLines.horizontal.map((top, i) => (
          <div
            key={`h-${i}`}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: '2px',
              background: 'rgba(59, 130, 246, 0.4)',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.6)',
            }}
          />
        ))}
      </div>

      {/* Top banner with instructions and exit button */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.98) 0%, rgba(37, 99, 235, 0.98) 100%)',
          color: 'white',
          padding: '16px 24px',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          borderBottom: '3px solid rgba(255,255,255,0.3)',
          pointerEvents: 'auto',
        }}
      >
        <div>
          <strong style={{ fontSize: '18px', marginRight: '16px' }}>🎨 Layout Edit Mode</strong>
          <span style={{ fontSize: '14px', opacity: 0.95 }}>
            Drag widgets to grid cells • Vertical positioning snaps to {adminSettings.layoutVerticalIncrement || 10}px increments
          </span>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>
            Grid: {gridLayout === '2x2' ? '4 Quadrants' : gridLayout === '2x3' ? '6 Sections (2×3)' : '8 Sections (3-2-3)'}
          </div>
        </div>
        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: '10px',
            padding: '10px 20px',
            color: 'white',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.35)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ✓ Exit Edit Mode
        </button>
      </div>
    </>
  );
}
