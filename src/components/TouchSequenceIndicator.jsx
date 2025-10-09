import { useState, useEffect } from 'react';

/**
 * Visual feedback for ALL touch interactions
 * Shows ripple effect at exact touch location for better UX
 */
export default function TouchSequenceIndicator() {
  const [touches, setTouches] = useState([]);

  useEffect(() => {
    const handleTouch = (e) => {
      // Handle all touches (including multi-touch)
      const touchList = e.touches ? Array.from(e.touches) : [e];

      touchList.forEach(touch => {
        const x = touch.clientX;
        const y = touch.clientY;

        const touchData = {
          id: `${Date.now()}-${Math.random()}`,
          x,
          y
        };

        setTouches(prev => [...prev, touchData]);

        // Remove after animation
        setTimeout(() => {
          setTouches(prev => prev.filter(t => t.id !== touchData.id));
        }, 600);
      });
    };

    // Listen for both touch and mouse events for better compatibility
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('mousedown', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('mousedown', handleTouch);
    };
  }, []);

  return (
    <>
      {touches.map(touch => (
        <div
          key={touch.id}
          style={{
            position: 'fixed',
            left: touch.x - 30, // Center the 60px circle on touch point
            top: touch.y - 30,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.3)',
            border: '3px solid rgba(59, 130, 246, 0.8)',
            pointerEvents: 'none',
            zIndex: 99999,
            animation: 'touchPulse 0.6s ease-out forwards',
          }}
        />
      ))}

      <style>{`
        @keyframes touchPulse {
          0% {
            transform: scale(0.3);
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
