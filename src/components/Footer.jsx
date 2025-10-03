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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }} data-no-admin-tap>
            {navSettings.games_enabled && (
              <button
                onClick={() => setGamesOpen(true)}
                style={btn3d(false)}
                className="btn-kiosk"
                aria-label="Play Games"
              >
                {enabledCount === 1 ? 'Games' : '🎮 Games'}
              </button>
            )}
            {navSettings.jukebox_enabled && (
              <button
                onClick={() => setJukeboxOpen(true)}
                style={btn3d(false)}
                className="btn-kiosk"
                aria-label="Open Jukebox"
              >
                {enabledCount === 1 ? 'Jukebox' : '🎵 Jukebox'}
              </button>
            )}
            {navSettings.order_enabled && (
              <button
                onClick={() => setOrderMenuOpen(true)}
                style={btn3d(false)}
                className="btn-kiosk"
                aria-label="Order from Chicago Mike's"
              >
                {enabledCount === 1 ? 'Order Now' : '🍕 Order Now'}
              </button>
            )}
            {navSettings.explore_enabled && (
              !exploring ? (
                <button
                  onClick={() => {
                    setExploring(true);
                    setShowAttractor(false);
                  }}
                  className="btn-kiosk"
                  aria-label="Explore community pins"
                >
                  {enabledCount === 1 ? 'Explore pins' : '🔎 Explore pins'}
                </button>
              ) : (
                <button
                  onClick={() => setExploring(false)}
                  className="btn-kiosk"
                  aria-label="Close explore mode"
                >
                  ✖ Close explore
                </button>
              )
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
