import { useLayoutStack } from '../hooks/useLayoutStack';

export default function AttractorOverlay({ onDismiss }) {
  const { layout } = useLayoutStack();

  // Position below header, comments banner, and search bar
  // Search bar is now at headerHeight + commentsBannerHeight + 20px
  // Attractor needs additional space for search bar height (~48px) + small gap
  const topPadding = (layout.headerHeight || 0) + (layout.commentsBannerHeight || 0) + 75;

  return (
    <div
      className="attractor-overlay"
      onClick={onDismiss}
      style={{ paddingTop: `${topPadding}px` }}
    >
      <div
        className="cta glass"
        style={{
          position:'relative',
          padding:'14px 18px',
          borderRadius:12,
          textAlign:'center',
          maxWidth:'min(92vw, 520px)',
        }}
      >
        Tap the map to drop your pin
      </div>
    </div>
  )
}
