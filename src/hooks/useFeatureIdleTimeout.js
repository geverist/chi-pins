// src/hooks/useFeatureIdleTimeout.js
import { useEffect, useRef } from 'react';

/**
 * Idle timeout hook for games, jukebox, ordering features
 * Automatically closes the feature and returns to map after inactivity
 *
 * @param {boolean} isActive - Whether the feature is currently active/open
 * @param {function} onTimeout - Callback when timeout is reached
 * @param {number} timeoutSeconds - Timeout duration in seconds
 */
export function useFeatureIdleTimeout(isActive, onTimeout, timeoutSeconds) {
  const timeoutRef = useRef(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isActive && timeoutSeconds > 0) {
      timeoutRef.current = setTimeout(() => {
        console.log('[FeatureIdleTimeout] Timeout reached, closing feature');
        onTimeout?.();
      }, timeoutSeconds * 1000);
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Set initial timeout
    resetTimeout();

    // Activity event listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const handleActivity = () => {
      resetTimeout();
    };

    // Add listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isActive, timeoutSeconds, onTimeout]);

  return resetTimeout;
}
