// src/components/Jukebox.jsx
import { useState, useEffect } from 'react';
import NowPlaying from './NowPlaying';
import { useFeatureIdleTimeout } from '../hooks/useFeatureIdleTimeout';
import { useAdminSettings } from '../state/useAdminSettings';

export default function Jukebox({ onClose }) {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const { settings: adminSettings } = useAdminSettings();

  // Idle timeout - close jukebox and return to map
  useFeatureIdleTimeout(
    true, // Always active when Jukebox is open
    onClose,
    adminSettings.jukeboxIdleTimeout || 120
  );

  useEffect(() => {
    fetchLibrary();
    fetchStatus();

    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedGenre !== 'all' && { genre: selectedGenre }),
      });

      const response = await fetch(`/api/jukebox-library?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch library');
      }
      const data = await response.json();
      setLibrary(data.tracks || []);
    } catch (err) {
      console.error('Error fetching library:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sonos-status');
      if (response.ok) {
        const data = await response.json();
        setPlaybackStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch playback status:', err);
    }
  };

  const handleAddToQueue = async (track) => {
    try {
      const response = await fetch('/api/sonos-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-to-queue',
          trackUri: track.uri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to queue');
      }

      // Show success feedback
      alert(`Added "${track.title}" to queue!`);

      // Refresh status
      await fetchStatus();
    } catch (err) {
      console.error('Error adding to queue:', err);
      alert('Failed to add song to queue');
    }
  };

  const handlePlayNow = async (track) => {
    try {
      const response = await fetch('/api/sonos-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          trackUri: track.uri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to play track');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Error playing track:', err);
      alert('Failed to play song');
    }
  };

  const genres = ['all', ...new Set(library.map(t => t.genre).filter(Boolean))];

  useEffect(() => {
    if (searchQuery || selectedGenre !== 'all') {
      const timer = setTimeout(fetchLibrary, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedGenre]);

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
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '90vh',
          width: 1200,
          height: '85vh',
          display: 'flex',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Library Browser */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          }}
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
                marginBottom: 12,
              }}
            />

            {/* Genre Filter */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: selectedGenre === genre
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : 'rgba(255,255,255,0.05)',
                    color: '#f4f6f8',
                    cursor: 'pointer',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {genre === 'all' ? 'All' : genre}
                </button>
              ))}
            </div>
          </div>

          {/* Track List */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                Loading library...
              </div>
            )}

            {error && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#ef4444',
                  background: 'rgba(239,68,68,0.1)',
                  borderRadius: 12,
                }}
              >
                Error: {error}
              </div>
            )}

            {!loading && !error && library.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                No tracks found
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {library.map(track => (
                <div
                  key={track.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {track.artworkUrl && (
                    <img
                      src={track.artworkUrl}
                      alt={track.album}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        objectFit: 'cover',
                      }}
                    />
                  )}
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
                      {track.artist} {track.album && `• ${track.album}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handlePlayNow(track)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      title="Play now"
                    >
                      ▶
                    </button>
                    <button
                      onClick={() => handleAddToQueue(track)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#f4f6f8',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      title="Add to queue"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Now Playing */}
        <NowPlaying
          status={playbackStatus}
          onRefresh={fetchStatus}
        />
      </div>
    </div>
  );
}
