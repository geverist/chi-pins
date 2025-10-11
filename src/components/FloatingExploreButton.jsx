// src/components/FloatingExploreButton.jsx
import { memo } from 'react';
import { btn3d } from '../lib/styles';

/**
 * Floating Explore Pins button - non-intrusive overlay on map
 * Positioned in bottom-right corner, adjusts for bottom notifications/bars
 */
function FloatingExploreButton({
  exploring,
  setExploring,
  setShowAttractor,
  setVoiceAssistantVisible,
  enabled = true,
  downloadingBarVisible = false,
  nowPlayingVisible = false,
  footerVisible = false,
  editorVisible = false,
}) {
  if (!enabled) return null;

  const handleToggle = () => {
    if (exploring) {
      setExploring(false);
      setVoiceAssistantVisible?.(false);
    } else {
      setExploring(true);
      setShowAttractor?.(false);
      setVoiceAssistantVisible?.(false);
    }
  };

  // Calculate bottom offset based on visible bars
  // Footer/Navigation bar varies by content, typically 70-90px
  // Downloading bar is ~56px (measured from OfflineMapDownloader)
  // Now Playing bar is ~48px
  // Editor form is ~240px (measured approximate when visible)
  let bottomOffset = 24; // Base offset
  if (editorVisible) {
    bottomOffset += 260; // Editor form height (includes padding and form elements)
  } else if (footerVisible) {
    bottomOffset += 90; // Increased to account for taller footer
  }
  if (downloadingBarVisible) bottomOffset += 60; // Match actual downloading bar height
  if (nowPlayingVisible) bottomOffset += 52; // Match actual now playing height

  return (
    <button
      onClick={handleToggle}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        right: 24,
        zIndex: 100, // Above map (0), below header (500)
        pointerEvents: 'auto',
        ...btn3d(exploring),
        padding: '14px 20px',
        fontSize: 16,
        fontWeight: 600,
        boxShadow: exploring
          ? 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        background: exploring
          ? 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        color: 'white',
        transition: 'all 0.2s ease',
      }}
      className="btn-kiosk"
      aria-label={exploring ? "Close explore mode" : "Explore community pins"}
      aria-pressed={exploring}
    >
      {exploring ? '✖ Close' : '🔎 Explore Current Pins'}
    </button>
  );
}

export default memo(FloatingExploreButton);
