import { useState, useEffect } from 'react';

/**
 * Visual feedback for touch sequences
 * Shows corner indicators when touches are registered
 */
export default function TouchSequenceIndicator() {
  const [touches, setTouches] = useState([]);

  useEffect(() => {
    const handleTouch = (e) => {
      if (e.touches && e.touches.length > 1) return;

      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const corner = getCorner(x, y, width, height);

      if (corner) {
        const touchData = {
          corner,
          id: Date.now(),
          x,
          y
        };

        setTouches(prev => [...prev, touchData]);

        // Remove after animation
        setTimeout(() => {
          setTouches(prev => prev.filter(t => t.id !== touchData.id));
        }, 1000);
      }
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  return (
    <>
      {touches.map(touch => (
        <div
          key={touch.id}
          style={{
            position: 'fixed',
            ...getCornerPosition(touch.corner),
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.3)',
            border: '3px solid rgba(59, 130, 246, 0.8)',
            pointerEvents: 'none',
            zIndex: 99999,
            animation: 'touchPulse 1s ease-out forwards',
          }}
        />
      ))}

      <style>{`
        @keyframes touchPulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

function getCorner(x, y, width, height) {
  const cornerSize = 100;

  const isTopLeft = x < cornerSize && y < cornerSize;
  const isTopRight = x > width - cornerSize && y < cornerSize;
  const isBottomLeft = x < cornerSize && y > height - cornerSize;
  const isBottomRight = x > width - cornerSize && y > height - cornerSize;

  if (isTopLeft) return 'top-left';
  if (isTopRight) return 'top-right';
  if (isBottomLeft) return 'bottom-left';
  if (isBottomRight) return 'bottom-right';
  return null;
}

function getCornerPosition(corner) {
  switch (corner) {
    case 'top-left':
      return { top: '10px', left: '10px' };
    case 'top-right':
      return { top: '10px', right: '10px' };
    case 'bottom-left':
      return { bottom: '10px', left: '10px' };
    case 'bottom-right':
      return { bottom: '10px', right: '10px' };
    default:
      return {};
  }
}
