/**
 * Success Celebration Component
 * Shows animated checkmark with confetti after successful actions
 * Auto-dismisses after 3 seconds
 */

import { useEffect } from 'react'

export function SuccessCelebration({ message = 'Success!', onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      style={{
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
        gap: 32,
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Animated checkmark */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          boxShadow: '0 20px 60px rgba(34, 197, 94, 0.4)',
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline
            points="20 6 9 17 4 12"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 30,
              animation: 'drawCheck 0.5s ease-out 0.3s forwards',
            }}
          />
        </svg>
      </div>

      {/* Success message */}
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            marginBottom: 16,
            animation: 'slideUp 0.5s ease-out 0.2s both',
          }}
        >
          {message}
        </div>
        <div
          style={{
            fontSize: 24,
            opacity: 0.9,
            animation: 'slideUp 0.5s ease-out 0.3s both',
          }}
        >
          Your pin is now on the map!
        </div>
      </div>

      {/* Confetti particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: 10,
            height: 10,
            background: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'][i % 5],
            borderRadius: i % 3 === 0 ? '50%' : '2px',
            animation: `confetti${i % 6} ${1.5 + (i % 3) * 0.2}s ease-out forwards`,
            transform: `translate(-50%, -50%) rotate(${i * 12}deg) translateY(-100px)`,
            opacity: 0.8,
          }}
        />
      ))}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes drawCheck {
          to {
            strokeDashoffset: 0;
          }
        }

        @keyframes confetti0 {
          to {
            transform: translate(-50%, -50%) rotate(45deg) translateY(300px) translateX(-150px);
            opacity: 0;
          }
        }

        @keyframes confetti1 {
          to {
            transform: translate(-50%, -50%) rotate(90deg) translateY(350px) translateX(80px);
            opacity: 0;
          }
        }

        @keyframes confetti2 {
          to {
            transform: translate(-50%, -50%) rotate(135deg) translateY(320px) translateX(180px);
            opacity: 0;
          }
        }

        @keyframes confetti3 {
          to {
            transform: translate(-50%, -50%) rotate(180deg) translateY(340px) translateX(-120px);
            opacity: 0;
          }
        }

        @keyframes confetti4 {
          to {
            transform: translate(-50%, -50%) rotate(225deg) translateY(330px) translateX(150px);
            opacity: 0;
          }
        }

        @keyframes confetti5 {
          to {
            transform: translate(-50%, -50%) rotate(270deg) translateY(310px) translateX(-90px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
