// src/components/admin/tabs/FeaturesTab.jsx
// Feature toggles, navigation, widgets, proximity detection, and ambient music

import { useAdminContext } from '../hooks/useAdminContext';
import { Card, FieldRow, Toggle, NumberInput, SectionGrid, s, btn, inp } from '../SharedComponents';

export default function FeaturesTab({
  proximityDetection,
  navSettings,
  setNavSettings,
  updateNavSettingsAPI,
  ProximityMonitor
}) {
  const { settings, updateSetting, setSettings } = useAdminContext();

  return (
    <SectionGrid>
      <Card title="Footer Navigation Items">
        <p style={s.muted}>
          Control which navigation items appear in the footer. If only one item is enabled, the footer will hide icons.
        </p>

        <FieldRow label="🎮 Games">
          <Toggle
            checked={navSettings.games_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                games_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="🎵 Jukebox">
          <Toggle
            checked={navSettings.jukebox_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                jukebox_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="🍕 Order Now">
          <Toggle
            checked={navSettings.order_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                order_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="🔎 Explore">
          <Toggle
            checked={navSettings.explore_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                explore_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="📸 Photo Booth">
          <Toggle
            checked={navSettings.photobooth_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                photobooth_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="🏛️ Then & Now">
          <Toggle
            checked={navSettings.thenandnow_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                thenandnow_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="💬 Leave Feedback">
          <Toggle
            checked={navSettings.comments_enabled}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                comments_enabled: v,
                recommendations_enabled: navSettings.recommendations_enabled || false,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

        <FieldRow label="🗺️ Local Recommendations">
          <Toggle
            checked={navSettings.recommendations_enabled || false}
            onChange={async (v) => {
              const updated = {
                ...navSettings,
                recommendations_enabled: v,
                default_navigation_app: navSettings.default_navigation_app || 'map',
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
          />
        </FieldRow>

      </Card>

      <Card title="Default Navigation App">
        <p style={s.muted}>
          Choose which app should be displayed when the kiosk first loads. The map is shown by default.
        </p>

        <FieldRow label="Initial App">
          <select
            value={navSettings.default_navigation_app || 'map'}
            onChange={async (e) => {
              const updated = {
                ...navSettings,
                default_navigation_app: e.target.value,
                recommendations_enabled: navSettings.recommendations_enabled || false,
              };
              setNavSettings(updated);
              await updateNavSettingsAPI(updated);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #2a2f37',
              background: '#16181d',
              color: '#e9eef3',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="map">📍 Map & Pin Placer</option>
            {navSettings.games_enabled && <option value="games">🎮 Games</option>}
            {navSettings.jukebox_enabled && <option value="jukebox">🎵 Jukebox</option>}
            {navSettings.order_enabled && <option value="order">🍕 Order Now</option>}
            {navSettings.photobooth_enabled && <option value="photobooth">📸 Photo Booth</option>}
            {navSettings.thenandnow_enabled && <option value="thenandnow">🏛️ Then & Now</option>}
            {navSettings.recommendations_enabled && <option value="recommendations">🗺️ Local Recommendations</option>}
          </select>
        </FieldRow>
      </Card>

      <Card title="Mobile Device Controls">
        <p style={s.muted}>
          Configure which features are visible on mobile devices
        </p>

        <FieldRow label="Show navigation menu">
          <Toggle
            checked={settings.showNavMenuOnMobile}
            onChange={(v) => updateSetting('showNavMenuOnMobile', v)}
          />
        </FieldRow>

        <FieldRow label="Show 'Now Playing' banner">
          <Toggle
            checked={settings.showNowPlayingOnMobile}
            onChange={(v) => updateSetting('showNowPlayingOnMobile', v)}
          />
        </FieldRow>

        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          These settings only affect mobile devices. Kiosk mode always shows all enabled features.
        </p>
      </Card>

      <Card title="Widgets">
        <p style={s.muted}>
          Enable or disable informational widgets
        </p>

        <FieldRow label="Weather Widget">
          <Toggle
            checked={settings.showWeatherWidget}
            onChange={(v) => updateSetting('showWeatherWidget', v)}
          />
        </FieldRow>

        {settings.showWeatherWidget && (
          <>
            <FieldRow label="Location Name">
              <input
                type="text"
                value={settings.weatherLocation}
                onChange={(e) => updateSetting('weatherLocation', e.target.value)}
                placeholder="Chicago, IL"
                style={s.input}
              />
            </FieldRow>

            <FieldRow label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={settings.weatherLat}
                onChange={(e) => updateSetting('weatherLat', parseFloat(e.target.value) || 0)}
                placeholder="41.8781"
                style={s.input}
              />
            </FieldRow>

            <FieldRow label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={settings.weatherLng}
                onChange={(e) => updateSetting('weatherLng', parseFloat(e.target.value) || 0)}
                placeholder="-87.6298"
                style={s.input}
              />
            </FieldRow>

            <FieldRow label="Timezone">
              <input
                type="text"
                value={settings.weatherTimezone}
                onChange={(e) => updateSetting('weatherTimezone', e.target.value)}
                placeholder="America/Chicago"
                style={s.input}
              />
            </FieldRow>
          </>
        )}

        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Weather widget shows current weather with hot dog recommendations. Configure location coordinates for accurate weather data.
        </p>
      </Card>

      <Card title="QR Code Widget">
        <FieldRow label="Show QR Code">
          <Toggle
            checked={settings.qrCodeEnabled}
            onChange={(v) => updateSetting('qrCodeEnabled', v)}
          />
        </FieldRow>

        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Display a QR code that patrons can scan to continue exploring on their mobile device. Only shown on kiosk/desktop view.
        </p>
      </Card>

      <Card title="🤖 Walkup Attractor (AI Voice Greeting)">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Greet customers approaching an idle kiosk with animated prompts and optional AI voice.
        </p>

        <FieldRow label="Enable Walkup Greeting">
          <Toggle
            checked={settings.walkupAttractorEnabled ?? true}
            onChange={(v) => updateSetting('walkupAttractorEnabled', v)}
          />
        </FieldRow>

        {settings.walkupAttractorEnabled && (
          <>
            <FieldRow label="Voice Prompts">
              <Toggle
                checked={settings.walkupAttractorVoiceEnabled ?? false}
                onChange={(v) => updateSetting('walkupAttractorVoiceEnabled', v)}
              />
            </FieldRow>

            <FieldRow label="Rotation Speed">
              <input
                type="number"
                min="2"
                max="10"
                value={settings.walkupAttractorRotationSeconds || 4}
                onChange={(e) => updateSetting('walkupAttractorRotationSeconds', parseInt(e.target.value) || 4)}
                style={{ ...s.input, width: '80px' }}
              />
              <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
            </FieldRow>

            <FieldRow label="Simulation Mode">
              <Toggle
                checked={settings.simulationMode ?? false}
                onChange={(v) => updateSetting('simulationMode', v)}
              />
            </FieldRow>
            <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
              Simulation mode forces the attractor to show immediately for browser demos (ignores idle timeout)
            </p>

            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                Custom Call-to-Action Prompts (Max 3)
              </h4>
              <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 11 }}>
                Create up to 3 custom prompts. Leave empty to use default context-aware prompts based on enabled features.
              </p>

              {((settings.walkupAttractorPrompts || []).length < 3) && (
                <button
                  type="button"
                  onClick={() => {
                    const prompts = settings.walkupAttractorPrompts || [];
                    setSettings(s => ({
                      ...s,
                      walkupAttractorPrompts: [
                        ...prompts,
                        { emoji: '👋', text: 'Welcome!', subtext: 'Tap to get started', voiceText: 'Welcome! Tap the screen to begin.' }
                      ]
                    }));
                  }}
                  style={{
                    ...s.button,
                    padding: '8px 16px',
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  + Add Custom Prompt
                </button>
              )}

              {(settings.walkupAttractorPrompts || []).map((prompt, index) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Prompt {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const prompts = [...(settings.walkupAttractorPrompts || [])];
                        prompts.splice(index, 1);
                        setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                      }}
                      style={{
                        ...s.button,
                        padding: '4px 12px',
                        fontSize: 11,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <FieldRow label="Emoji">
                    <input
                      type="text"
                      maxLength={2}
                      value={prompt.emoji || ''}
                      onChange={(e) => {
                        const prompts = [...(settings.walkupAttractorPrompts || [])];
                        prompts[index] = { ...prompts[index], emoji: e.target.value };
                        setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                      }}
                      placeholder="📍"
                      style={{ ...s.input, width: '60px', textAlign: 'center' }}
                    />
                  </FieldRow>

                  <FieldRow label="Main Text">
                    <input
                      type="text"
                      value={prompt.text || ''}
                      onChange={(e) => {
                        const prompts = [...(settings.walkupAttractorPrompts || [])];
                        prompts[index] = { ...prompts[index], text: e.target.value };
                        setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                      }}
                      placeholder="Leave Your Pin!"
                      style={s.input}
                    />
                  </FieldRow>

                  <FieldRow label="Subtext">
                    <input
                      type="text"
                      value={prompt.subtext || ''}
                      onChange={(e) => {
                        const prompts = [...(settings.walkupAttractorPrompts || [])];
                        prompts[index] = { ...prompts[index], subtext: e.target.value };
                        setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                      }}
                      placeholder="Mark your spot on our map"
                      style={s.input}
                    />
                  </FieldRow>

                  <FieldRow label="Voice Text">
                    <input
                      type="text"
                      value={prompt.voiceText || ''}
                      onChange={(e) => {
                        const prompts = [...(settings.walkupAttractorPrompts || [])];
                        prompts[index] = { ...prompts[index], voiceText: e.target.value };
                        setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                      }}
                      placeholder="Have you already placed a pin on our map?"
                      style={s.input}
                    />
                  </FieldRow>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
          The walkup attractor appears after {settings.idleAttractorSeconds || 60} seconds of inactivity and shows contextual prompts based on enabled features. Voice prompts use the browser's built-in speech synthesis.
        </p>
      </Card>

      <Card title="📷 Proximity Detection (Camera-Based Approach)">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Automatically detect when someone approaches the kiosk using the front-facing camera. Triggers walkup greeting when motion is detected.
        </p>

        <FieldRow label="Enable Proximity Detection">
          <Toggle
            checked={settings.proximityDetectionEnabled ?? false}
            onChange={(v) => updateSetting('proximityDetectionEnabled', v)}
          />
        </FieldRow>

        {settings.proximityDetectionEnabled && (
          <>
            <FieldRow label="Motion Sensitivity">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={settings.proximitySensitivity || 15}
                  onChange={(e) => updateSetting('proximitySensitivity', parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                  {settings.proximitySensitivity || 15} (lower = more sensitive)
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Proximity Threshold (Walkup)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={settings.proximityThreshold || 30}
                  onChange={(e) => updateSetting('proximityThreshold', parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                  {settings.proximityThreshold || 30} (higher = closer)
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Stare Threshold (Very Close)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={settings.stareThreshold || 40}
                  onChange={(e) => updateSetting('stareThreshold', parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                  {settings.stareThreshold || 40} (for employee clock-in)
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Stare Duration">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={settings.stareDurationMs || 3000}
                  onChange={(e) => updateSetting('stareDurationMs', parseInt(e.target.value) || 3000)}
                  style={{ ...s.input, width: '100px' }}
                />
                <span style={{ ...s.muted, fontSize: 12 }}>ms (how long to trigger)</span>
              </div>
            </FieldRow>

            <FieldRow label="Detection Interval">
              <input
                type="number"
                min="100"
                max="2000"
                step="100"
                value={settings.proximityDetectionInterval || 500}
                onChange={(e) => updateSetting('proximityDetectionInterval', parseInt(e.target.value) || 500)}
                style={{ ...s.input, width: '100px' }}
              />
              <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>ms</span>
            </FieldRow>

            <FieldRow label="Trigger Voice Greeting">
              <Toggle
                checked={settings.proximityTriggerVoice ?? true}
                onChange={(v) => updateSetting('proximityTriggerVoice', v)}
              />
            </FieldRow>

            <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
              ⚠️ Requires camera permission. Three detection tiers: <strong>Motion sensitivity</strong> (how much pixel change), <strong>Walkup</strong> (for greetings), <strong>Stare</strong> (very close + prolonged for employee features). Lower detection interval = faster response but more CPU usage.
            </p>
          </>
        )}

        <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
          Uses front-facing camera to detect when customers approach. Runs continuously during business hours when enabled. All processing happens locally in the browser - no external services required.
        </p>
      </Card>

      {/* Proximity Detection Visual Monitor */}
      {settings.proximityDetectionEnabled && proximityDetection && ProximityMonitor && (
        <Card title="📊 Proximity Detection Monitor">
          <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
            Real-time visual monitoring of camera feed and motion detection events. Use this to verify proximity detection is working correctly.
          </p>
          <ProximityMonitor
            enabled={proximityDetection.enabled}
            proximityLevel={proximityDetection.proximityLevel}
            isAmbientDetected={proximityDetection.isAmbientDetected}
            isPersonDetected={proximityDetection.isPersonDetected}
            isStaring={proximityDetection.isStaring}
            stareDuration={proximityDetection.stareDuration}
            cameraError={proximityDetection.cameraError}
          />
        </Card>
      )}

      <Card title="🎵 Ambient Music Auto-Play">
        <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
          Automatically play ambient music when motion is detected in the area (triggered at farther range than walkup greeting).
        </p>

        <FieldRow label="Enable Ambient Music">
          <Toggle
            checked={settings.ambientMusicEnabled ?? false}
            onChange={(v) => updateSetting('ambientMusicEnabled', v)}
          />
        </FieldRow>

        {settings.ambientMusicEnabled && (
          <>
            <FieldRow label="Detection Threshold">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={settings.ambientMusicThreshold || 15}
                  onChange={(e) => updateSetting('ambientMusicThreshold', parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ ...s.muted, fontSize: 12, minWidth: '80px' }}>
                  {settings.ambientMusicThreshold || 15} (lower = farther)
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Volume">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(settings.ambientMusicVolume || 0.5) * 100}
                  onChange={(e) => updateSetting('ambientMusicVolume', parseInt(e.target.value) / 100)}
                  style={{ flex: 1 }}
                />
                <span style={{ ...s.muted, fontSize: 12, minWidth: '40px' }}>
                  {Math.round((settings.ambientMusicVolume || 0.5) * 100)}%
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Fade In">
              <Toggle
                checked={settings.ambientMusicFadeIn ?? true}
                onChange={(v) => updateSetting('ambientMusicFadeIn', v)}
              />
            </FieldRow>

            <FieldRow label="Fade Out">
              <Toggle
                checked={settings.ambientMusicFadeOut ?? true}
                onChange={(v) => updateSetting('ambientMusicFadeOut', v)}
              />
            </FieldRow>

            <FieldRow label="Idle Timeout">
              <input
                type="number"
                min="10"
                max="120"
                value={settings.ambientMusicIdleTimeout || 30}
                onChange={(e) => updateSetting('ambientMusicIdleTimeout', parseInt(e.target.value) || 30)}
                style={{ ...s.input, width: '80px' }}
              />
              <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
            </FieldRow>

            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                Music Playlist
              </h4>
              <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 11 }}>
                Add local music files for ambient playback. Upload audio files to your server and provide the URLs here.
              </p>

              <button
                type="button"
                onClick={() => {
                  const playlist = settings.ambientMusicPlaylist || [];
                  setSettings(s => ({
                    ...s,
                    ambientMusicPlaylist: [
                      ...playlist,
                      { name: 'Track ' + (playlist.length + 1), url: '' }
                    ]
                  }));
                }}
                style={{
                  ...s.button,
                  padding: '8px 16px',
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                + Add Track
              </button>

              {(settings.ambientMusicPlaylist || []).map((track, index) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Track {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const playlist = [...(settings.ambientMusicPlaylist || [])];
                        playlist.splice(index, 1);
                        setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                      }}
                      style={{
                        ...s.button,
                        padding: '4px 12px',
                        fontSize: 11,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <FieldRow label="Name">
                    <input
                      type="text"
                      value={track.name || ''}
                      onChange={(e) => {
                        const playlist = [...(settings.ambientMusicPlaylist || [])];
                        playlist[index] = { ...playlist[index], name: e.target.value };
                        setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                      }}
                      placeholder="Track name"
                      style={s.input}
                    />
                  </FieldRow>

                  <FieldRow label="URL">
                    <input
                      type="text"
                      value={track.url || ''}
                      onChange={(e) => {
                        const playlist = [...(settings.ambientMusicPlaylist || [])];
                        playlist[index] = { ...playlist[index], url: e.target.value };
                        setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                      }}
                      placeholder="/audio/track.mp3 or https://..."
                      style={s.input}
                    />
                  </FieldRow>
                </div>
              ))}
            </div>

            <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
              💡 Tip: Ambient music threshold should be lower (farther range) than walkup greeting threshold for best experience. Music starts playing when people enter the area, then greeting appears when they get closer.
            </p>
          </>
        )}
      </Card>
    </SectionGrid>
  );
}
