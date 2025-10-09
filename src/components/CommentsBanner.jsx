// src/components/CommentsBanner.jsx
// High-performance scrolling banner using react-fast-marquee
// Uses hardware acceleration and requestAnimationFrame for smooth 60fps scrolling

import { useEffect, useRef, useState } from 'react';
import Marquee from 'react-fast-marquee';
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
  // Wait for Marquee to render, then measure
  useEffect(() => {
    if (containerRef.current && allComments.length > 0) {
      // Use requestAnimationFrame to ensure Marquee has rendered
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const actualHeight = containerRef.current.offsetHeight;
          console.log('[CommentsBanner] Reporting actual height:', actualHeight, 'comments:', allComments.length);
          updateHeight('commentsBannerHeight', actualHeight);
        }
      });
    } else {
      updateHeight('commentsBannerHeight', 0);
    }
  }, [allComments.length, updateHeight]);

  // Refresh random comments periodically (no network, just shuffle)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      refresh(); // Shuffle existing comments without network call
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refresh, enabled]);

  if (allComments.length === 0) {
    return null; // No comments to display
  }

  // Calculate speed in pixels per second for marquee
  // Assuming average card width ~350px, gap 24px = ~374px per comment
  // Total width = comments.length * 374px
  // Speed = totalWidth / scrollSpeed seconds
  const avgCardWidth = 374; // 350px card + 24px gap
  const totalWidth = allComments.length * avgCardWidth;
  const speed = totalWidth / scrollSpeed; // pixels per second

  return (
    <div ref={containerRef} style={{...styles.container, top: `${topPosition}px`}}>
      <Marquee
        speed={speed}
        gradient={false}
        pauseOnHover={false}
        pauseOnClick={false}
        style={styles.marquee}
      >
        {allComments.map((comment, index) => (
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
      </Marquee>
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
  marquee: {
    display: 'flex',
    alignItems: 'center',
  },
  commentCard: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    borderRadius: '8px',
    minWidth: '300px',
    maxWidth: '400px',
    marginRight: '24px', // Gap between cards
    border: '1px solid rgba(255, 255, 255, 0.25)',
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
