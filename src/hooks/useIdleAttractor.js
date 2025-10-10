// hooks/useIdleAttractor.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { resetToChicagoOverview } from '../lib/mapUtils'
import { showConfetti, clearAllConfetti } from '../lib/effects'

/**
 * Shows an attractor after inactivity and optionally resets the map.
 * Calls `onIdle` so the app can clear editor/draft/submap state.
 */
export function useIdleAttractor({
  deps = [],
  mainMapRef,
  draft,
  submapOpen,
  exploring,
  adminOpen, // Don't trigger idle when admin panel is open
  timeoutMs = 60_000,
  confettiScreensaverMs = 60_000, // Show confetti screensaver after 60s (was 15s for testing)
  confettiScreensaverEnabled = false, // Enable/disable confetti screensaver
  onIdle, // <-- NEW
}) {
  const [showAttractor, setShowAttractor] = useState(true) // Show on page load
  const timerRef = useRef(null)
  const confettiTimer = useRef(null)
  const confettiInterval = useRef(null)

  const startConfettiScreensaver = useCallback(() => {
    console.log('[IdleAttractor] Starting confetti screensaver (burn-in prevention mode)')
    // Show confetti in screensaver mode (covers entire screen, loops forever)
    showConfetti(document.body, {
      screensaver: true,
      count: 50, // Fewer particles for cleaner screensaver
      colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
    })
  }, [])

  const stopConfettiScreensaver = useCallback(() => {
    if (confettiInterval.current) {
      console.log('[IdleAttractor] Stopping confetti screensaver')
      clearInterval(confettiInterval.current)
      confettiInterval.current = null
    }
  }, [])

  const bump = useCallback(() => {
    console.log('[IdleAttractor] bump() called - resetting idle timer', {
      draft: !!draft,
      submapOpen,
      exploring,
      adminOpen,
      timeoutMs
    })

    clearTimeout(timerRef.current)
    clearTimeout(confettiTimer.current)

    // Stop confetti
    if (confettiInterval.current) {
      clearInterval(confettiInterval.current)
      confettiInterval.current = null
    }
    clearAllConfetti() // Immediately remove all confetti on user interaction

    // While user is interacting (editor/submap/explore/admin), keep attractor hidden
    if (draft || submapOpen || exploring || adminOpen) {
      console.log('[IdleAttractor] User is interacting - hiding attractor')
      setShowAttractor(false)
    }

    // Don't start idle timer if admin panel is open
    if (adminOpen) {
      console.log('[IdleAttractor] Admin panel open - not starting timer')
      return
    }

    // Set timer for confetti screensaver (only if enabled)
    if (confettiScreensaverEnabled) {
      confettiTimer.current = setTimeout(() => {
        // Start screensaver mode (covers entire screen, loops forever until user interaction)
        showConfetti(document.body, {
          screensaver: true,
          count: 50,
          colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
        })
      }, confettiScreensaverMs)
    }

    // Set timer for full idle reset
    console.log(`[IdleAttractor] Starting idle timer for ${timeoutMs / 1000}s`)
    timerRef.current = setTimeout(() => {
      console.log('[IdleAttractor] 🔔 Idle timeout reached - showing attractor and resetting map')
      try {
        // Let the app close the editor, submap, etc.
        onIdle?.()
      } finally {
        // Always snap the map back to the Chicago overview and show attractor
        resetToChicagoOverview(mainMapRef?.current)
        setShowAttractor(true)
      }
    }, timeoutMs)
  }, [draft, submapOpen, exploring, adminOpen, onIdle, timeoutMs, confettiScreensaverMs, confettiScreensaverEnabled, mainMapRef])
  // Removed startConfettiScreensaver and stopConfettiScreensaver from dependencies

  useEffect(() => {
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    bump() // start the timer immediately
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      clearTimeout(timerRef.current)
      clearTimeout(confettiTimer.current)
      stopConfettiScreensaver()
    }
    // re-arm when deps change (e.g. map mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, ...deps])

  return { showAttractor, setShowAttractor, bumpAttractor: bump }
}
