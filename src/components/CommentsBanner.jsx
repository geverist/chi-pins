// src/components/CommentsBanner.jsx
// Scrolling banner that displays random comments from pins

import { useState, useEffect, useMemo, useRef } from 'react';
import { filterComments, getRandomComments } from '../config/moderation';
import { useLayoutStack } from '../hooks/useLayoutStack';

export default function CommentsBanner({
  pins = [],
  customKeywords = [],
  scrollSpeed = 60, // seconds for full scroll
  maxComments = 20,
  refreshInterval = 120000, // 2 minutes - rotate comments
}) {
  const { updateHeight } = useLayoutStack();
  const [commentIndex, setCommentIndex] = useState(0);
  const containerRef = useRef(null);
  const [topPosition, setTopPosition] = useState(60); // Default fallback

  // Extract comments from pins and filter out prohibited content
  const allComments = useMemo(() => {
    const pinsWithComments = pins.filter(pin => pin.note && pin.note.trim().length > 0);
    const filtered = filterComments(pinsWithComments, customKeywords);
    return getRandomComments(filtered, maxComments);
  }, [pins, customKeywords, maxComments]);

  // Position below header using layout stack
  const { layout } = useLayoutStack();

  useEffect(() => {
    // Use layout stack header height for positioning
    if (layout.headerHeight) {
      setTopPosition(layout.headerHeight);
    }
  }, [layout.headerHeight]);

  // Report height to layout system (56px fixed height + update when visibility changes)
  useEffect(() => {
    const height = allComments.length > 0 ? 56 : 0;
    console.log('[CommentsBanner] Reporting height to layout:', height, 'comments:', allComments.length);
    updateHeight('commentsBannerHeight', height);
  }, [allComments.length, updateHeight]);

  // Refresh random comments periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCommentIndex(prev => (prev + 1) % 100); // Force re-render to shuffle
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (allComments.length === 0) {
    return null; // No comments to display
  }

  // Double the comments for seamless infinite scroll
  const displayComments = [...allComments, ...allComments];

  return (
    <div ref={containerRef} style={{...styles.container, top: `${topPosition}px`}}>
      <div style={styles.scrollWrapper}>
        <div style={styles.scrollContent(scrollSpeed)} key={commentIndex}>
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
    background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
    zIndex: 600, // Above header (500), voice assistant (300), below admin (9999)
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  scrollWrapper: {
    overflow: 'hidden',
    position: 'relative',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
  },
  scrollContent: (scrollSpeed) => ({
    display: 'flex',
    gap: '24px',
    padding: '0',
    animation: `scroll ${scrollSpeed}s linear infinite`,
    willChange: 'transform',
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
