// src/components/AchievementNotification.jsx
import { useState, useEffect } from 'react';
import achievementManager from '../utils/achievements';
import soundEffects from '../utils/soundEffects';
import { createFireworkEffect } from '../utils/particleEffects';

export default function AchievementNotification() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleUnlock = (achievement) => {
      setNotification(achievement);

      // Play sound and effects
      soundEffects.playSuccess();
      soundEffects.vibrateSuccess();

      // Particle effect in center of screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 3;
      createFireworkEffect(centerX, centerY);

      // Auto-hide after 4 seconds
      setTimeout(() => {
        setNotification(null);
      }, 4000);
    };

    achievementManager.onUnlock(handleUnlock);
  }, []);

  if (!notification) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        animation: 'slideDown 0.5s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #2a3441 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '16px',
          padding: '20px 32px',
          boxShadow: '0 10px 40px rgba(245, 158, 11, 0.3), 0 0 0 4px rgba(245, 158, 11, 0.1)',
          animation: 'pulse 1s ease-in-out infinite',
          maxWidth: '400px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            color: '#f59e0b',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          🏆 Achievement Unlocked!
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '48px' }}>{notification.icon}</div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#f4f6f8',
                marginBottom: '4px',
              }}
            >
              {notification.name}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#a7b0b8',
                lineHeight: '1.4',
              }}
            >
              {notification.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
