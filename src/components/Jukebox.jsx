// src/components/Jukebox.jsx
import { useState, useEffect, useRef } from 'react';
import { useFeatureIdleTimeout } from '../hooks/useFeatureIdleTimeout';
import { useAdminSettings } from '../state/useAdminSettings';
import { useMediaFiles } from '../hooks/useMediaFiles';
import { useNowPlaying } from '../state/useNowPlaying';

export default function Jukebox({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { settings: adminSettings } = useAdminSettings();
  const { mediaFiles, loading } = useMediaFiles();
  const { currentTrack, setCurrentTrack, isPlaying, setIsPlaying, addToQueue, playNext } = useNowPlaying();
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Idle timeout - close jukebox and return to map
  useFeatureIdleTimeout(
    true, // Always active when Jukebox is open
    onClose,
    adminSettings.jukeboxIdleTimeout || 120
  );

  // Filter library based on search
  const filteredLibrary = mediaFiles.filter(track => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.filename?.toLowerCase().includes(query)
    );
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      // Try to play next track from queue
      const nextTrack = playNext();
      if (nextTrack && audioRef.current) {
        audioRef.current.src = nextTrack.url;
        audioRef.current.play().catch(err => {
          console.error('Failed to play next track:', err);
        });
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playNext]);

  const handlePlayNow = async (track) => {
    setCurrentTrack(track);

    // Handle different audio output types
    if (adminSettings.audioOutputType === 'sonos' && adminSettings.sonosIpAddress) {
      // Play via Sonos HTTP API
      try {
        const response = await fetch('/api/sonos-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'play',
            trackUrl: track.url,
            ipAddress: adminSettings.sonosIpAddress,
            roomName: adminSettings.sonosRoomName,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to play on Sonos');
        }

        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to play on Sonos:', err);
        alert('Failed to play on Sonos. Check your settings and try again.');
      }
    } else {
      // Play locally (works for both 'local' and 'bluetooth')
      // Bluetooth routing happens at OS level after pairing
      if (audioRef.current) {
        audioRef.current.src = track.url;

        // Request audio output device selection if Bluetooth is configured
        if (adminSettings.audioOutputType === 'bluetooth' && 'setSinkId' in audioRef.current) {
          try {
            // Try to set the Bluetooth device if we have an ID stored
            if (adminSettings.bluetoothDeviceId) {
              await audioRef.current.setSinkId(adminSettings.bluetoothDeviceId);
            }
          } catch (err) {
            console.warn('Failed to set audio output device:', err);
            // Fall back to default device
          }
        }

        audioRef.current.play().catch(err => {
          console.error('Failed to play track:', err);
        });
      }
    }
  };

  const handlePauseResume = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Failed to resume track:', err);
      });
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
  };

  const handleNext = () => {
    if (!currentTrack || filteredLibrary.length === 0) return;
    const currentIndex = filteredLibrary.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % filteredLibrary.length;
    handlePlayNow(filteredLibrary[nextIndex]);
  };

  const handlePrevious = () => {
    if (!currentTrack || filteredLibrary.length === 0) return;
    const currentIndex = filteredLibrary.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + filteredLibrary.length) % filteredLibrary.length;
    handlePlayNow(filteredLibrary[prevIndex]);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <audio ref={audioRef} />

      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '90vh',
          width: 1200,
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#f4f6f8', fontSize: 28 }}>
              🎵 Jukebox
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                color: '#f4f6f8',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 16,
              }}
              aria-label="Close jukebox"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#f4f6f8',
              fontSize: 16,
              outline: 'none',
            }}
          />

          {/* Audio Output Info */}
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(139,92,246,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(139,92,246,0.3)',
            fontSize: 12,
            color: '#a78bfa',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>🔊</span>
            <span>
              {adminSettings.audioOutputType === 'bluetooth' && `Bluetooth: ${adminSettings.bluetoothDeviceName || 'Default'}`}
              {adminSettings.audioOutputType === 'sonos' && `Sonos: ${adminSettings.sonosRoomName || 'Default Room'}`}
              {adminSettings.audioOutputType === 'local' && 'Playing on this device'}
            </span>
          </div>
        </div>

        {/* Now Playing Bar */}
        {currentTrack && (
          <div
            style={{
              padding: 16,
              background: 'rgba(139,92,246,0.1)',
              borderBottom: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#f4f6f8', fontSize: 16, fontWeight: 600 }}>
                  {currentTrack.title}
                </div>
                {currentTrack.artist && (
                  <div style={{ color: '#a7b0b8', fontSize: 13 }}>
                    {currentTrack.artist}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handlePrevious}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#f4f6f8',
                    cursor: 'pointer',
                  }}
                >
                  ⏮
                </button>
                <button
                  onClick={handlePauseResume}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#f4f6f8',
                    cursor: 'pointer',
                  }}
                >
                  ⏭
                </button>
                <button
                  onClick={handleStop}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.4)',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#fca5a5',
                    cursor: 'pointer',
                  }}
                >
                  ⏹
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#a7b0b8', fontSize: 12, minWidth: 40 }}>
                {formatTime(currentTime)}
              </span>
              <div
                onClick={handleSeek}
                style={{
                  flex: 1,
                  height: 6,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(currentTime / duration) * 100}%`,
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                    borderRadius: 3,
                  }}
                />
              </div>
              <span style={{ color: '#a7b0b8', fontSize: 12, minWidth: 40 }}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {/* Track List */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
              Loading library...
            </div>
          )}

          {!loading && filteredLibrary.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
              {searchQuery ? 'No tracks match your search' : 'No tracks uploaded. Go to Admin Panel > Media to upload MP3 files.'}
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {filteredLibrary.map(track => (
              <div
                key={track.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: currentTrack?.id === track.id
                    ? 'rgba(139,92,246,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  border: currentTrack?.id === track.id
                    ? '1px solid rgba(139,92,246,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={async () => {
                  console.log('Track clicked:', track.title);
                  console.log('AutoPlay mode:', adminSettings.jukeboxAutoPlay);

                  if (adminSettings.jukeboxAutoPlay) {
                    // Play immediately and close
                    await handlePlayNow(track);
                    console.log('Closing jukebox in 500ms...');
                    setTimeout(() => {
                      console.log('Calling onClose()');
                      onClose();
                    }, 500);
                  } else {
                    // Add to queue
                    addToQueue(track);
                    // If nothing is playing, start playing
                    if (!currentTrack) {
                      await handlePlayNow(track);
                    }
                    console.log('Closing jukebox in 500ms...');
                    setTimeout(() => {
                      console.log('Calling onClose()');
                      onClose();
                    }, 500);
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#f4f6f8',
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {track.title}
                  </div>
                  <div style={{ color: '#a7b0b8', fontSize: 12 }}>
                    {track.artist || 'Unknown Artist'}
                    {track.duration_seconds && ` • ${formatTime(track.duration_seconds)}`}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: currentTrack?.id === track.id
                    ? 'rgba(139,92,246,0.3)'
                    : 'rgba(255,255,255,0.1)',
                  color: '#a78bfa',
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {adminSettings.jukeboxAutoPlay ? '▶ Play' : '+ Queue'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
