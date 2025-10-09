// src/components/ProximityMonitor.jsx
import { useEffect, useRef, useState } from 'react';

/**
 * ProximityMonitor - Visual debugging panel for proximity detection
 * Shows camera feed, motion heatmap, and real-time detection events
 */
export function ProximityMonitor({ enabled, proximityLevel, isAmbientDetected, isPersonDetected, isStaring, stareDuration, cameraError }) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ frames: 0, avgProximity: 0, detectionCount: 0, stareCount: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const eventLogRef = useRef([]);

  // Log events for stare detection
  useEffect(() => {
    if (isStaring) {
      const event = {
        time: new Date().toLocaleTimeString(),
        type: 'stare',
        message: `Stare detected! Proximity: ${proximityLevel}, Duration: ${Math.floor(stareDuration / 1000)}s`,
        level: proximityLevel,
      };
      eventLogRef.current = [event, ...eventLogRef.current].slice(0, 50); // Keep last 50 events
      setEvents([...eventLogRef.current]);
      setStats(prev => ({ ...prev, stareCount: prev.stareCount + 1 }));
    }
  }, [isStaring, proximityLevel, stareDuration]);

  // Log events when person detected (walkup)
  useEffect(() => {
    if (isPersonDetected && !isStaring) {
      const event = {
        time: new Date().toLocaleTimeString(),
        type: 'person',
        message: `Person detected! Proximity: ${proximityLevel}`,
        level: proximityLevel,
      };
      eventLogRef.current = [event, ...eventLogRef.current].slice(0, 50);
      setEvents([...eventLogRef.current]);
      setStats(prev => ({ ...prev, detectionCount: prev.detectionCount + 1 }));
    }
  }, [isPersonDetected, isStaring, proximityLevel]);

  // Log events for ambient detection
  useEffect(() => {
    if (isAmbientDetected && !isPersonDetected && !isStaring) {
      const event = {
        time: new Date().toLocaleTimeString(),
        type: 'ambient',
        message: `Ambient motion detected. Proximity: ${proximityLevel}`,
        level: proximityLevel,
      };
      eventLogRef.current = [event, ...eventLogRef.current].slice(0, 50);
      setEvents([...eventLogRef.current]);
    }
  }, [isAmbientDetected, isPersonDetected, isStaring, proximityLevel]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        frames: prev.frames + 1,
        avgProximity: Math.round((prev.avgProximity * prev.frames + proximityLevel) / (prev.frames + 1)),
        detectionCount: prev.detectionCount,
      }));
    }, 500);

    return () => clearInterval(interval);
  }, [proximityLevel]);

  // Access camera stream from the proximity detection hook (if available)
  useEffect(() => {
    if (!enabled) return;

    // Try to find the video element created by useProximityDetection
    const checkForVideo = setInterval(() => {
      const videos = document.querySelectorAll('video');
      if (videos.length > 0 && videoRef.current) {
        // Mirror the stream to our monitor
        videoRef.current.srcObject = videos[0].srcObject;
        clearInterval(checkForVideo);
      }
    }, 500);

    return () => clearInterval(checkForVideo);
  }, [enabled]);

  if (!enabled) {
    return (
      <div style={{
        padding: '20px',
        background: '#1a1a1a',
        borderRadius: '8px',
        color: '#888',
        textAlign: 'center',
      }}>
        Proximity Detection is disabled. Enable it in settings to use this monitor.
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      padding: '20px',
      background: '#1a1a1a',
      borderRadius: '8px',
      color: '#fff',
    }}>
      {/* Camera Feed & Visualization */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Camera Feed</h3>

        {cameraError ? (
          <div style={{
            padding: '20px',
            background: '#ff4444',
            borderRadius: '8px',
            color: '#fff',
          }}>
            <strong>Camera Error:</strong> {cameraError}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
                background: '#000',
              }}
            />

            {/* Overlay indicators */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              {/* Detection status */}
              <div style={{
                padding: '8px 12px',
                background: isStaring ? '#ff0000' : isPersonDetected ? '#ffaa00' : isAmbientDetected ? '#00ff00' : '#333',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: isStaring || isPersonDetected || isAmbientDetected ? '#000' : '#fff',
              }}>
                {isStaring ? `👁️ STARE ${Math.floor(stareDuration / 1000)}s` : isPersonDetected ? '🚶 WALKUP' : isAmbientDetected ? '👋 AMBIENT MOTION' : '⚫ NO MOTION'}
              </div>

              {/* Proximity level */}
              <div style={{
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
              }}>
                Proximity: {proximityLevel}%
              </div>
            </div>

            {/* Proximity level bar */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
            }}>
              <div style={{
                width: '100%',
                height: '20px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '10px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${proximityLevel}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, #00ff00, ${proximityLevel > 50 ? '#ffaa00' : '#00ff00'}, ${proximityLevel > 80 ? '#ff0000' : '#ffaa00'})`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}>
          <div style={{
            padding: '12px',
            background: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff00' }}>
              {stats.frames}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Frames Analyzed
            </div>
          </div>

          <div style={{
            padding: '12px',
            background: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffaa00' }}>
              {stats.avgProximity}%
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Avg Proximity
            </div>
          </div>

          <div style={{
            padding: '12px',
            background: '#2a2a2a',
            borderRadius: '6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff6600' }}>
              {stats.detectionCount}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              Detections
            </div>
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Event Log</h3>

        <div style={{
          flex: 1,
          background: '#2a2a2a',
          borderRadius: '8px',
          padding: '12px',
          overflowY: 'auto',
          maxHeight: '500px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>
          {events.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              No events yet. Waiting for motion detection...
            </div>
          ) : (
            events.map((event, i) => (
              <div
                key={i}
                style={{
                  padding: '8px',
                  marginBottom: '6px',
                  background: event.type === 'stare' ? 'rgba(255, 0, 0, 0.1)' : event.type === 'person' ? 'rgba(255, 170, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
                  borderLeft: `3px solid ${event.type === 'stare' ? '#ff0000' : event.type === 'person' ? '#ffaa00' : '#00ff00'}`,
                  borderRadius: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#888' }}>{event.time}</span>
                  <span style={{
                    color: event.type === 'stare' ? '#ff0000' : event.type === 'person' ? '#ffaa00' : '#00ff00',
                    fontWeight: '600',
                  }}>
                    {event.type === 'stare' ? '👁️ STARE' : event.type === 'person' ? '🚶 WALKUP' : '👋 AMBIENT'}
                  </span>
                </div>
                <div style={{ color: '#ccc' }}>
                  {event.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clear log button */}
        <button
          onClick={() => {
            eventLogRef.current = [];
            setEvents([]);
            setStats({ frames: 0, avgProximity: 0, detectionCount: 0 });
          }}
          style={{
            padding: '10px',
            background: '#ff4444',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Clear Log
        </button>
      </div>
    </div>
  );
}
