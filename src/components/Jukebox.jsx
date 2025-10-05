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

// Generate a placeholder album art with gradient based on track title
function getAlbumArtPlaceholder(track) {
  if (track.album_art || track.albumArt) {
    return track.album_art || track.albumArt;
  }

  // Generate gradient based on title hash
  const hash = (track.title || 'unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hash * 2) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%))`;
}

export default function Jukebox({ onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'spotify'
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [topTracks, setTopTracks] = useState([]);
  const [loadingTopTracks, setLoadingTopTracks] = useState(false);
  const { settings: adminSettings } = useAdminSettings();
  const { mediaFiles, loading, addSpotifyTrack } = useMediaFiles();
  const { currentTrack, setCurrentTrack, setLastPlayed, addToQueue } = useNowPlaying();
  const { searchTracks, getTopTracks, isConfigured: isSpotifyConfigured } = useSpotify();
  const searchTimeoutRef = useRef(null);

  // Idle timeout - close jukebox and return to map
  useFeatureIdleTimeout(
    true, // Always active when Jukebox is open
    onClose,
    adminSettings.jukeboxIdleTimeout || 120
  );

  // Get most popular tracks (first 6 tracks sorted by play_count if available, or just first 6)
  const popularTracks = mediaFiles
    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
    .slice(0, 6);

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

  // Load top tracks when Spotify tab is opened
  useEffect(() => {
    if (activeTab === 'spotify' && topTracks.length === 0 && !loadingTopTracks) {
      setLoadingTopTracks(true);
      getTopTracks(10).then(tracks => {
        setTopTracks(tracks);
        setLoadingTopTracks(false);
      }).catch(err => {
        console.error('Failed to load top tracks:', err);
        setLoadingTopTracks(false);
      });
    }
  }, [activeTab, getTopTracks, topTracks.length, loadingTopTracks]);

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
      // Add to queue or play immediately if nothing playing
      if (!currentTrack) {
        // Nothing playing - set as current track (don't add to queue to avoid duplicate)
        console.log('Jukebox - No current track, setting as current track (not adding to queue)');
        setCurrentTrack(track);
      } else {
        // Something already playing - add to queue for later
        console.log('Jukebox - Adding to queue');
        addToQueue(track);
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

              {!loading && mediaFiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                  No tracks uploaded. Go to Admin Panel &gt; Media to upload MP3 files.
                </div>
              )}

              {!loading && mediaFiles.length > 0 && (
                <>
                  {/* Popular Tracks Section - only show if not searching */}
                  {!searchQuery && popularTracks.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <h3 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 18, fontWeight: 600 }}>
                        🔥 Most Popular
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 16,
                      }}>
                        {popularTracks.map(track => {
                          const albumArt = getAlbumArtPlaceholder(track);
                          const isImage = albumArt.startsWith('http') || albumArt.startsWith('data:');

                          return (
                            <div
                              key={track.id}
                              onClick={() => handleSelectTrack(track)}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)',
                                border: currentTrack?.id === track.id ? '2px solid rgba(139,92,246,0.8)' : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {/* Album Art */}
                              <div style={{
                                aspectRatio: '1/1',
                                background: isImage ? '#1a1d23' : albumArt,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                              }}>
                                {isImage ? (
                                  <img src={albumArt} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ fontSize: 48 }}>🎵</div>
                                )}
                                {currentTrack?.id === track.id && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    background: 'rgba(139,92,246,0.9)',
                                    borderRadius: 20,
                                    padding: '4px 8px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#fff',
                                  }}>
                                    NOW PLAYING
                                  </div>
                                )}
                              </div>
                              {/* Track Info */}
                              <div style={{ padding: 12 }}>
                                <div style={{
                                  color: '#f4f6f8',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  marginBottom: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {track.title}
                                </div>
                                <div style={{
                                  color: '#a7b0b8',
                                  fontSize: 11,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {track.artist || 'Unknown Artist'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All Tracks Section */}
                  {filteredLibrary.length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 16px', color: '#f4f6f8', fontSize: 18, fontWeight: 600 }}>
                        {searchQuery ? `Search Results (${filteredLibrary.length})` : '🎵 All Tracks'}
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 16,
                      }}>
                        {filteredLibrary.map(track => {
                          const albumArt = getAlbumArtPlaceholder(track);
                          const isImage = albumArt.startsWith('http') || albumArt.startsWith('data:');

                          return (
                            <div
                              key={track.id}
                              onClick={() => handleSelectTrack(track)}
                              style={{
                                cursor: 'pointer',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.05)',
                                border: currentTrack?.id === track.id ? '2px solid rgba(139,92,246,0.8)' : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {/* Album Art */}
                              <div style={{
                                aspectRatio: '1/1',
                                background: isImage ? '#1a1d23' : albumArt,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                              }}>
                                {isImage ? (
                                  <img src={albumArt} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ fontSize: 48 }}>🎵</div>
                                )}
                                {track.music_source === 'spotify' && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    background: 'rgba(30,215,96,0.9)',
                                    borderRadius: 20,
                                    padding: '4px 8px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#000',
                                  }}>
                                    SPOTIFY
                                  </div>
                                )}
                              </div>
                              {/* Track Info */}
                              <div style={{ padding: 12 }}>
                                <div style={{
                                  color: '#f4f6f8',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  marginBottom: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {track.title}
                                </div>
                                <div style={{
                                  color: '#a7b0b8',
                                  fontSize: 11,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {track.artist || 'Unknown Artist'}
                                </div>
                                {track.duration_seconds && (
                                  <div style={{ color: '#6b7280', fontSize: 10, marginTop: 4 }}>
                                    {formatTime(track.duration_seconds)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchQuery && filteredLibrary.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                      No tracks match your search
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Spotify Tab */}
          {activeTab === 'spotify' && (
            <>
              {/* Info banner */}
              <div style={{
                padding: 12,
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 8,
                color: '#93c5fd',
                fontSize: 13,
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                ℹ️ <strong>30-Second Previews:</strong> We only show Spotify tracks with available preview clips.
                Some songs may not appear if Spotify doesn't provide a preview.
              </div>

              {!searchQuery && (
                <>
                  {loadingTopTracks && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                      Loading top tracks...
                    </div>
                  )}

                  {!loadingTopTracks && topTracks.length > 0 && (
                    <div>
                      <h3 style={{ margin: '0 0 16px', color: '#f3f5f7', fontSize: 18, fontWeight: 600 }}>
                        🔥 Top 10 Most Played (with previews)
                      </h3>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {topTracks.map((track, index) => (
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
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29,185,84,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(29,185,84,0.08)'}
                          >
                            <div style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: '#1ed760',
                              minWidth: 30,
                              textAlign: 'center',
                            }}>
                              #{index + 1}
                            </div>
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
                              + Add
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 24,
                        padding: 16,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid #2a2f37',
                        borderRadius: 8,
                        textAlign: 'center',
                      }}>
                        <div style={{ color: '#f3f5f7', fontSize: 14, marginBottom: 8 }}>
                          🔍 Search for more songs
                        </div>
                        <div style={{ color: '#a7b0b8', fontSize: 12 }}>
                          Type in the search box above to find specific tracks
                        </div>
                      </div>
                    </div>
                  )}

                  {!loadingTopTracks && topTracks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                      Start typing to search Spotify...
                    </div>
                  )}
                </>
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

              {searchQuery && !spotifySearching && spotifyResults.length > 0 && spotifyResults.filter(t => t.previewUrl).length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
                  No playable tracks found. Spotify only provides 30-second previews for some songs.
                </div>
              )}

              <div style={{ display: 'grid', gap: 8 }}>
                {spotifyResults.filter(track => track.previewUrl).map(track => (
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29,185,84,0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(29,185,84,0.08)'}
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
                      + Add
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
