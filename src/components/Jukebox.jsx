// src/components/Jukebox.jsx
import { useState, useEffect, useRef } from 'react';
import { useFeatureIdleTimeout } from '../hooks/useFeatureIdleTimeout';
import { useAdminSettings } from '../state/useAdminSettings';
import { useMediaFiles } from '../hooks/useMediaFiles';
import { useNowPlaying } from '../state/useNowPlaying.jsx';
import { useSpotify } from '../hooks/useSpotify';

// Helper function to format seconds as MM:SS
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Jukebox({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'spotify'
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const { settings: adminSettings } = useAdminSettings();
  const { mediaFiles, loading, addSpotifyTrack } = useMediaFiles();
  const { currentTrack, setCurrentTrack, setLastPlayed, addToQueue } = useNowPlaying();
  const { searchTracks, isConfigured: isSpotifyConfigured } = useSpotify();
  const searchTimeoutRef = useRef(null);

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

  // Spotify search with debounce
  useEffect(() => {
    if (activeTab !== 'spotify' || !searchQuery.trim()) {
      setSpotifyResults([]);
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search by 500ms
    searchTimeoutRef.current = setTimeout(async () => {
      setSpotifySearching(true);
      try {
        const { tracks, error } = await searchTracks(searchQuery);
        if (error) {
          console.error('Spotify search error:', error);
          setSpotifyResults([]);
        } else {
          setSpotifyResults(tracks || []);
        }
      } catch (err) {
        console.error('Spotify search failed:', err);
        setSpotifyResults([]);
      } finally {
        setSpotifySearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab, searchTracks]);

  const handleSelectTrack = async (track, isSpotify = false) => {
    console.log('Jukebox - Track selected:', track.title);
    console.log('Jukebox - AutoPlay mode:', adminSettings.jukeboxAutoPlay);

    // If this is a Spotify track, add it to library first
    if (isSpotify) {
      try {
        console.log('Adding Spotify track to library...');
        const addedTrack = await addSpotifyTrack(track);
        // Use the database record instead
        track = {
          ...addedTrack,
          url: track.previewUrl, // Use preview URL for playback
        };
      } catch (err) {
        console.error('Failed to add Spotify track:', err);
        return; // Don't continue if we can't add to library
      }
    }

    if (adminSettings.jukeboxAutoPlay) {
      // Play immediately - save current as last played if exists
      console.log('Jukebox - Setting current track and closing...');
      if (currentTrack) {
        setLastPlayed(currentTrack);
      }
      setCurrentTrack(track);
      setTimeout(() => {
        console.log('Jukebox - Calling onClose()');
        onClose();
      }, 300);
    } else {
      // Add to queue
      console.log('Jukebox - Adding to queue');
      addToQueue(track);
      // If nothing is playing, start playing
      if (!currentTrack) {
        console.log('Jukebox - No current track, setting current track');
        setCurrentTrack(track);
      }
      setTimeout(() => {
        console.log('Jukebox - Calling onClose()');
        onClose();
      }, 300);
    }
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

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab('library')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 8,
                border: activeTab === 'library' ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.2)',
                background: activeTab === 'library' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                color: activeTab === 'library' ? '#a78bfa' : '#a7b0b8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              📚 My Library ({mediaFiles.length})
            </button>
            {isSpotifyConfigured && (
              <button
                onClick={() => setActiveTab('spotify')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 8,
                  border: activeTab === 'spotify' ? '2px solid #1db954' : '1px solid rgba(255,255,255,0.2)',
                  background: activeTab === 'spotify' ? 'rgba(29,185,84,0.2)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'spotify' ? '#1ed760' : '#a7b0b8',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                🎧 Spotify Search
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'library' ? 'Search your library...' : 'Search Spotify...'}
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


        {/* Track List */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Library Tab */}
          {activeTab === 'library' && (
            <>
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
                    onClick={() => handleSelectTrack(track)}
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
                        {track.music_source === 'spotify' && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: '#1ed760' }}>🎧</span>
                        )}
                      </div>
                      <div style={{ color: '#a7b0b8', fontSize: 12 }}>
                        {track.artist || 'Unknown Artist'}
                        {track.duration_seconds && ` • ${formatTime(track.duration_seconds)}`}
                        {track.license_type && (
                          <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>
                            • {track.license_type === 'streaming_api' ? 'Licensed' : track.license_type}
                          </span>
                        )}
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
            </>
          )}

          {/* Spotify Tab */}
          {activeTab === 'spotify' && (
            <>
              {!searchQuery && (
                <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                  Start typing to search Spotify...
                </div>
              )}

              {spotifySearching && (
                <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                  Searching Spotify...
                </div>
              )}

              {searchQuery && !spotifySearching && spotifyResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                  No results found
                </div>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                {spotifyResults.map(track => (
                  <div
                    key={track.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: 'rgba(29,185,84,0.08)',
                      borderRadius: 10,
                      border: '1px solid rgba(29,185,84,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleSelectTrack(track, true)}
                  >
                    {track.albumArt && (
                      <img
                        src={track.albumArt}
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
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#1ed760' }}>🎧</span>
                      </div>
                      <div style={{ color: '#a7b0b8', fontSize: 12 }}>
                        {track.artist}
                        {track.duration && ` • ${formatTime(Math.round(track.duration / 1000))}`}
                      </div>
                      <div style={{ color: '#1ed760', fontSize: 10, marginTop: 2 }}>
                        {track.album} • Licensed via Spotify
                      </div>
                    </div>
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(29,185,84,0.2)',
                      color: '#1ed760',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {track.previewUrl ? '+ Add' : '⚠️ No Preview'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
