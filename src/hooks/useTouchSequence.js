import { useEffect, useRef } from 'react';

/**
 * Custom hook for detecting touch sequences
 * @param {Function} onSequenceComplete - Callback when sequence is completed
 * @param {Object} options - Configuration options
 * @param {string} options.sequence - Sequence type: 'corners', 'quadrants', 'triple-tap'
 * @param {number} options.timeoutMs - Time window for completing sequence
 * @param {boolean} options.enabled - Whether the sequence detection is enabled
 */
export function useTouchSequence(onSequenceComplete, options = {}) {
  const {
    sequence = 'corners',
    timeoutMs = 3000,
    enabled = true
  } = options;

  const touchesRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouch = (e) => {
      // Only track single-finger touches
      if (e.touches && e.touches.length > 1) return;

      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      const width = window.innerWidth;
      const height = window.innerHeight;

      const touchData = {
        x,
        y,
        timestamp: Date.now(),
        quadrant: getQuadrant(x, y, width, height),
        corner: getCorner(x, y, width, height)
      };

      touchesRef.current.push(touchData);

      // Clear old touches outside timeout window
      const now = Date.now();
      touchesRef.current = touchesRef.current.filter(
        t => now - t.timestamp < timeoutMs
      );

      // Check if sequence is complete
      if (checkSequence(touchesRef.current, sequence)) {
        clearTimeout(timerRef.current);
        touchesRef.current = [];
        onSequenceComplete();
      } else {
        // Reset timer
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          touchesRef.current = [];
        }, timeoutMs);
      }
    };

    window.addEventListener('touchstart', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      clearTimeout(timerRef.current);
    };
  }, [enabled, sequence, timeoutMs, onSequenceComplete]);
}

function getQuadrant(x, y, width, height) {
  const isLeft = x < width / 2;
  const isTop = y < height / 2;

  if (isTop && isLeft) return 'top-left';
  if (isTop && !isLeft) return 'top-right';
  if (!isTop && isLeft) return 'bottom-left';
  return 'bottom-right';
}

function getCorner(x, y, width, height) {
  const cornerSize = 100; // 100px corner zones

  const isTopLeft = x < cornerSize && y < cornerSize;
  const isTopRight = x > width - cornerSize && y < cornerSize;
  const isBottomLeft = x < cornerSize && y > height - cornerSize;
  const isBottomRight = x > width - cornerSize && y > height - cornerSize;

  if (isTopLeft) return 'top-left';
  if (isTopRight) return 'top-right';
  if (isBottomLeft) return 'bottom-left';
  if (isBottomRight) return 'bottom-right';
  return null;
}

function checkSequence(touches, sequenceType) {
  if (touches.length < 1) return false;

  switch (sequenceType) {
    case 'corners':
      // Touch all four corners in any order
      return checkCornersSequence(touches);

    case 'corners-clockwise':
      // Touch corners clockwise: top-left → top-right → bottom-right → bottom-left
      return checkCornersClockwise(touches);

    case 'quadrants':
      // Touch all four quadrants in any order
      return checkQuadrantsSequence(touches);

    case 'triple-tap':
      // Three taps in same area quickly
      return checkTripleTap(touches);

    case 'double-tap-corners':
      // Double tap on two opposite corners
      return checkDoubleTapCorners(touches);

    default:
      return false;
  }
}

function checkCornersSequence(touches) {
  const corners = touches
    .map(t => t.corner)
    .filter(c => c !== null);

  const uniqueCorners = new Set(corners);
  return uniqueCorners.size === 4;
}

function checkCornersClockwise(touches) {
  const expectedSequence = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const corners = touches
    .map(t => t.corner)
    .filter(c => c !== null);

  if (corners.length < 4) return false;

  // Check last 4 corners match the clockwise sequence
  const lastFour = corners.slice(-4);
  return expectedSequence.every((corner, i) => lastFour[i] === corner);
}

function checkQuadrantsSequence(touches) {
  const quadrants = touches.map(t => t.quadrant);
  const uniqueQuadrants = new Set(quadrants);
  return uniqueQuadrants.size === 4;
}

function checkTripleTap(touches) {
  if (touches.length < 3) return false;

  const lastThree = touches.slice(-3);
  const firstTouch = lastThree[0];

  // Check if all three taps are within 50px of each other
  return lastThree.every(touch => {
    const dx = touch.x - firstTouch.x;
    const dy = touch.y - firstTouch.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 50;
  });
}

function checkDoubleTapCorners(touches) {
  const corners = touches
    .map(t => t.corner)
    .filter(c => c !== null);

  if (corners.length < 2) return false;

  const lastTwo = corners.slice(-2);

  // Check if taps are on opposite corners
  const opposites = [
    ['top-left', 'bottom-right'],
    ['top-right', 'bottom-left'],
    ['bottom-right', 'top-left'],
    ['bottom-left', 'top-right']
  ];

  return opposites.some(([first, second]) =>
    lastTwo[0] === first && lastTwo[1] === second
  );
}
