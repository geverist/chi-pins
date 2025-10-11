// src/components/DetectionStateIndicator.jsx
// Visual indicator showing current proximity detection state

import { useState, useEffect } from 'react';

/**
 * DetectionStateIndicator - Shows colored border indicating detection state
 *
 * Detection States:
 * - AMBIENT (blue): General proximity detected (10-30 distance)
 * - WALKUP (yellow): Patron approaching with gaze (30-60 distance + looking)
 * - STARE (red): Employee engaged, staring at screen (60+ distance + looking for 15s+)
 * - NONE (no border): No detection
 *
 * @param {boolean} isAmbientDetected - Ambient zone detection
 * @param {boolean} isWalkupDetected - Walkup zone detection (approaching + gaze)
 * @param {boolean} isStaring - Stare detection (stopped + gaze + duration)
 * @param {number} activePeopleCount - Number of tracked people
 * @param {number} maxProximityLevel - Highest proximity level detected
 * @param {Array} trackedPeople - Array of tracked people with detailed data
 */
export function DetectionStateIndicator({
  isAmbientDetected = false,
  isWalkupDetected = false,
  isStaring = false,
  activePeopleCount = 0,
  maxProximityLevel = 0,
  trackedPeople = [],
}) {
  const [detectionState, setDetectionState] = useState('none');
  const [borderColor, setBorderColor] = useState('transparent');
  const [labelText, setLabelText] = useState('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Determine current detection state (priority: stare > walkup > ambient > none)
  useEffect(() => {
    let state = 'none';
    let color = 'transparent';
    let label = '';

    if (isStaring) {
      state = 'stare';
      color = 'rgba(239, 68, 68, 0.8)'; // Red
      label = '🔍 STARE: Employee Engaged';
    } else if (isWalkupDetected) {
      state = 'walkup';
      color = 'rgba(251, 191, 36, 0.8)'; // Yellow/amber
      label = '👁️ WALKUP: Patron Approaching';
    } else if (isAmbientDetected) {
      state = 'ambient';
      color = 'rgba(96, 165, 250, 0.8)'; // Blue
      label = '🎵 AMBIENT: Proximity Detected';
    }

    setDetectionState(state);
    setBorderColor(color);
    setLabelText(label);
  }, [isAmbientDetected, isWalkupDetected, isStaring]);

  // Keyboard shortcut to toggle debug info (press 'd' key)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDebugInfo(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Don't render anything if no detection
  if (detectionState === 'none' && !showDebugInfo) {
    return null;
  }

  return (
    <>
      {/* Colored border around screen */}
      {detectionState !== 'none' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: `8px solid ${borderColor}`,
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'border-color 0.3s ease',
            borderRadius: '4px',
          }}
        />
      )}

      {/* Detection state label */}
      {detectionState !== 'none' && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: borderColor,
            color: 'white',
            padding: '8px 24px',
            borderRadius: '24px',
            fontSize: '18px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
            letterSpacing: '0.5px',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          {labelText}
        </div>
      )}

      {/* Debug info panel (press 'd' to toggle) */}
      {showDebugInfo && (
        <div
          onClick={() => setShowDebugInfo(false)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#00ff00',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'Monaco, Consolas, monospace',
            maxWidth: '400px',
            maxHeight: '400px',
            overflow: 'auto',
            zIndex: 9999,
            cursor: 'pointer',
            border: '2px solid rgba(0, 255, 0, 0.3)',
          }}
        >
          <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
            🎯 Detection Debug Info (click to close)
          </div>
          <div style={{ lineHeight: '1.6' }}>
            <div><strong>State:</strong> {detectionState.toUpperCase()}</div>
            <div><strong>People Count:</strong> {activePeopleCount}</div>
            <div><strong>Max Proximity:</strong> {maxProximityLevel.toFixed(0)}</div>
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(0, 255, 0, 0.3)', paddingTop: '8px' }}>
              <strong>Detection Flags:</strong>
            </div>
            <div>• Ambient: {isAmbientDetected ? '✅' : '❌'}</div>
            <div>• Walkup: {isWalkupDetected ? '✅' : '❌'}</div>
            <div>• Staring: {isStaring ? '✅' : '❌'}</div>

            {trackedPeople.length > 0 && (
              <>
                <div style={{ marginTop: '8px', borderTop: '1px solid rgba(0, 255, 0, 0.3)', paddingTop: '8px' }}>
                  <strong>Tracked People ({trackedPeople.length}):</strong>
                </div>
                {trackedPeople.map((person, i) => (
                  <div key={person.id} style={{ marginTop: '4px', paddingLeft: '8px', fontSize: '11px' }}>
                    <div style={{ color: '#00ddff' }}>{person.id}</div>
                    <div>
                      • Distance: {person.distance?.toFixed(0) || 0} |
                      Intent: {person.intent} |
                      Confidence: {person.confidence || 0}%
                    </div>
                    <div>
                      • Looking: {person.isLookingAtKiosk ? '👁️ YES' : '🚫 NO'} |
                      Gaze: {(person.gazeConfidence * 100).toFixed(0)}%
                    </div>
                    {person.velocity && (
                      <div>
                        • Velocity: ({person.velocity.x.toFixed(2)}, {person.velocity.y.toFixed(2)})
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '10px', color: '#888', fontStyle: 'italic' }}>
            Press 'd' to toggle • Click panel to close
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
