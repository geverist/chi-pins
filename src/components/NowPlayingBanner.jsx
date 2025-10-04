// src/components/NowPlayingBanner.jsx
import { useState, useEffect } from 'react';

export default function NowPlayingBanner({ currentTrack, isPlaying }) {
  const [animate, setAnimate] = useState(false);

  // Restart animation when track changes
  useEffect(() => {
    if (currentTrack) {
      setAnimate(false);
      setTimeout(() => setAnimate(true), 50);
    }
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  const displayText = `${isPlaying ? '♫' : '⏸'} Now Playing: ${currentTrack.title}${currentTrack.artist ? ` - ${currentTrack.artist}` : ''}`;

  // Duplicate text for seamless scrolling
  const scrollContent = Array(10).fill(displayText).join('   •   ');

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 60, // Above footer (assuming footer is 60px)
        left: 0,
        right: 0,
        height: 36,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        borderTop: '2px solid #a78bfa',
        borderBottom: '2px solid #a78bfa',
        zIndex: 9998,
        overflow: 'hidden',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          animation: animate ? 'scroll-left 30s linear infinite' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            paddingLeft: '100vw', // Start off-screen to the right
          }}
        >
          {scrollContent}
        </span>
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
