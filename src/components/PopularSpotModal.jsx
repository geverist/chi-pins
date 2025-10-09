// src/components/PopularSpotModal.jsx
import { useEffect } from 'react';

export default function PopularSpotModal({ spot, onClose }) {
  if (!spot) return null;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const categoryEmoji = spot.kind === 'beef' ? '🥩' : (spot.kind === 'pizza' ? '🍕' : '🌭');
  const categoryBg = spot.kind === 'beef' ? '#7b4a2b' : (spot.kind === 'pizza' ? '#cc1b1b' : '#2a6ae0');
  const categoryLabel = spot.kind === 'beef' ? 'Italian Beef' : (spot.kind === 'pizza' ? 'Pizza' : 'Hot Dog');

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1a1c20',
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 20,
            fontWeight: 'bold',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          ×
        </button>

        {/* Category badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: categoryBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {categoryEmoji}
          </div>
          <div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
            }}>
              {categoryLabel}
            </div>
            <h3 style={{
              margin: 0,
              color: '#fff',
              fontSize: 20,
              fontWeight: 600,
            }}>
              {spot.name}
            </h3>
          </div>
        </div>

        {/* Location coordinates */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 4 }}>
            Location
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', fontFamily: 'monospace' }}>
            {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
          </div>
        </div>

        {/* Get Directions link */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: 16,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 8,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 14,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🗺️ Get Directions
        </a>
      </div>
    </>
  );
}
