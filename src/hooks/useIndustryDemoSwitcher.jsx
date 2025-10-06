// src/hooks/useIndustryDemoSwitcher.jsx
import { useState, useEffect } from 'react';

/**
 * Industry Demo Switcher Hook
 *
 * Detects key sequence: D-E-M-O (in order, within 2 seconds)
 * Shows a modal to switch between industry demos for testing
 */

const KEY_SEQUENCE = ['d', 'e', 'm', 'o'];
const SEQUENCE_TIMEOUT = 2000; // 2 seconds to complete sequence

export function useIndustryDemoSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [keyPresses, setKeyPresses] = useState([]);
  const [lastKeyTime, setLastKeyTime] = useState(0);

  useEffect(() => {
    function handleKeyPress(e) {
      const key = e.key.toLowerCase();
      const now = Date.now();

      // Reset if timeout exceeded
      if (now - lastKeyTime > SEQUENCE_TIMEOUT) {
        setKeyPresses([key]);
      } else {
        setKeyPresses(prev => [...prev, key]);
      }

      setLastKeyTime(now);
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lastKeyTime]);

  useEffect(() => {
    // Check if sequence matches
    if (keyPresses.length >= KEY_SEQUENCE.length) {
      const lastKeys = keyPresses.slice(-KEY_SEQUENCE.length);
      const matches = lastKeys.every((key, i) => key === KEY_SEQUENCE[i]);

      if (matches) {
        setIsOpen(true);
        setKeyPresses([]); // Reset
      }
    }
  }, [keyPresses]);

  function close() {
    setIsOpen(false);
  }

  function switchToIndustry(industry) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('industry', industry);
    window.location.href = currentUrl.toString();
  }

  return {
    isOpen,
    close,
    switchToIndustry
  };
}

export function IndustryDemoSwitcherModal({ isOpen, onClose, onSwitch }) {
  if (!isOpen) return null;

  const industries = [
    { id: 'restaurant', name: 'Restaurant', icon: '🍔', color: '#ef4444' },
    { id: 'medspa', name: 'Med Spa', icon: '💆', color: '#ec4899' },
    { id: 'auto', name: 'Auto Shop', icon: '🚗', color: '#3b82f6' },
    { id: 'healthcare', name: 'Healthcare', icon: '💊', color: '#10b981' },
    { id: 'fitness', name: 'Fitness', icon: '💪', color: '#f59e0b' },
    { id: 'retail', name: 'Retail', icon: '🛍️', color: '#8b5cf6' },
    { id: 'banking', name: 'Banking', icon: '🏦', color: '#059669' },
    { id: 'events', name: 'Events', icon: '🎉', color: '#ec4899' },
    { id: 'hospitality', name: 'Hotels', icon: '🏨', color: '#0ea5e9' },
  ];

  const currentIndustry = new URLSearchParams(window.location.search).get('industry') || 'restaurant';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🎬 Demo Mode Switcher</h2>
          <p style={styles.subtitle}>Select an industry demo to preview</p>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.grid}>
          {industries.map((industry) => (
            <button
              key={industry.id}
              style={{
                ...styles.industryCard,
                borderColor: currentIndustry === industry.id ? industry.color : '#e5e7eb',
                background: currentIndustry === industry.id ? `${industry.color}10` : 'white',
              }}
              onClick={() => onSwitch(industry.id)}
            >
              <div style={styles.industryIcon}>{industry.icon}</div>
              <div style={styles.industryName}>{industry.name}</div>
              {currentIndustry === industry.id && (
                <div style={{ ...styles.currentBadge, background: industry.color }}>
                  Current
                </div>
              )}
            </button>
          ))}
        </div>

        <div style={styles.footer}>
          <p style={styles.hint}>
            💡 <strong>Tip:</strong> Press <kbd style={styles.kbd}>D-E-M-O</kbd> to open this menu anytime
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '24px',
    padding: '32px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    marginBottom: '24px',
    position: 'relative',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#f3f4f6',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  industryCard: {
    padding: '24px 16px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  industryIcon: {
    fontSize: '48px',
  },
  industryName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  currentBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'white',
  },
  footer: {
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  hint: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    textAlign: 'center',
  },
  kbd: {
    background: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
  },
};
