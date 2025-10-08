// src/hooks/useZPatternGesture.js
import { useEffect, useRef } from 'react';

/**
 * Four-corner sequential gesture detector for admin panel access
 * Pattern: Top-left → Top-right → Bottom-right → Bottom-left (clockwise from top-left)
 *
 * Gesture must complete within 3 seconds
 * Each corner must be within 100px of actual corner
 */

const CORNER_THRESHOLD = 100; // pixels from corner
const GESTURE_TIMEOUT = 3000; // 3 seconds to complete pattern
const MIN_DISTANCE = 100; // minimum distance between points to count as movement

export function useZPatternGesture(onComplete) {
  const touchPoints = useRef([]);
  const gestureStartTime = useRef(null);

  useEffect(() => {
    let timeoutId = null;

    function isNearCorner(x, y, corner) {
      const w = window.innerWidth;
      const h = window.innerHeight;

      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: w, y: 0 },
        bottomLeft: { x: 0, y: h },
        bottomRight: { x: w, y: h },
      };

      const target = corners[corner];
      const distance = Math.sqrt(
        Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)
      );

      return distance < CORNER_THRESHOLD;
    }

    function getDistance(p1, p2) {
      return Math.sqrt(
        Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
      );
    }

    function checkPattern() {
      if (touchPoints.current.length !== 4) return false;

      const [p1, p2, p3, p4] = touchPoints.current;

      // Check if each point is near the expected corner in clockwise order
      const valid =
        isNearCorner(p1.x, p1.y, 'topLeft') &&
        isNearCorner(p2.x, p2.y, 'topRight') &&
        isNearCorner(p3.x, p3.y, 'bottomRight') &&
        isNearCorner(p4.x, p4.y, 'bottomLeft');

      // Check minimum distances (prevent accidental taps)
      const distances = [
        getDistance(p1, p2),
        getDistance(p2, p3),
        getDistance(p3, p4),
      ];

      const hasMinDistance = distances.every(d => d >= MIN_DISTANCE);

      return valid && hasMinDistance;
    }

    function resetGesture() {
      touchPoints.current = [];
      gestureStartTime.current = null;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function handleTouch(e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX;
      const y = touch.clientY;

      // Start gesture timer on first touch
      if (touchPoints.current.length === 0) {
        gestureStartTime.current = Date.now();

        // Reset after timeout
        timeoutId = setTimeout(() => {
          console.log('[ZPattern] Gesture timeout, resetting');
          resetGesture();
        }, GESTURE_TIMEOUT);
      }

      // Check if gesture has timed out
      if (Date.now() - gestureStartTime.current > GESTURE_TIMEOUT) {
        resetGesture();
        return;
      }

      // Check if this touch is near ANY corner (only track corner touches)
      const isNearAnyCorner =
        isNearCorner(x, y, 'topLeft') ||
        isNearCorner(x, y, 'topRight') ||
        isNearCorner(x, y, 'bottomLeft') ||
        isNearCorner(x, y, 'bottomRight');

      // Only track touches near corners (ignore touches in the middle)
      if (!isNearAnyCorner && touchPoints.current.length === 0) {
        // First touch not near a corner, ignore this gesture attempt
        return;
      }

      // Add touch point only if near a corner
      if (isNearAnyCorner) {
        touchPoints.current.push({ x, y, time: Date.now() });
        console.log(`[ZPattern] Touch ${touchPoints.current.length}: (${x.toFixed(0)}, ${y.toFixed(0)})`);
      }

      // Check if pattern is complete
      if (touchPoints.current.length === 4) {
        if (checkPattern()) {
          console.log('[ZPattern] ✓ Gesture recognized!');
          onComplete?.();
          resetGesture();
          // Only prevent default on successful gesture
          e.preventDefault();
        } else {
          console.log('[ZPattern] ✗ Pattern mismatch, resetting');
          resetGesture();
        }
      }

      // DON'T prevent default - let touches pass through to buttons!
    }

    function handleTouchEnd(e) {
      // Allow slight delay between touches
      // Don't reset immediately
    }

    // Mouse support for desktop testing
    let isMouseDown = false;

    function handleMouseDown(e) {
      isMouseDown = true;
      handleTouch({
        touches: [{ clientX: e.clientX, clientY: e.clientY }]
      });
    }

    function handleMouseMove(e) {
      if (!isMouseDown) return;

      const lastPoint = touchPoints.current[touchPoints.current.length - 1];
      if (!lastPoint) return;

      const distance = getDistance(
        { x: e.clientX, y: e.clientY },
        lastPoint
      );

      // Only register new point if moved significantly
      if (distance >= MIN_DISTANCE && touchPoints.current.length < 4) {
        handleTouch({
          touches: [{ clientX: e.clientX, clientY: e.clientY }]
        });
      }
    }

    function handleMouseUp() {
      isMouseDown = false;
    }

    // Add event listeners
    window.addEventListener('touchstart', handleTouch, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onComplete]);
}
