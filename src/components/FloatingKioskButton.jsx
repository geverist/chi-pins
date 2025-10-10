// src/components/FloatingKioskButton.jsx
import { memo } from 'react';
import { btn3d } from '../lib/styles';

/**
 * Floating Kiosk Mode Preview button - allows mobile users to preview kiosk mode
 * Positioned in bottom-left corner, only shows on mobile devices
 */
function FloatingKioskButton({
  isMobile,
  isFullscreen,
  onEnterKiosk,
  downloadingBarVisible = false,
  nowPlayingVisible = false,
  footerVisible = false,
}) {
  // Only show on mobile when not already in fullscreen
  if (!isMobile || isFullscreen) return null;

  // Calculate bottom offset based on visible bars (same logic as FloatingExploreButton)
  let bottomOffset = 24; // Base offset
  if (footerVisible) bottomOffset += 90;
  if (downloadingBarVisible) bottomOffset += 60;
  if (nowPlayingVisible) bottomOffset += 52;

  return (
    <button
      onClick={onEnterKiosk}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: 24, // Left side to avoid conflict with explore button on right
        zIndex: 100, // Above map (0), below header (500)
        pointerEvents: 'auto',
        ...btn3d(false),
        padding: '14px 20px',
        fontSize: 16,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Orange/amber gradient
        border: 'none',
        color: 'white',
        transition: 'all 0.2s ease',
      }}
      className="btn-kiosk"
      aria-label="Preview kiosk mode"
    >
      🖥️ Preview Kiosk Mode
    </button>
  );
}

export default memo(FloatingKioskButton);
