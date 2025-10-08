// src/components/PerformanceTab.jsx
import { useState, useEffect } from 'react';
import { offlineTileStorage } from '../lib/offlineTileStorage';
import { getHEOSClient } from '../lib/heosClient';

export default function PerformanceTab({ settings, onSave }) {
  const [cacheStats, setCacheStats] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [heosHost, setHeosHost] = useState(settings.heosHost || '');
  const [heosConnected, setHeosConnected] = useState(false);
  const [heosPlayers, setHeosPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(settings.heosPlayerId || '');
  const [scrollSpeed, setScrollSpeed] = useState(settings.voicePromptsScrollSpeed || 60);

  useEffect(() => {
    loadCacheStats();
  }, []);

  async function loadCacheStats() {
    try {
      const stats = await offlineTileStorage.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('[PerformanceTab] Failed to load cache stats:', error);
    }
  }

  async function handleClearCache() {
    if (!confirm('Clear all cached map tiles? This will free up storage but require re-downloading tiles.')) {
      return;
    }

    setClearing(true);
    try {
      await offlineTileStorage.clearAll();
      await loadCacheStats();
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('[PerformanceTab] Failed to clear cache:', error);
      alert('Failed to clear cache: ' + error.message);
    } finally {
      setClearing(false);
    }
  }

  async function handleHEOSConnect() {
    try {
      const client = getHEOSClient(heosHost);
      await client.connect();
      setHeosConnected(true);

      // Get available players
      const players = await client.getPlayers();
      setHeosPlayers(players.payload || []);

      // Save host to settings
      await onSave({ heosHost });
      alert('Connected to HEOS!');
    } catch (error) {
      console.error('[HEOS] Connection failed:', error);
      alert('Failed to connect to HEOS: ' + error.message);
    }
  }

  async function handleHEOSDisconnect() {
    const client = getHEOSClient();
    client.disconnect();
    setHeosConnected(false);
    setHeosPlayers([]);
  }

  async function handleSaveScrollSpeed() {
    await onSave({ voicePromptsScrollSpeed: scrollSpeed });
    alert('Scroll speed saved!');
  }

  async function handleSaveHEOSPlayer() {
    await onSave({ heosPlayerId: selectedPlayer });
    alert('HEOS player saved!');
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>
        Performance & Cache
      </h2>

      {/* Tile Cache Management */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Map Tile Cache
        </h3>

        {cacheStats ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Total Tiles</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>{cacheStats.total?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Storage Used</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>
                  {cacheStats.sizeBytes ? `${(cacheStats.sizeBytes / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Chicago Tiles</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>{cacheStats.chicago || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Global Tiles</div>
                <div style={{ fontSize: '24px', fontWeight: 600 }}>{cacheStats.global || 0}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', color: '#9ca3af' }}>Loading cache stats...</div>
        )}

        <button
          onClick={handleClearCache}
          disabled={clearing}
          style={{
            padding: '12px 24px',
            background: clearing ? '#6b7280' : '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: clearing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          {clearing ? 'Clearing...' : 'Clear All Tiles'}
        </button>
      </section>

      {/* Voice Prompts Scroll Speed */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Voice Assistant Settings
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            Suggested Prompts Scroll Speed (seconds)
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="20"
              max="120"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              style={{
                width: '80px',
                padding: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSaveScrollSpeed}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Save
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Faster = {scrollSpeed < 40 ? 'Quick' : scrollSpeed < 70 ? 'Medium' : 'Slow'} scroll
          </div>
        </div>
      </section>

      {/* HEOS Integration */}
      <section>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          HEOS Speaker Integration
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            HEOS Device IP Address
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={heosHost}
              onChange={(e) => setHeosHost(e.target.value)}
              disabled={heosConnected}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
            {!heosConnected ? (
              <button
                onClick={handleHEOSConnect}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Connect
              </button>
            ) : (
              <button
                onClick={handleHEOSDisconnect}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Disconnect
              </button>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            {heosConnected ? '✓ Connected to HEOS' : 'Enter your HEOS speaker IP address or leave blank for auto-discovery'}
          </div>
        </div>

        {heosPlayers.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Select Default Player
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Select Player --</option>
                {heosPlayers.map(player => (
                  <option key={player.pid} value={player.pid}>
                    {player.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveHEOSPlayer}
                disabled={!selectedPlayer}
                style={{
                  padding: '10px 20px',
                  background: selectedPlayer ? '#3b82f6' : '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: selectedPlayer ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
