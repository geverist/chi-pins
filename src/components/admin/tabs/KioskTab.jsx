// src/components/admin/tabs/KioskTab.jsx
// Kiosk & idle settings, business hours, security, and feature configurations

import { useAdminContext } from '../hooks/useAdminContext';
import { Card, FieldRow, Toggle, NumberInput, SectionGrid, s } from '../SharedComponents';

export default function KioskTab({ isLayoutEditMode, setLayoutEditMode, onClose }) {
  const { settings, updateSetting } = useAdminContext();

  return (
    <SectionGrid>
      <Card title="Idle / Kiosk">
        <FieldRow label="🐛 Show Debug Panel (Visual State Indicator)">
          <Toggle
            checked={settings.proximityDebugModeEnabled ?? false}
            onChange={(v) => updateSetting('proximityDebugModeEnabled', v)}
          />
          <span style={{ ...s.muted, fontSize: 11, marginLeft: 8 }}>
            Display real-time proximity tracking overlay
          </span>
        </FieldRow>

        <FieldRow label="Idle attractor (seconds)">
          <NumberInput
            value={settings.idleAttractorSeconds}
            min={10}
            max={600}
            onChange={(v) => updateSetting('idleAttractorSeconds', v)}
          />
        </FieldRow>
        <FieldRow label="Auto-start kiosk on load">
          <Toggle
            checked={settings.kioskAutoStart}
            onChange={(v) => updateSetting('kioskAutoStart', v)}
          />
        </FieldRow>
        <FieldRow label="Show 'pinch to zoom' hint">
          <Toggle
            checked={settings.attractorHintEnabled}
            onChange={(v) => updateSetting('attractorHintEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Enable confetti screensaver">
          <Toggle
            checked={settings.confettiScreensaverEnabled}
            onChange={(v) => updateSetting('confettiScreensaverEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Database sync interval (minutes)">
          <NumberInput
            value={settings.databaseSyncMinutes}
            min={5}
            max={1440}
            onChange={(v) => updateSetting('databaseSyncMinutes', v)}
          />
        </FieldRow>
      </Card>

      <Card title="Business Hours">
        <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
          Automatically show a "Closed" overlay outside business hours. Helps save battery and manage customer expectations.
        </p>
        <FieldRow label="Enable business hours">
          <Toggle
            checked={settings.businessHoursEnabled}
            onChange={(v) => updateSetting('businessHoursEnabled', v)}
          />
        </FieldRow>

        {settings.businessHoursEnabled && (
          <>
            <FieldRow label="Opening time">
              <input
                type="time"
                value={settings.businessHoursOpen || '09:00'}
                onChange={(e) => updateSetting('businessHoursOpen', e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 14,
                  width: '100%',
                }}
              />
            </FieldRow>

            <FieldRow label="Closing time">
              <input
                type="time"
                value={settings.businessHoursClose || '21:00'}
                onChange={(e) => updateSetting('businessHoursClose', e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 14,
                  width: '100%',
                }}
              />
            </FieldRow>

            <FieldRow label="Days open">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                  const isSelected = (settings.businessHoursDays || [1, 2, 3, 4, 5]).includes(idx);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const current = settings.businessHoursDays || [1, 2, 3, 4, 5];
                        const updated = isSelected
                          ? current.filter(d => d !== idx)
                          : [...current, idx].sort();
                        updateSetting('businessHoursDays', updated);
                      }}
                      style={{
                        padding: '8px 16px',
                        background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </FieldRow>

            <FieldRow label="Closed message">
              <textarea
                value={settings.businessHoursClosedMessage || "We're currently closed. Please come back during business hours!"}
                onChange={(e) => updateSetting('businessHoursClosedMessage', e.target.value)}
                rows={3}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 14,
                  width: '100%',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </FieldRow>

            <p style={{ ...s.muted, margin: '16px 0 0', fontSize: 11 }}>
              💡 <strong>Hardware Wake-Up:</strong> This feature can't physically turn on a sleeping device.
              For automatic screen on/off, use <strong>Fully Kiosk Browser</strong> which has built-in scheduling,
              or enable "Stay Awake" in Android Developer Options.
            </p>
          </>
        )}
      </Card>

      <Card title="Feature Idle Timeouts">
        <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
          Automatically close features after inactivity and return to map view
        </p>
        <FieldRow label="Games timeout (seconds)">
          <NumberInput
            value={settings.gamesIdleTimeout}
            min={30}
            max={600}
            onChange={(v) => updateSetting('gamesIdleTimeout', v)}
          />
        </FieldRow>
        <FieldRow label="Jukebox timeout (seconds)">
          <NumberInput
            value={settings.jukeboxIdleTimeout}
            min={30}
            max={600}
            onChange={(v) => updateSetting('jukeboxIdleTimeout', v)}
          />
        </FieldRow>
        <FieldRow label="Ordering timeout (seconds)">
          <NumberInput
            value={settings.orderingIdleTimeout}
            min={60}
            max={900}
            onChange={(v) => updateSetting('orderingIdleTimeout', v)}
          />
        </FieldRow>
        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Set to 0 to disable timeout for a feature
        </p>
      </Card>

      <Card title="Security PIN Codes">
        <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
          Set 4-digit PIN codes for admin panel access and kiosk exit
        </p>
        <FieldRow label="Admin Panel PIN">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={settings.adminPanelPin || '1111'}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              updateSetting('adminPanelPin', value);
            }}
            placeholder="1111"
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#0f1115',
              border: '1px solid #2a2f37',
              borderRadius: 6,
              color: '#f3f5f7',
              fontSize: 16,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              textAlign: 'center',
            }}
          />
        </FieldRow>
        <FieldRow label="Kiosk Exit PIN">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={settings.kioskExitPin || '1111'}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
              updateSetting('kioskExitPin', value);
            }}
            placeholder="1111"
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#0f1115',
              border: '1px solid #2a2f37',
              borderRadius: 6,
              color: '#f3f5f7',
              fontSize: 16,
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              textAlign: 'center',
            }}
          />
        </FieldRow>
        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          ⚠️ Must be exactly 4 digits. Press 'k' 3x to trigger kiosk exit prompt.
        </p>

        <FieldRow label="Admin panel idle timeout (seconds)">
          <input
            type="number"
            min={10}
            max={600}
            value={settings.adminPanelIdleTimeout || 60}
            onChange={(e) => {
              const value = Math.max(10, Math.min(600, parseInt(e.target.value) || 60));
              updateSetting('adminPanelIdleTimeout', value);
            }}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#0f1115',
              border: '1px solid #2a2f37',
              borderRadius: 6,
              color: '#f3f5f7',
              fontSize: 16,
            }}
          />
        </FieldRow>
        <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
          Auto-closes admin panel after inactivity. Default: 60 seconds.
        </p>
      </Card>

      <Card title="Layout Edit Mode">
        <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
          Reposition widgets (QR Code, Weather, Explore button) by dragging them to snap positions
        </p>
        <button
          onClick={() => {
            setLayoutEditMode(!isLayoutEditMode);
            onClose(); // Close admin panel so user can see and edit the widgets
          }}
          style={{
            padding: '12px 20px',
            background: isLayoutEditMode ? '#f59e0b' : '#3b82f6',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isLayoutEditMode ? '✅ Exit Layout Edit Mode' : '🎨 Enter Layout Edit Mode'}
        </button>

        {/* Grid Configuration */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <FieldRow label="Grid Layout Type">
            <select
              value={settings.layoutGridType || '2x3'}
              onChange={(e) => updateSetting('layoutGridType', e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                color: 'white',
                fontSize: 14,
                width: '100%',
                cursor: 'pointer',
              }}
            >
              <option value="2x2">2×2 Grid (4 Quadrants)</option>
              <option value="2x3">2×3 Grid (6 Sections)</option>
              <option value="3-2-3">3-2-3 Grid (8 Sections)</option>
            </select>
          </FieldRow>
          <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
            {settings.layoutGridType === '2x2' && '4 equal quadrants'}
            {settings.layoutGridType === '2x3' && '2 rows × 3 columns'}
            {settings.layoutGridType === '3-2-3' && '3 left, 2 center, 3 right sections'}
          </p>

          <FieldRow label="Vertical Snap Increment (px)">
            <NumberInput
              value={settings.layoutVerticalIncrement || 10}
              min={5}
              max={50}
              onChange={(v) => updateSetting('layoutVerticalIncrement', v)}
            />
          </FieldRow>
          <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
            Widgets snap to this pixel increment when dragging vertically
          </p>
        </div>

        <p style={{ ...s.muted, margin: '16px 0 0', fontSize: 11 }}>
          • Drag widgets to grid cells, they snap automatically<br />
          • Collision detection prevents overlapping widgets<br />
          • Changes save automatically when you release
        </p>
      </Card>

      <Card title="Data window">
        <FieldRow label="Show pins from last (months)">
          <NumberInput
            value={settings.showPinsSinceMonths}
            min={1}
            max={999}
            onChange={(v) => updateSetting('showPinsSinceMonths', v)}
          />
        </FieldRow>
        <p style={{ ...s.muted, margin: 0, fontSize: 12 }}>
          Set to 999 to show all pins regardless of age
        </p>
      </Card>

      <Card title="Features">
        <FieldRow label="Loyalty phone in editor">
          <Toggle
            checked={settings.loyaltyEnabled}
            onChange={(v) => updateSetting('loyaltyEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Photo backgrounds">
          <Toggle
            checked={settings.photoBackgroundsEnabled}
            onChange={(v) => updateSetting('photoBackgroundsEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Facebook share option">
          <Toggle
            checked={settings.facebookShareEnabled}
            onChange={(v) => updateSetting('facebookShareEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="News ticker">
          <Toggle
            checked={settings.newsTickerEnabled}
            onChange={(v) => updateSetting('newsTickerEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Fun facts on map click">
          <Toggle
            checked={settings.funFactsEnabled}
            onChange={(v) => updateSetting('funFactsEnabled', v)}
          />
        </FieldRow>
        <FieldRow label="Pin placement notifications">
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={(v) => updateSetting('notificationsEnabled', v)}
          />
        </FieldRow>
      </Card>

      {settings.funFactsEnabled && (
        <Card title="Fun Facts Settings">
          <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
            Configure how long fun facts display when clicking on the Chicago map
          </p>
          <FieldRow label="Display duration (seconds)">
            <NumberInput
              value={settings.funFactDurationSeconds}
              min={5}
              max={60}
              step={5}
              onChange={(v) => updateSetting('funFactDurationSeconds', v)}
            />
          </FieldRow>
          <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
            Fun facts appear as a toast notification when users click on locations in Chicago
          </p>
        </Card>
      )}


      {settings.newsTickerEnabled && (
        <Card title="News Ticker Settings">
          <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
            Configure the RSS feed URL and scroll speeds for the news ticker
          </p>
          <FieldRow label="RSS Feed URL">
            <input
              type="url"
              value={settings.newsTickerRssUrl || ''}
              onChange={(e) => updateSetting('newsTickerRssUrl', e.target.value)}
              placeholder="https://news.google.com/rss/search?q=chicago"
              style={{
                ...s.input,
                width: '100%',
              }}
            />
          </FieldRow>
          <p style={{ ...s.muted, margin: '8px 0 0 0', fontSize: 11 }}>
            Only Chicago news sources and major outlets are permitted
          </p>

          <FieldRow label="Scroll Speed (Kiosk)" style={{ marginTop: 16 }}>
            <input
              type="number"
              min="5"
              max="120"
              value={settings.newsTickerScrollSpeedKiosk || 30}
              onChange={(e) => updateSetting('newsTickerScrollSpeedKiosk', parseInt(e.target.value) || 30)}
              style={{ ...s.input, width: '80px' }}
            />
            <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
          </FieldRow>

          <FieldRow label="Scroll Speed (Mobile)">
            <input
              type="number"
              min="5"
              max="120"
              value={settings.newsTickerScrollSpeedMobile || 20}
              onChange={(e) => updateSetting('newsTickerScrollSpeedMobile', parseInt(e.target.value) || 20)}
              style={{ ...s.input, width: '80px' }}
            />
            <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
          </FieldRow>
          <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
            Time for banner to complete one full scroll
          </p>
        </Card>
      )}

      <FieldRow label="Enable Comments Banner">
        <Toggle
          checked={settings.commentsBannerEnabled}
          onChange={(v) => updateSetting('commentsBannerEnabled', v)}
        />
      </FieldRow>

      {settings.commentsBannerEnabled && (
        <Card title="Comments Banner Settings">
          <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
            Display random comments from pins in a scrolling banner. Configure moderation keywords.
          </p>

          <FieldRow label="Max Comments">
            <input
              type="number"
              min="10"
              max="50"
              value={settings.commentsBannerMaxComments || 20}
              onChange={(e) => updateSetting('commentsBannerMaxComments', parseInt(e.target.value) || 20)}
              style={{ ...s.input, width: '80px' }}
            />
            <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>comments</span>
          </FieldRow>

          <FieldRow label="Scroll Speed">
            <input
              type="number"
              min="10"
              max="120"
              value={settings.commentsBannerScrollSpeed || 60}
              onChange={(e) => updateSetting('commentsBannerScrollSpeed', parseInt(e.target.value) || 60)}
              style={{ ...s.input, width: '80px' }}
            />
            <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
          </FieldRow>

          <FieldRow label="Refresh Interval">
            <input
              type="number"
              min="30"
              max="600"
              value={Math.round((settings.commentsBannerRefreshInterval || 120000) / 1000)}
              onChange={(e) => updateSetting('commentsBannerRefreshInterval', (parseInt(e.target.value) || 120) * 1000)}
              style={{ ...s.input, width: '80px' }}
            />
            <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
          </FieldRow>

          <FieldRow label="Prohibited Keywords" style={{ marginTop: 16, alignItems: 'flex-start' }}>
            <textarea
              value={(settings.commentsBannerProhibitedKeywords || []).join(', ')}
              onChange={(e) => {
                const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                updateSetting('commentsBannerProhibitedKeywords', keywords);
              }}
              placeholder="spam, inappropriate, offensive"
              style={{
                ...s.input,
                width: '100%',
                minHeight: '60px',
                resize: 'vertical',
              }}
            />
          </FieldRow>
          <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
            Comma-separated list. Comments containing these words will be filtered out.
          </p>
        </Card>
      )}

      <Card title="Map constants">
        <FieldRow label="Initial radius (miles)">
          <NumberInput
            value={settings.initialRadiusMiles}
            min={0.1}
            max={10}
            onChange={(v) => updateSetting('initialRadiusMiles', v)}
          />
        </FieldRow>
        <FieldRow label="Chicago min zoom">
          <NumberInput
            value={settings.chiMinZoom}
            min={2}
            max={15}
            onChange={(v) => updateSetting('chiMinZoom', v)}
          />
        </FieldRow>
        <p style={{ ...s.muted, margin: 0, fontSize: 12 }}>
          Advanced: These control map behavior constants
        </p>
      </Card>
    </SectionGrid>
  );
}
