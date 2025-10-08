// src/hooks/useQuadrantTouch.js
import { useEffect, useCallback, useRef } from 'react';

const HOLD_DURATION_MS = 3000; // 3 seconds hold to trigger refresh

/**
 * Detects when all four quadrants of the screen are touched simultaneously
 * - Quick touch: Opens admin panel
 * - Hold for 3s: Refreshes the app
 *
 * @param {function} onQuadrantTouch - Callback when all four quadrants are touched
 * @param {boolean} enabled - Whether to enable the listener
 * @param {function} onHoldRefresh - Optional callback for hold-to-refresh (3s hold)
 */
export function useQuadrantTouch(onQuadrantTouch, enabled = true, onHoldRefresh = null) {
  const holdTimer = useRef(null);
  const isHolding = useRef(false);
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

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    isHolding.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      if (checkQuadrants(e.touches)) {
        e.preventDefault();
        console.log('[QuadrantTouch] Four quadrants detected!');

        // Start hold timer for refresh
        if (onHoldRefresh) {
          isHolding.current = true;
          holdTimer.current = setTimeout(() => {
            if (isHolding.current) {
              console.log('[QuadrantTouch] Hold complete - triggering refresh!');
              onHoldRefresh();
              clearHoldTimer();
            }
          }, HOLD_DURATION_MS);
        } else {
          // Immediate callback if no hold-refresh configured
          onQuadrantTouch();
        }
      }
    };

    const handleTouchEnd = (e) => {
      // If released before hold duration, trigger quick action
      if (isHolding.current && holdTimer.current) {
        console.log('[QuadrantTouch] Quick release - triggering admin panel');
        clearHoldTimer();
        onQuadrantTouch();
      } else {
        clearHoldTimer();
      }
    };

    const handleTouchMove = (e) => {
      // If user moves fingers off quadrants, cancel hold
      if (isHolding.current && !checkQuadrants(e.touches)) {
        console.log('[QuadrantTouch] Fingers moved - canceling hold');
        clearHoldTimer();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      clearHoldTimer();
    };
  }, [enabled, onQuadrantTouch, onHoldRefresh, checkQuadrants, clearHoldTimer]);
}
