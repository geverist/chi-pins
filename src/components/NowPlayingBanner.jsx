// src/components/NowPlayingBanner.jsx
import { useState, useEffect } from 'react';

export default function NowPlayingBanner({ currentTrack, isPlaying, lastPlayed, nextInQueue, scrollSpeed = 60, isMobile = false }) {
  const [animate, setAnimate] = useState(false);

  // Restart animation when track changes
  useEffect(() => {
    if (currentTrack || nextInQueue) {
      setAnimate(false);
      setTimeout(() => setAnimate(true), 50);
    }
  }, [currentTrack?.url, currentTrack?.title, nextInQueue?.url, nextInQueue?.title, isPlaying]);

  // Only show banner if there's currently playing music OR upcoming tracks
  // Don't show if only lastPlayed exists (no active music)
  if (!currentTrack && !nextInQueue) {
    console.log('NowPlayingBanner - Hidden: no currentTrack or nextInQueue');
    return null;
  }

  console.log('NowPlayingBanner - Showing:', {
    currentTrack: currentTrack?.title,
    nextInQueue: nextInQueue?.title,
    isPlaying
  });

  // Build the display text with clear visual separation
  const parts = [];
  const separator = ' '.repeat(50) + '●●●' + ' '.repeat(50); // Wide visual separator for clear text separation

  if (lastPlayed) {
    parts.push(`⏮ Last Played: ${lastPlayed.title}${lastPlayed.artist ? ` - ${lastPlayed.artist}` : ''}`);
  }

  if (currentTrack) {
    parts.push(`${isPlaying ? '♫' : '⏸'} NOW PLAYING: ${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ''}`);
  }

  if (nextInQueue) {
    parts.push(`⏭ Up Next: ${nextInQueue.title}${nextInQueue.artist ? ` - ${nextInQueue.artist}` : ''}`);
  }

  const displayText = parts.join(separator);

  // Duplicate text for seamless scrolling - fewer copies needed with slower speed
  const scrollContent = Array(6).fill(displayText).join(separator);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 72, // Above download bar which is 72px tall (DOWNLOADING_BAR_HEIGHT)
        left: 0,
        right: 0,
        height: isMobile ? 40 : 48,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        borderTop: '2px solid #a78bfa',
        zIndex: 250, // Above downloading bar (200), below voice assistant (300)
        overflow: 'hidden',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          height: '100%',
          animation: animate ? `scroll-left ${scrollSpeed}s linear infinite` : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '100%',
            color: '#fff',
            fontSize: isMobile ? 15 : 16,
            fontWeight: 600,
            letterSpacing: '0.3px',
          }}
        >
          {scrollContent}
        </span>
      </div>

      <style>{`
        @keyframes scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
