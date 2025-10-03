// src/components/NowPlaying.jsx
import { useState } from 'react';

export default function NowPlaying({ status, onRefresh }) {
  const [volume, setVolume] = useState(status?.volume || 50);

  const handleControl = async (action, params = {}) => {
    try {
      const response = await fetch('/api/sonos-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      if (!response.ok) {
        throw new Error('Control failed');
      }

      // Refresh status after control
      setTimeout(onRefresh, 500);
    } catch (err) {
      console.error('Control error:', err);
      alert('Failed to control playback');
    }
  };

  const handleVolumeChange = async (newVolume) => {
    setVolume(newVolume);
    await handleControl('set-volume', { volume: newVolume });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTrack = status?.currentTrack;
  const isPlaying = status?.playbackState === 'PLAYING';
  const queue = status?.queue || [];

  return (
    <div
      style={{
        width: 400,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      {/* Now Playing */}
      <div
        style={{
          padding: 24,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 18 }}>
          Now Playing
        </h3>

        {currentTrack ? (
          <>
            {currentTrack.artworkUrl && (
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.album}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  marginBottom: 16,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  color: '#f4f6f8',
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {currentTrack.title}
              </div>
              <div style={{ color: '#a7b0b8', fontSize: 14 }}>
                {currentTrack.artist}
              </div>
              {currentTrack.album && (
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                  {currentTrack.album}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {status.duration > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    height: 4,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
                      width: `${(status.position / status.duration) * 100}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#6b7280',
                  }}
                >
                  <span>{formatTime(status.position)}</span>
                  <span>{formatTime(status.duration)}</span>
                </div>
              </div>
            )}

            {/* Playback Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => handleControl('previous')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#f4f6f8',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
                title="Previous"
              >
                ⏮
              </button>
              <button
                onClick={() => handleControl(isPlaying ? 'pause' : 'play')}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={() => handleControl('next')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#f4f6f8',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
                title="Next"
              >
                ⏭
              </button>
            </div>

            {/* Volume Control */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: '#a7b0b8', fontSize: 14 }}>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: '#a7b0b8', fontSize: 12, width: 32 }}>
                  {volume}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            Nothing playing
          </div>
        )}
      </div>

      {/* Queue */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', color: '#f4f6f8', fontSize: 14 }}>
          Up Next ({queue.length})
        </h4>

        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6b7280', fontSize: 12 }}>
            Queue is empty
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queue.slice(0, 10).map((track, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    color: '#6b7280',
                    fontSize: 11,
                    width: 20,
                    textAlign: 'center',
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#f4f6f8',
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {track.title}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 10 }}>
                    {track.artist}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
