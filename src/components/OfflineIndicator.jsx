// src/components/OfflineIndicator.jsx
import { useEffect, useState, memo } from 'react';
import { getPendingPins } from '../lib/offlineStorage';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const pending = await getPendingPins();
        setPendingCount(pending.length);
      } catch (err) {
        console.error('Failed to get pending count:', err);
      }
    };

    updatePendingCount();

    // Update every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);
    return () => clearInterval(interval);
  }, [isOnline]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 9999,
        padding: '8px 12px',
        borderRadius: 8,
        background: isOnline ? '#10b981' : '#ef4444',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#fff',
          animation: isOnline ? 'none' : 'pulse 2s ease-in-out infinite',
        }}
      />
      <span>
        {isOnline
          ? `Online • ${pendingCount} pending sync`
          : 'Offline Mode'
        }
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// Memoize OfflineIndicator - has no props, but prevents unnecessary re-renders
// when parent components update
export default memo(OfflineIndicator)
