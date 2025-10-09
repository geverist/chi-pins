// Motion detection visual indicator
// Shows green tint for ambient, yellow for walk-up, red for stare (very close)

export default function MotionIndicator({ isAmbientDetected, isPersonDetected, isStaring, stareDuration, proximityLevel }) {
  if (!isAmbientDetected && !isPersonDetected && !isStaring) return null;

  // Determine color and intensity based on detection tier
  const color = isStaring ? '#ff0000' : isPersonDetected ? '#ffaa00' : '#00ff00'; // Red for stare, orange for person, green for ambient
  const baseOpacity = isStaring ? 0.25 : isPersonDetected ? 0.2 : 0.15; // Strongest for stare
  const animationDuration = isStaring ? '0.5s' : isPersonDetected ? '1s' : '2s'; // Faster pulse for stare

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        backgroundColor: color,
        animation: `motionPulse ${animationDuration} ease-in-out infinite`,
      }}
    >
      {/* Proximity level indicator in corner */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: color,
          color: '#000',
          padding: '12px 20px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 18,
          fontFamily: 'monospace',
          boxShadow: `0 4px 20px ${color}`,
        }}
      >
        {isStaring ? `👁️ STARE ${Math.floor(stareDuration / 1000)}s` : isPersonDetected ? '🚶 WALKUP' : '👋 AMBIENT'} • {proximityLevel}%
      </div>

      <style>{`
        @keyframes motionPulse {
          0%, 100% {
            opacity: ${baseOpacity};
          }
          50% {
            opacity: ${baseOpacity * 1.5};
          }
        }
      `}</style>
    </div>
  );
}
