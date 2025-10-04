// src/hooks/useQuadrantTouch.js
import { useEffect, useCallback } from 'react';

/**
 * Detects when all four quadrants of the screen are touched simultaneously
 * Useful for hidden admin panel access or easter eggs
 *
 * @param {function} onQuadrantTouch - Callback when all four quadrants are touched
 * @param {boolean} enabled - Whether to enable the listener
 */
export function useQuadrantTouch(onQuadrantTouch, enabled = true) {
  const checkQuadrants = useCallback((touches) => {
    if (touches.length < 4) return false;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const midX = width / 2;
    const midY = height / 2;

    // Track which quadrants have been touched
    const quadrants = {
      topLeft: false,
      topRight: false,
      bottomLeft: false,
      bottomRight: false,
    };

    // Check each touch point
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      if (x < midX && y < midY) {
        quadrants.topLeft = true;
      } else if (x >= midX && y < midY) {
        quadrants.topRight = true;
      } else if (x < midX && y >= midY) {
        quadrants.bottomLeft = true;
      } else if (x >= midX && y >= midY) {
        quadrants.bottomRight = true;
      }
    }

    // Check if all four quadrants are touched
    return quadrants.topLeft && quadrants.topRight &&
           quadrants.bottomLeft && quadrants.bottomRight;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      if (checkQuadrants(e.touches)) {
        e.preventDefault();
        console.log('Four quadrant touch detected!');
        onQuadrantTouch();
      }
    };

    const handleTouchMove = (e) => {
      if (checkQuadrants(e.touches)) {
        e.preventDefault();
        console.log('Four quadrant touch detected during move!');
        onQuadrantTouch();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled, onQuadrantTouch, checkQuadrants]);
}
