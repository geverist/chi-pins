// src/components/LearningModeTimer.jsx
import { useEffect, useState } from 'react';

/**
 * Learning Mode Timer - Shows countdown during proximity detection learning phase
 *
 * Displays a timer at the top of the screen showing how much time is left
 * in the 5-minute learning mode before transitioning to live/production mode.
 */
export default function LearningModeTimer({ startTime, durationMs, onComplete }) {
  const [timeRemaining, setTimeRemaining] = useState(durationMs);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, durationMs - elapsed);

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onComplete) {
          onComplete();
        }
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [startTime, durationMs, onComplete]);

  // Format time as MM:SS
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress percentage (for visual bar)
  const progressPercent = ((durationMs - timeRemaining) / durationMs) * 100;

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: '#fff',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
            🎓 Learning Mode Active
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Capturing behavioral patterns for improved detection
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>
            Time Remaining
          </div>
          <div style={{ fontWeight: 700, fontSize: '28px', fontFamily: 'monospace', letterSpacing: '2px' }}>
            {timeString}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Hide
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255, 255, 255, 0.2)',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: '#fff',
          transition: 'width 1s linear',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
