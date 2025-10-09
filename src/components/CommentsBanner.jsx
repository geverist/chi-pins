// src/components/CommentsBanner.jsx
// High-performance scrolling banner using local-first storage

import { useEffect, useRef, useState } from 'react';
import { useLayoutStack } from '../hooks/useLayoutStack';
import { useLocalComments } from '../hooks/useLocalComments';

export default function CommentsBanner({
  customKeywords = [],
  scrollSpeed = 60, // seconds for full scroll
  maxComments = 20,
  refreshInterval = 120000, // 2 minutes - rotate comments
  enabled = true,
}) {
  const { updateHeight } = useLayoutStack();
  const containerRef = useRef(null);
  const [topPosition, setTopPosition] = useState(60); // Default fallback
  const [animationKey, setAnimationKey] = useState(0); // Force animation restart on comment changes

  // Use local-first comments (much faster!)
  const { comments: allComments, refresh } = useLocalComments({
    maxComments,
    customKeywords,
    enabled
  });

  // Position below header using layout stack
  const { layout } = useLayoutStack();

  useEffect(() => {
    // Position directly below header (no gap)
    if (layout.headerHeight) {
      const newTop = layout.headerHeight;
      console.log('[CommentsBanner] Positioning at top:', newTop, 'headerHeight:', layout.headerHeight);
      setTopPosition(newTop);
    }
  }, [layout.headerHeight]);

  // Measure and report actual height dynamically
  useEffect(() => {
    if (containerRef.current && allComments.length > 0) {
      const actualHeight = containerRef.current.offsetHeight;
      console.log('[CommentsBanner] Reporting actual height:', actualHeight, 'comments:', allComments.length);
      updateHeight('commentsBannerHeight', actualHeight);
    } else {
      updateHeight('commentsBannerHeight', 0);
    }
  }, [allComments.length, updateHeight]);

  // Refresh random comments periodically (no network, just shuffle)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      refresh(); // Shuffle existing comments without network call
      setAnimationKey(prev => prev + 1); // Restart animation
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refresh, enabled]);

  // Update animation key when comments change
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [allComments]);

  if (allComments.length === 0) {
    return null; // No comments to display
  }

  // Double the comments for seamless infinite scroll
  const displayComments = [...allComments, ...allComments];

  return (
    <div ref={containerRef} style={{...styles.container, top: `${topPosition}px`}}>
      <div style={styles.scrollWrapper}>
        <div style={styles.scrollContent(scrollSpeed)} key={animationKey}>
          {displayComments.map((comment, index) => (
            <div key={`${comment.id}-${index}`} style={styles.commentCard}>
              <div style={styles.commentText}>
                "{comment.note}"
              </div>
              {comment.name && (
                <div style={styles.commentAuthor}>
                  — {comment.name}
                </div>
              )}
              {comment.neighborhood && (
                <div style={styles.commentLocation}>
                  📍 {comment.neighborhood}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    // top set dynamically from layout stack
    left: 0,
    right: 0,
    // height auto-fits content
    background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
    zIndex: 400, // Below header (500) and footer (50), above voice assistant (300)
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    padding: '12px 0', // Add vertical padding for spacing
  },
  scrollWrapper: {
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  scrollContent: (scrollSpeed) => ({
    display: 'flex',
    gap: '24px',
    padding: '0',
    animation: `scroll ${scrollSpeed}s linear infinite`,
    willChange: 'transform',
    // GPU acceleration for smooth 60fps scrolling
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    perspective: 1000,
  }),
  commentCard: {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(8px)',
    padding: '8px 16px',
    borderRadius: '8px',
    minWidth: '300px',
    maxWidth: '400px',
    flexShrink: 0,
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  commentText: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.4,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  commentAuthor: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  commentLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '11px',
    marginTop: '2px',
  },
};

// Add CSS animation for smooth scrolling
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
`;
document.head.appendChild(styleSheet);
