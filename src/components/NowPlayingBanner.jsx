// src/components/NowPlayingBanner.jsx
import { useState, useEffect } from 'react';

export default function NowPlayingBanner({ currentTrack, isPlaying, lastPlayed, nextInQueue, scrollSpeed = 30, isMobile = false }) {
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

  // Build the display text - only show active music info
  const parts = [];
  const separator = ' '.repeat(60) + '•' + ' '.repeat(60); // Much more spacing

  if (currentTrack) {
    parts.push(`${isPlaying ? '♫' : '⏸'} Now Playing: ${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ''}`);
  }

  if (nextInQueue) {
    parts.push(`Next: ${nextInQueue.title}${nextInQueue.artist ? ` - ${nextInQueue.artist}` : ''}`);
  }

  const displayText = parts.join(separator);

  // Duplicate text for seamless scrolling - need more copies for smooth loop
  const scrollContent = Array(20).fill(displayText).join(separator);

  return (
    <div
      style={{
        position: 'relative',
        left: 0,
        right: 0,
        height: 36,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        borderTop: '2px solid #a78bfa',
        zIndex: 100,
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
            fontSize: 14,
            fontWeight: 600,
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
