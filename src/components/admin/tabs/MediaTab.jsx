// src/components/admin/tabs/MediaTab.jsx
// Media management: Spotify, audio output, TTS, media library

import { useAdminContext } from '../hooks/useAdminContext';
import { Card, FieldRow, btn, s } from '../SharedComponents';

export default function MediaTab({ getSpotifyClient }) {
  const {
    settings,
    updateSetting,
    setSettings,
    stopAll,
    currentTrack,
    queue,
    mediaFiles,
    mediaLoading,
    mediaUploading,
    uploadMediaFile,
    deleteMediaFile,
  } = useAdminContext();

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Card title="Playback Control">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Control currently playing media and queue
        </p>
        <div style={{
          padding: '16px',
          background: currentTrack || queue.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
          border: currentTrack || queue.length > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
          borderRadius: 8
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {currentTrack ? '🎵 Now Playing' : queue.length > 0 ? '⏸️ Queue Ready' : '✓ No Active Media'}
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              {currentTrack ? (
                <>
                  <div style={{ fontWeight: 500, color: '#f3f4f6', marginBottom: 2 }}>
                    {currentTrack.title}
                    {currentTrack.artist && ` • ${currentTrack.artist}`}
                  </div>
                  {queue.length > 0 && <div>+{queue.length} track{queue.length !== 1 ? 's' : ''} in queue</div>}
                </>
              ) : queue.length > 0 ? (
                `${queue.length} track${queue.length !== 1 ? 's' : ''} queued`
              ) : (
                'No tracks playing or queued'
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm('Stop all playback and clear the entire queue?')) {
                stopAll();
              }
            }}
            disabled={!currentTrack && queue.length === 0}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: (!currentTrack && queue.length === 0) ? '#4b5563' : '#ef4444',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: (!currentTrack && queue.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!currentTrack && queue.length === 0) ? 0.5 : 1,
            }}
          >
            ⏹️ Stop All Media & Clear Queue
          </button>
        </div>
      </Card>

      <Card title="Spotify Integration">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Connect your Spotify account to display currently playing music in the Now Playing banner
        </p>
        <div style={{
          padding: '12px',
          background: 'rgba(30, 215, 96, 0.1)',
          border: '1px solid rgba(30, 215, 96, 0.3)',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🎧</span>
            <span style={{ fontWeight: 600, color: '#1ed760' }}>Spotify API Connected</span>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Spotify credentials are configured via environment variables:
            <br/>
            <code style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              marginTop: 4,
              display: 'inline-block'
            }}>
              VITE_SPOTIFY_CLIENT_ID
            </code>
            {' and '}
            <code style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11
            }}>
              VITE_SPOTIFY_CLIENT_SECRET
            </code>
          </div>
        </div>

        <FieldRow label="🎵 Now Playing Sync">
          <button
            onClick={() => {
              const client = getSpotifyClient();

              if (client.isAuthenticated()) {
                if (confirm('Disconnect Spotify account?')) {
                  client.logout();
                  alert('Spotify account disconnected');
                }
              } else {
                // Open OAuth flow in popup window
                const authUrl = client.getAuthUrl();
                const popup = window.open(authUrl, 'Spotify Authorization', 'width=500,height=700');

                // Listen for OAuth callback
                window.addEventListener('message', async (event) => {
                  if (event.data.type === 'spotify-auth-code') {
                    try {
                      await client.authorize(event.data.code);
                      alert('Spotify account connected! Now playing music will appear in the banner.');
                      popup?.close();
                    } catch (err) {
                      alert('Failed to connect Spotify: ' + err.message);
                    }
                  }
                });
              }
            }}
            style={{
              ...s.button,
              width: '100%',
              background: getSpotifyClient().isAuthenticated() ? '#ef4444' : '#1ed760',
              color: '#fff',
            }}
          >
            {getSpotifyClient().isAuthenticated()
              ? '🔌 Disconnect Spotify Account'
              : '🔗 Connect Spotify Account'}
          </button>
        </FieldRow>

        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Once connected, your currently playing Spotify track will automatically sync to the Now Playing banner.
          The banner polls every 5 seconds for updates.
        </p>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

        <p style={{ ...s.muted, margin: '0', fontSize: 11 }}>
          💡 The Spotify tab in the Jukebox allows searching millions of songs.
          Preview clips (30 seconds) will be saved to your Media Library for playback.
        </p>
      </Card>

      <Card title="Audio Output Settings">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Configure how audio plays from the Jukebox
        </p>
        <FieldRow label="Audio Output">
          <select
            value={settings.audioOutputType || 'local'}
            onChange={(e) => updateSetting('audioOutputType', e.target.value)}
            style={{
              ...s.input,
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="local">Local Device (Browser)</option>
            <option value="bluetooth">Bluetooth Device</option>
            <option value="sonos">Sonos Speaker</option>
            <option value="heos">HEOS Speaker</option>
          </select>
        </FieldRow>

        {settings.audioOutputType === 'bluetooth' && (
          <>
            <FieldRow label="Bluetooth Discovery">
              <button
                onClick={async () => {
                  // Discover Bluetooth audio devices
                  try {
                    if (!navigator.bluetooth) {
                      alert('Bluetooth is not supported in this browser. Please pair via system settings.');
                      return;
                    }

                    const device = await navigator.bluetooth.requestDevice({
                      filters: [{ services: ['audio_sink'] }],
                      optionalServices: ['battery_service']
                    });

                    if (device) {
                      setSettings(s => ({
                        ...s,
                        bluetoothDeviceName: device.name,
                        bluetoothDeviceId: device.id,
                      }));
                      alert(`Found Bluetooth device: ${device.name}`);
                    }
                  } catch (err) {
                    console.error('Bluetooth discovery failed:', err);
                    if (err.name === 'NotFoundError') {
                      alert('No Bluetooth devices found. Make sure your speaker is in pairing mode.');
                    } else {
                      alert('Bluetooth discovery failed. You can still enter the device name manually.');
                    }
                  }
                }}
                style={{
                  ...s.button,
                  width: '100%',
                  background: '#8b5cf6',
                  color: '#fff',
                }}
              >
                🔍 Discover Bluetooth Devices
              </button>
            </FieldRow>
            <FieldRow label="Device Name">
              <input
                type="text"
                value={settings.bluetoothDeviceName || ''}
                onChange={(e) => updateSetting('bluetoothDeviceName', e.target.value)}
                placeholder="My Bluetooth Speaker"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
              Click "Discover Bluetooth Devices" to scan for available audio devices, or pair via system settings and enter name manually.
            </p>
          </>
        )}

        {settings.audioOutputType === 'sonos' && (
          <>
            <FieldRow label="Sonos Network Discovery">
              <button
                onClick={async () => {
                  // Discover Sonos devices on network
                  try {
                    const { getSonosClient } = await import('../../../lib/sonosClient');
                    const client = getSonosClient();
                    const devices = await client.discover();
                    if (devices.length > 0) {
                      setSettings(s => ({
                        ...s,
                        sonosIpAddress: devices[0].ip,
                        sonosRoomName: devices[0].name,
                      }));
                      alert(`Found Sonos device: ${devices[0].name} (${devices[0].ip})`);
                    } else {
                      alert('No Sonos devices found on network');
                    }
                  } catch (err) {
                    console.error('Sonos discovery failed:', err);
                    alert('Sonos discovery failed. Enter IP manually.');
                  }
                }}
                style={{
                  ...s.button,
                  width: '100%',
                  background: '#10b981',
                  color: '#fff',
                }}
              >
                🔍 Discover Sonos Devices
              </button>
            </FieldRow>
            <FieldRow label="IP Address">
              <input
                type="text"
                value={settings.sonosIpAddress || ''}
                onChange={(e) => updateSetting('sonosIpAddress', e.target.value)}
                placeholder="192.168.1.100"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <FieldRow label="Room Name">
              <input
                type="text"
                value={settings.sonosRoomName || ''}
                onChange={(e) => updateSetting('sonosRoomName', e.target.value)}
                placeholder="Living Room"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
              Click "Discover Sonos Devices" to auto-detect speakers on your network, or enter IP manually.
            </p>
          </>
        )}

        {settings.audioOutputType === 'heos' && (
          <>
            <FieldRow label="HEOS Network Discovery">
              <button
                onClick={async () => {
                  // Discover HEOS devices on network
                  try {
                    const response = await fetch('/api/heos/discover');
                    const devices = await response.json();
                    if (devices.length > 0) {
                      setSettings(s => ({
                        ...s,
                        heosHost: devices[0].ip,
                        heosPlayerId: devices[0].pid,
                      }));
                      alert(`Found HEOS device: ${devices[0].name} (${devices[0].ip})`);
                    } else {
                      alert('No HEOS devices found on network');
                    }
                  } catch (err) {
                    console.error('HEOS discovery failed:', err);
                    alert('HEOS discovery failed. Enter IP manually.');
                  }
                }}
                style={{
                  ...s.button,
                  width: '100%',
                  background: '#3b82f6',
                  color: '#fff',
                }}
              >
                🔍 Discover HEOS Devices
              </button>
            </FieldRow>
            <FieldRow label="HEOS Host IP">
              <input
                type="text"
                value={settings.heosHost || ''}
                onChange={(e) => updateSetting('heosHost', e.target.value)}
                placeholder="192.168.1.100"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <FieldRow label="Player ID">
              <input
                type="text"
                value={settings.heosPlayerId || ''}
                onChange={(e) => updateSetting('heosPlayerId', e.target.value)}
                placeholder="Auto-filled from discovery"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
              Click "Discover HEOS Devices" to auto-detect speakers on your network, or enter IP manually.
            </p>
          </>
        )}

        <FieldRow label="Jukebox Behavior">
          <select
            value={settings.jukeboxAutoPlay ? 'play' : 'queue'}
            onChange={(e) => updateSetting('jukeboxAutoPlay', e.target.value === 'play')}
            style={{
              ...s.input,
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="play">Play Immediately & Close</option>
            <option value="queue">Add to Queue</option>
          </select>
        </FieldRow>
        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Controls what happens when you select a track in the Jukebox
        </p>

        <FieldRow label="Now Playing Scroll Speed (Kiosk)" style={{ marginTop: 16 }}>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.nowPlayingScrollSpeedKiosk || 30}
            onChange={(e) => updateSetting('nowPlayingScrollSpeedKiosk', parseInt(e.target.value) || 30)}
            style={{ ...s.input, width: '80px' }}
          />
          <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
        </FieldRow>

        <FieldRow label="Now Playing Scroll Speed (Mobile)">
          <input
            type="number"
            min="5"
            max="120"
            value={settings.nowPlayingScrollSpeedMobile || 20}
            onChange={(e) => updateSetting('nowPlayingScrollSpeedMobile', parseInt(e.target.value) || 20)}
            style={{ ...s.input, width: '80px' }}
          />
          <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
        </FieldRow>
        <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
          Banner scroll speed for currently playing music
        </p>
      </Card>

      <Card title="Voice & TTS Settings">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Configure text-to-speech for voice assistant and phone calls
        </p>

        <FieldRow label="TTS Provider">
          <select
            value={settings.ttsProvider || 'browser'}
            onChange={(e) => updateSetting('ttsProvider', e.target.value)}
            style={{
              ...s.input,
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="browser">Browser (Built-in)</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </FieldRow>

        {settings.ttsProvider === 'elevenlabs' && (
          <>
            <FieldRow label="ElevenLabs API Key">
              <input
                type="password"
                value={settings.elevenlabsApiKey || ''}
                onChange={(e) => updateSetting('elevenlabsApiKey', e.target.value)}
                placeholder="sk_..."
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
              Get your API key from <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>elevenlabs.io</a>
            </p>

            <FieldRow label="Voice ID (Kiosk)">
              <input
                type="text"
                value={settings.elevenlabsVoiceId || ''}
                onChange={(e) => updateSetting('elevenlabsVoiceId', e.target.value)}
                placeholder="21m00Tcm4TlvDq8ikWAM (Rachel)"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
              Find voice IDs in your <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>ElevenLabs Voice Library</a>
            </p>

            <FieldRow label="Voice ID (Phone)">
              <input
                type="text"
                value={settings.elevenlabsPhoneVoiceId || ''}
                onChange={(e) => updateSetting('elevenlabsPhoneVoiceId', e.target.value)}
                placeholder="21m00Tcm4TlvDq8ikWAM (same as kiosk or different)"
                style={{
                  ...s.input,
                  width: '100%',
                }}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
              Use a different voice for phone calls if desired
            </p>

            <FieldRow label="Model">
              <select
                value={settings.elevenlabsModel || 'eleven_turbo_v2_5'}
                onChange={(e) => updateSetting('elevenlabsModel', e.target.value)}
                style={{
                  ...s.input,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                <option value="eleven_turbo_v2_5">Turbo v2.5 (Fastest, Lowest Latency)</option>
                <option value="eleven_turbo_v2">Turbo v2 (Fast)</option>
                <option value="eleven_multilingual_v2">Multilingual v2 (Best Quality)</option>
                <option value="eleven_monolingual_v1">Monolingual v1 (English Only)</option>
              </select>
            </FieldRow>

            <FieldRow label="Stability">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.elevenlabsStability || 0.5}
                onChange={(e) => updateSetting('elevenlabsStability', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>{settings.elevenlabsStability || 0.5}</span>
            </FieldRow>

            <FieldRow label="Similarity Boost">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.elevenlabsSimilarity || 0.75}
                onChange={(e) => updateSetting('elevenlabsSimilarity', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>{settings.elevenlabsSimilarity || 0.75}</span>
            </FieldRow>
            <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
              Stability: Higher = more consistent. Similarity: Higher = closer to original voice.
            </p>
          </>
        )}
      </Card>

      <Card title="Media Library">
        <p style={s.muted}>
          Upload MP3 audio files for the jukebox. Files are stored in Supabase and played locally.
        </p>

        {/* Upload Section */}
        <div style={{ marginTop: 16 }}>
          <input
            type="file"
            id="media-upload"
            accept="audio/mpeg,audio/mp3,audio/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              // Validate file type
              if (!file.type.startsWith('audio/')) {
                alert('Please select an audio file (MP3)');
                return;
              }

              // Validate file size (max 25MB)
              if (file.size > 25 * 1024 * 1024) {
                alert('Audio file must be smaller than 25MB');
                return;
              }

              try {
                const title = prompt('Enter a title for this track:', file.name.replace(/\.[^/.]+$/, ''));
                if (!title) return;

                const artist = prompt('Enter the artist name (optional):', '');

                await uploadMediaFile(file, { title, artist: artist || null });
                e.target.value = ''; // Reset input
              } catch (err) {
                alert(`Failed to upload: ${err.message}`);
              }
            }}
          />
          <button
            onClick={() => document.getElementById('media-upload').click()}
            style={{
              ...btn.primary,
              width: '100%',
              marginBottom: 16,
            }}
            disabled={mediaUploading}
          >
            {mediaUploading ? 'Uploading...' : '🎵 Upload Audio File'}
          </button>
        </div>

        {/* Loading State */}
        {mediaLoading && (
          <p style={{ textAlign: 'center', color: '#888' }}>Loading media files...</p>
        )}

        {/* Media Files List */}
        {!mediaLoading && mediaFiles.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
            No media files yet. Upload your first track!
          </p>
        )}

        {!mediaLoading && mediaFiles.length > 0 && (
          <div style={{
            display: 'grid',
            gap: 12,
            marginTop: 16,
          }}>
            {mediaFiles.map((media) => (
              <div
                key={media.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#f4f6f8', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                      {media.title}
                    </div>
                    {media.artist && (
                      <div style={{ color: '#a7b0b8', fontSize: 13, marginBottom: 4 }}>
                        {media.artist}
                      </div>
                    )}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {media.duration_seconds ? `${Math.floor(media.duration_seconds / 60)}:${String(media.duration_seconds % 60).padStart(2, '0')}` : 'Unknown duration'}
                      {' • '}
                      {(media.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete "${media.title}"?`)) {
                        try {
                          await deleteMediaFile(media.id, media.storage_path);
                        } catch (err) {
                          alert(`Failed to delete: ${err.message}`);
                        }
                      }
                    }}
                    style={{
                      ...btn.danger,
                      padding: '6px 12px',
                      fontSize: 12,
                      marginLeft: 12,
                    }}
                  >
                    Delete
                  </button>
                </div>

                {/* Audio preview */}
                <audio
                  controls
                  style={{
                    width: '100%',
                    height: 32,
                    marginTop: 8,
                  }}
                  preload="metadata"
                >
                  <source src={media.url} type={media.mime_type} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
