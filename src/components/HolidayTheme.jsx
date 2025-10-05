// src/components/HolidayTheme.jsx
import { useEffect, useState } from 'react';
import { getHolidayTheme } from '../lib/effects';

/**
 * Holiday Theme Banner
 * Shows a festive banner when there's an active holiday theme
 */
export default function HolidayTheme() {
  const [theme, setTheme] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const holidayTheme = getHolidayTheme();
    if (holidayTheme) {
      setTheme(holidayTheme);

      // Apply CSS variable for theme color
      document.documentElement.style.setProperty('--holiday-primary', holidayTheme.primaryColor);
      document.documentElement.style.setProperty('--holiday-accent', holidayTheme.accentColor);

      // Check if user dismissed this theme today
      const dismissKey = `holiday_dismissed_${holidayTheme.name}_${new Date().toDateString()}`;
      const wasDismissed = localStorage.getItem(dismissKey);
      if (wasDismissed) {
        setDismissed(true);
      }
    }
  }, []);

  if (!theme || dismissed) return null;

  const handleDismiss = () => {
    const dismissKey = `holiday_dismissed_${theme.name}_${new Date().toDateString()}`;
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor} 100%)`,
        color: '#fff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>{theme.emoji}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Happy {theme.name}!
          </div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Celebrate with Chi-Pins 🎉
          </div>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8,
          color: '#fff',
          padding: '6px 12px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
        }}
      >
        Dismiss
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
