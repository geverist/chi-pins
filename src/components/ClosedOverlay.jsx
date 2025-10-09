// src/components/ClosedOverlay.jsx
import { useEffect, useState } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * Full-screen overlay shown when kiosk is outside business hours
 * Displays custom closed message and next opening time
 */
export default function ClosedOverlay({ nextChange, openTime }) {
  const { settings } = useAdminSettings();
  const [timeUntilOpen, setTimeUntilOpen] = useState('');

  useEffect(() => {
    if (!nextChange) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const diff = nextChange - now;

      if (diff <= 0) {
        setTimeUntilOpen('Opening soon...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeUntilOpen(`Opens in ${days} day${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeUntilOpen(`Opens in ${hours}h ${minutes}m`);
      } else {
        setTimeUntilOpen(`Opens in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextChange]);

  const closedMessage = settings.businessHoursClosedMessage ||
    "We're currently closed. Please come back during business hours!";

  const formatTime = (time) => {
    const [hour, min] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        zIndex: 999999, // Above everything
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        textAlign: 'center',
        padding: '40px',
      }}
    >
      {/* Moon icon */}
      <div
        style={{
          fontSize: '120px',
          marginBottom: '30px',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        🌙
      </div>

      {/* Closed message */}
      <h1
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        We're Closed
      </h1>

      <p
        style={{
          fontSize: '24px',
          maxWidth: '600px',
          marginBottom: '40px',
          opacity: 0.9,
          lineHeight: 1.6,
        }}
      >
        {closedMessage}
      </p>

      {/* Business hours info */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '30px 40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div style={{ fontSize: '18px', opacity: 0.8, marginBottom: '10px' }}>
          Business Hours
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
          {formatTime(openTime)} - {formatTime(settings.businessHoursClose || '21:00')}
        </div>
        {timeUntilOpen && (
          <div
            style={{
              fontSize: '20px',
              color: '#4ade80',
              fontWeight: '600',
            }}
          >
            {timeUntilOpen}
          </div>
        )}
      </div>

      {/* Subtle branding */}
      {settings.restaurantName && (
        <div
          style={{
            marginTop: '60px',
            fontSize: '16px',
            opacity: 0.5,
          }}
        >
          {settings.restaurantName}
        </div>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }
        `}
      </style>
    </div>
  );
}
