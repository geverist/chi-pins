// src/components/MobileNavMenu.jsx
import { useState } from 'react';

export default function MobileNavMenu({
  navSettings,
  setGamesOpen,
  setJukeboxOpen,
  setOrderMenuOpen,
  setPhotoBoothOpen,
  setThenAndNowOpen,
  setCommentsOpen
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const enabledCount =
    (navSettings?.games_enabled ? 1 : 0) +
    (navSettings?.jukebox_enabled ? 1 : 0) +
    (navSettings?.order_enabled ? 1 : 0) +
    (navSettings?.photobooth_enabled ? 1 : 0) +
    (navSettings?.thenandnow_enabled ? 1 : 0) +
    (navSettings?.comments_enabled ? 1 : 0);

  // Don't show if no features are enabled
  if (enabledCount === 0) return null;

  const handleItemClick = (action) => {
    action();
    setMenuOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9998,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Menu Items */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            zIndex: 9999,
            minWidth: 200,
          }}
        >
          {navSettings?.games_enabled && (
            <button
              onClick={() => handleItemClick(() => setGamesOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>🎮</span>
              <span>Games</span>
            </button>
          )}
          {navSettings?.jukebox_enabled && (
            <button
              onClick={() => handleItemClick(() => setJukeboxOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>🎵</span>
              <span>Jukebox</span>
            </button>
          )}
          {navSettings?.order_enabled && (
            <button
              onClick={() => handleItemClick(() => setOrderMenuOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>🍕</span>
              <span>Order Now</span>
            </button>
          )}
          {navSettings?.photobooth_enabled && (
            <button
              onClick={() => handleItemClick(() => setPhotoBoothOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>📸</span>
              <span>Photo Booth</span>
            </button>
          )}
          {navSettings?.thenandnow_enabled && (
            <button
              onClick={() => handleItemClick(() => setThenAndNowOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: navSettings?.comments_enabled ? '1px solid rgba(255,255,255,0.1)' : 'none',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>🏛️</span>
              <span>Then & Now</span>
            </button>
          )}
          {navSettings?.comments_enabled && (
            <button
              onClick={() => handleItemClick(() => setCommentsOpen(true))}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                color: '#f4f6f8',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>💬</span>
              <span>Leave Feedback</span>
            </button>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: menuOpen
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          color: '#fff',
          fontSize: 24,
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
    </>
  );
}
