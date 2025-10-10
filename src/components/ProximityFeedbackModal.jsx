// src/components/ProximityFeedbackModal.jsx
import { useState, useEffect } from 'react';

/**
 * ProximityFeedbackModal - Collects user feedback on proximity detection triggers
 *
 * Asks users "Was this the right time?" after ambient music or walkup voice triggers
 * to help calibrate and improve adaptive thresholds over time.
 */
export default function ProximityFeedbackModal({
  open,
  onClose,
  onFeedback,
  triggerType, // 'ambient' | 'walkup'
  proximityLevel,
  threshold,
  baseline,
  intent,
  confidence,
  autoCloseMs = 8000, // Auto-close after 8 seconds if no response
}) {
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Auto-close timer
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      console.log('[ProximityFeedback] Auto-closing modal after timeout');
      onClose();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  const handleFeedback = (wasCorrect) => {
    setSelectedFeedback(wasCorrect);

    // Call feedback callback with detailed context
    onFeedback({
      wasCorrect,
      triggerType,
      proximityLevel,
      threshold,
      baseline,
      intent,
      confidence,
      timestamp: new Date().toISOString(),
    });

    // Brief visual confirmation before closing
    setTimeout(() => {
      onClose();
      setSelectedFeedback(null);
    }, 800);
  };

  const triggerLabel = triggerType === 'ambient' ? 'Ambient Music' : 'Voice Greeting';
  const triggerEmoji = triggerType === 'ambient' ? '🎵' : '👋';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      onClick={(e) => {
        // Allow clicking through to underlying content
        e.stopPropagation();
      }}
    >
      {/* Modal content */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1d2e 0%, #2d3148 100%)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          pointerEvents: 'auto',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '12px',
            animation: selectedFeedback !== null ? 'bounce 0.5s ease-out' : 'none',
          }}>
            {selectedFeedback === true ? '✅' : selectedFeedback === false ? '❌' : triggerEmoji}
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '8px',
          }}>
            {selectedFeedback === true ? 'Thanks!' : selectedFeedback === false ? 'Got it!' : `${triggerLabel} Triggered`}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.5',
          }}>
            {selectedFeedback !== null
              ? 'Your feedback helps improve detection'
              : 'Was this the right time?'
            }
          </p>
        </div>

        {/* Debug info (collapsed by default) */}
        {selectedFeedback === null && (
          <div style={{
            marginBottom: '24px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'monospace',
          }}>
            <div>Proximity: {proximityLevel} (threshold: {threshold}, baseline: {baseline})</div>
            <div>Intent: {intent} ({confidence}% confidence)</div>
          </div>
        )}

        {/* Feedback buttons */}
        {selectedFeedback === null && (
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => handleFeedback(true)}
              style={{
                flex: 1,
                padding: '20px 32px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
            >
              ✅ Yes, Good Timing
            </button>

            <button
              onClick={() => handleFeedback(false)}
              style={{
                flex: 1,
                padding: '20px 32px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#fff',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }}
            >
              ❌ No, Too Early/Late
            </button>
          </div>
        )}

        {/* Auto-close indicator */}
        {selectedFeedback === null && (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}>
            Auto-closing in {Math.ceil(autoCloseMs / 1000)}s...
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
