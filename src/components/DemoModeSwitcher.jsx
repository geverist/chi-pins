// src/components/DemoModeSwitcher.jsx
// Investor demo mode switcher - allows live switching between vertical configurations

import { useState, useEffect } from 'react';
import { VERTICAL_MODES, getCurrentMode, setCurrentMode } from '../config/verticalModes';

export default function DemoModeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentModeState] = useState(getCurrentMode());
  const [isVisible, setIsVisible] = useState(false);

  // Secret key combination to show/hide: Shift + D + M + O
  useEffect(() => {
    let keySequence = [];
    const targetSequence = ['D', 'M', 'O'];
    let shiftPressed = false;

    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        shiftPressed = true;
        keySequence = [];
        return;
      }

      if (shiftPressed && e.key.toUpperCase() === targetSequence[keySequence.length]) {
        keySequence.push(e.key.toUpperCase());

        if (keySequence.join('') === targetSequence.join('')) {
          setIsVisible(prev => !prev);
          keySequence = [];
        }
      } else if (shiftPressed) {
        keySequence = [];
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        shiftPressed = false;
        keySequence = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleModeChange = (modeId) => {
    setCurrentMode(modeId);
    setCurrentModeState(modeId);
    setIsOpen(false);

    // Reload to apply new mode
    window.location.reload();
  };

  if (!isVisible) return null;

  const currentModeConfig = VERTICAL_MODES[currentMode];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 99999,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid rgba(255,255,255,0.3)',
          color: 'white',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(102,126,234,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1.1)' : 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'rotate(45deg) scale(1)' : 'scale(1)';
        }}
      >
        {isOpen ? '✕' : '🎭'}
      </button>

      {/* Demo Mode Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            zIndex: 99998,
            width: 380,
            maxHeight: '80vh',
            overflow: 'auto',
            background: 'linear-gradient(135deg, #1a1f26 0%, #2a2f37 100%)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'slideUp 0.3s ease-out',
          }}
        >
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
          `}</style>

          {/* Header */}
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#667eea',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 8,
              }}
            >
              Investor Demo Mode
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f4f6f8', marginBottom: 4 }}>
              EngageOS™ Verticals
            </div>
            <div style={{ fontSize: 13, color: '#a7b0b8' }}>
              Switch between industry configurations
            </div>
          </div>

          {/* Current Mode Display */}
          <div
            style={{
              padding: 16,
              background: 'rgba(102,126,234,0.1)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: 12, color: '#a7b0b8', marginBottom: 6 }}>Currently Viewing:</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 32 }}>{currentModeConfig.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f4f6f8' }}>
                  {currentModeConfig.name}
                </div>
                <div style={{ fontSize: 12, color: '#a7b0b8' }}>
                  {currentModeConfig.tagline}
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Options */}
          <div style={{ padding: 16 }}>
            {Object.values(VERTICAL_MODES).map((mode) => {
              const isActive = mode.id === currentMode;

              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  disabled={isActive}
                  style={{
                    width: '100%',
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 12,
                    border: isActive
                      ? '2px solid #667eea'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: isActive
                      ? 'rgba(102,126,234,0.2)'
                      : 'rgba(255,255,255,0.03)',
                    cursor: isActive ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    opacity: isActive ? 1 : 0.8,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{ fontSize: 36 }}>{mode.icon}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: isActive ? '#667eea' : '#f4f6f8',
                        marginBottom: 4,
                      }}
                    >
                      {mode.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#a7b0b8',
                        lineHeight: 1.4,
                      }}
                    >
                      {mode.tagline}
                    </div>
                  </div>
                  {isActive && (
                    <div
                      style={{
                        fontSize: 18,
                        color: '#667eea',
                      }}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Metrics Preview (if mode has sample metrics) */}
          {currentModeConfig.sampleMetrics && (
            <div
              style={{
                padding: 16,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#a7b0b8',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Sample Metrics
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                {Object.entries(currentModeConfig.sampleMetrics).map(([key, value]) => (
                  <div key={key}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#6b7280',
                        textTransform: 'capitalize',
                        marginBottom: 4,
                      }}
                    >
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#10b981',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div
            style={{
              padding: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(102,126,234,0.05)',
            }}
          >
            <div style={{ fontSize: 11, color: '#a7b0b8', lineHeight: 1.6 }}>
              💡 <strong>Tip:</strong> Press <kbd style={{
                padding: '2px 6px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'monospace',
              }}>Shift+D+M+O</kbd> to toggle this panel
            </div>
          </div>
        </div>
      )}
    </>
  );
}
