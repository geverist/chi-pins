/**
 * Idle Reset Hook
 * Detects user inactivity and triggers callback after timeout
 * Perfect for kiosk mode to reset to attract screen
 *
 * Usage:
 *   useIdleReset(() => {
 *     // Reset to attract mode
 *     setShowAttractor(true)
 *   }, 60000) // 60 seconds
 */

import { useEffect, useRef } from 'react'

export function useIdleReset(onIdle, timeoutMs = 60000) {
  const timerRef = useRef(null)

  useEffect(() => {
    const resetTimer = () => {
      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Start new timer
      timerRef.current = setTimeout(() => {
        console.log('[IdleReset] User inactive for', timeoutMs, 'ms - triggering idle callback')
        onIdle()
      }, timeoutMs)
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
    ]

    // Add event listeners for all activity events
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true })
    })

    // Start initial timer
    resetTimer()

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [onIdle, timeoutMs])
}
