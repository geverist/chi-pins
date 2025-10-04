// src/components/Footer.jsx
import Editor from './Editor';
import { btn3d } from '../lib/styles';

export default function Footer({
  isMobile,
  draft,
  exploring,
  mapMode,
  mapReady,
  navSettings,
  enabledCount,
  setGamesOpen,
  setJukeboxOpen,
  setOrderMenuOpen,
  setPhotoBoothOpen,
  setThenAndNowOpen,
  setExploring,
  setShowAttractor,
  handleFooterClick,
  handleFooterTouch,
  // Editor props
  slug,
  form,
  setForm,
  hotdogSuggestions,
  cancelEditing,
  setShareOpen,
  adminSettings,
}) {
  if (isMobile) return null;

  return (
    <footer
      style={{ padding: '10px 14px' }}
      onClick={handleFooterClick}
      onTouchStart={handleFooterTouch}
      aria-label="Footer controls"
    >
      {!draft ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Top row: Games, Jukebox, Order Now, Photo Booth, Then & Now */}
          {(navSettings.games_enabled || navSettings.jukebox_enabled || navSettings.order_enabled || navSettings.photobooth_enabled || navSettings.thenandnow_enabled) && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
              data-no-admin-tap
            >
              {navSettings.games_enabled && (
                <button
                  onClick={() => setGamesOpen(true)}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Play Games"
                >
                  🎮 Games
                </button>
              )}
              {navSettings.jukebox_enabled && (
                <button
                  onClick={() => setJukeboxOpen(true)}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Open Jukebox"
                >
                  🎵 Jukebox
                </button>
              )}
              {navSettings.order_enabled && (
                <button
                  onClick={() => setOrderMenuOpen(true)}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Order from Chicago Mike's"
                >
                  🍕 Order Now
                </button>
              )}
              {navSettings.photobooth_enabled && (
                <button
                  onClick={() => setPhotoBoothOpen(true)}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Photo Booth"
                >
                  📸 Photo Booth
                </button>
              )}
              {navSettings.thenandnow_enabled && (
                <button
                  onClick={() => setThenAndNowOpen(true)}
                  style={btn3d(false)}
                  className="btn-kiosk"
                  aria-label="Then & Now Photos"
                >
                  🏛️ Then & Now
                </button>
              )}
            </div>
          )}

          {/* Bottom row: Hint text and Explore pins */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              minHeight: 44,
            }}
          >
            <div
              className="hint"
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: '#a7b0b8',
                pointerEvents: 'none',
                width: '100%',
              }}
            >
              {exploring
                ? 'Click any pin to see details.'
                : mapMode === 'global'
                ? 'Click the map to place your pin anywhere in the world.'
                : mapReady
                ? 'Tap the map to place your pin, then start dragging the pin to fine-tune.'
                : 'Loading map, please wait...'}
            </div>
            {navSettings.explore_enabled && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }} data-no-admin-tap>
                {!exploring ? (
                  <button
                    onClick={() => {
                      setExploring(true);
                      setShowAttractor(false);
                    }}
                    className="btn-kiosk"
                    aria-label="Explore community pins"
                  >
                    🔎 Explore pins
                  </button>
                ) : (
                  <button
                    onClick={() => setExploring(false)}
                    className="btn-kiosk"
                    aria-label="Close explore mode"
                  >
                    ✖ Close explore
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Editor
          mapMode={mapMode}
          slug={slug}
          form={form}
          setForm={setForm}
          hotdogSuggestions={hotdogSuggestions}
          onCancel={cancelEditing}
          onOpenShare={() => setShareOpen(true)}
          photoBackgroundsEnabled={adminSettings.photoBackgroundsEnabled}
          loyaltyEnabled={adminSettings.loyaltyEnabled}
        />
      )}
    </footer>
  );
}
