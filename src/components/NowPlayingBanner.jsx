// src/components/NowPlayingBanner.jsx
// High-performance scrolling banner using react-fast-marquee
import Marquee from 'react-fast-marquee';
import { useLayoutStack } from '../hooks/useLayoutStack';

export default function NowPlayingBanner({ currentTrack, isPlaying, lastPlayed, nextInQueue, scrollSpeed = 60, isMobile = false, downloadingBarVisible = false }) {
  const { layout } = useLayoutStack();

  // Only show banner if there's currently playing music OR upcoming tracks
  // Don't show if only lastPlayed exists (no active music)
  // Also hide on mobile devices
  if (!currentTrack && !nextInQueue) {
    console.log('NowPlayingBanner - Hidden: no currentTrack or nextInQueue');
    return null;
  }

  if (isMobile) {
    console.log('NowPlayingBanner - Hidden: on mobile device');
    return null;
  }

  console.log('NowPlayingBanner - Showing:', {
    currentTrack: currentTrack?.title,
    nextInQueue: nextInQueue?.title,
    isPlaying
  });

  // Build the display items with clear visual separation
  const items = [];

  if (lastPlayed) {
    items.push({
      icon: '⏮',
      label: 'Last Played',
      title: lastPlayed.title,
      artist: lastPlayed.artist
    });
  }

  if (currentTrack) {
    items.push({
      icon: isPlaying ? '♫' : '⏸',
      label: 'NOW PLAYING',
      title: currentTrack.title,
      artist: currentTrack.artist
    });
  }

  if (nextInQueue) {
    items.push({
      icon: '⏭',
      label: 'Up Next',
      title: nextInQueue.title,
      artist: nextInQueue.artist
    });
  }

  // Position at bottom (0) or above downloading bar using actual measured height
  const downloadingHeight = layout.downloadingBarHeight || 0;
  const bottomPosition = downloadingHeight;

  console.log('[NowPlayingBanner] Positioned above downloading bar:', JSON.stringify({
    bottomPosition,
    downloadingHeight,
    downloadingBarVisible
  }));

  // Calculate speed - assuming average item width ~400px
  const avgItemWidth = 450; // 400px content + 50px gap
  const totalWidth = items.length * avgItemWidth;
  const speed = totalWidth / scrollSpeed; // pixels per second

  return (
    <div
      style={{
        position: 'fixed',
        bottom: bottomPosition,
        left: 0,
        right: 0,
        height: isMobile ? 40 : 48,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        borderTop: '2px solid #a78bfa',
        zIndex: 250, // Above downloading bar (200), below voice assistant (300)
        overflow: 'hidden',
        transition: 'bottom 0.3s ease',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <Marquee
        speed={speed}
        gradient={false}
        pauseOnHover={false}
        pauseOnClick={false}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: '50px', // Gap between items
              color: '#fff',
              fontSize: isMobile ? 15 : 16,
              fontWeight: 600,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ marginRight: '8px' }}>{item.icon}</span>
            <span style={{ marginRight: '8px', textTransform: 'uppercase' }}>{item.label}:</span>
            <span>{item.title}</span>
            {item.artist && <span style={{ marginLeft: '8px', opacity: 0.9 }}>- {item.artist}</span>}
          </div>
        ))}
      </Marquee>
    </div>
  );
}
