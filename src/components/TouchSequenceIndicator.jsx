import { useState, useEffect, useRef } from 'react';

/**
 * Visual feedback for touch interactions
 * Shows ripple effect only for taps/clicks (not drags or scrolls)
 */
export default function TouchSequenceIndicator() {
  const [touches, setTouches] = useState([]);
  const touchStartPositions = useRef(new Map());

  useEffect(() => {
    const handleTouchStart = (e) => {
      // Record start positions for all touches
      const touchList = e.touches ? Array.from(e.touches) : [{ identifier: 'mouse', clientX: e.clientX, clientY: e.clientY }];

      touchList.forEach(touch => {
        const id = touch.identifier ?? 'mouse';
        touchStartPositions.current.set(id, {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        });
      });
    };

    const handleTouchEnd = (e) => {
      // Check if this was a tap (not a drag/scroll)
      const touchList = e.changedTouches ? Array.from(e.changedTouches) : [{ identifier: 'mouse', clientX: e.clientX, clientY: e.clientY }];

      touchList.forEach(touch => {
        const id = touch.identifier ?? 'mouse';
        const startPos = touchStartPositions.current.get(id);

        if (!startPos) return;

        // Calculate movement distance
        const dx = touch.clientX - startPos.x;
        const dy = touch.clientY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = Date.now() - startPos.time;

        // Only show effect if:
        // 1. Movement is minimal (< 10px) - not a drag/scroll
        // 2. Duration is short (< 500ms) - quick tap, not a long press during scroll
        if (distance < 10 && duration < 500) {
          const touchData = {
            id: `${Date.now()}-${Math.random()}`,
            x: touch.clientX,
            y: touch.clientY
          };

          setTouches(prev => [...prev, touchData]);

          // Remove after animation
          setTimeout(() => {
            setTouches(prev => prev.filter(t => t.id !== touchData.id));
          }, 1000);
        }

        // Clean up start position
        touchStartPositions.current.delete(id);
      });
    };

    // Listen for touch start/end to detect taps vs drags
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('mousedown', handleTouchStart, { passive: true });
    window.addEventListener('mouseup', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleTouchStart);
      window.removeEventListener('mouseup', handleTouchEnd);
    };
  }, []);

  return (
    <>
      {touches.map(touch => (
        <div
          key={touch.id}
          style={{
            position: 'fixed',
            left: touch.x,
            top: touch.y,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          {/* Inner glow */}
          <div
            style={{
              position: 'absolute',
              left: '-40px',
              top: '-40px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.3) 40%, transparent 70%)',
              animation: 'touchGlow 1.2s ease-out forwards',
            }}
          />

          {/* Primary ring */}
          <div
            style={{
              position: 'absolute',
              left: '-30px',
              top: '-30px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '4px solid rgba(59, 130, 246, 0.9)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(59, 130, 246, 0.3)',
              animation: 'touchPulse 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          />

          {/* Secondary ring */}
          <div
            style={{
              position: 'absolute',
              left: '-30px',
              top: '-30px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '3px solid rgba(96, 165, 250, 0.7)',
              animation: 'touchPulse 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards',
            }}
          />

          {/* Outer ring */}
          <div
            style={{
              position: 'absolute',
              left: '-30px',
              top: '-30px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid rgba(147, 197, 253, 0.5)',
              animation: 'touchPulse 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards',
            }}
          />

          {/* Center dot */}
          <div
            style={{
              position: 'absolute',
              left: '-8px',
              top: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(59, 130, 246, 0.8) 100%)',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.8)',
              animation: 'touchDot 0.6s ease-out forwards',
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes touchPulse {
          0% {
            transform: scale(0.1);
            opacity: 1;
          }
          30% {
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes touchGlow {
          0% {
            transform: scale(0.1);
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }

        @keyframes touchDot {
          0% {
            transform: scale(1.5);
            opacity: 1;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
