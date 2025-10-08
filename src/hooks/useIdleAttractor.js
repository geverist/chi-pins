// hooks/useIdleAttractor.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { resetToChicagoOverview } from '../lib/mapUtils'
import { showConfetti } from '../lib/effects'

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
  timeoutMs = 60_000,
  confettiScreensaverMs = 15_000, // Show confetti screensaver after 15s for quick testing
  onIdle, // <-- NEW
}) {
  const [showAttractor, setShowAttractor] = useState(true) // Show on page load
  const timerRef = useRef(null)
  const confettiTimer = useRef(null)
  const confettiInterval = useRef(null)

  const startConfettiScreensaver = useCallback(() => {
    console.log('[IdleAttractor] Starting confetti screensaver')
    // Show confetti burst immediately
    showConfetti()
    // Then show it every 6 seconds (less frequent)
    confettiInterval.current = setInterval(() => {
      showConfetti()
    }, 6000)
  }, [])

  const stopConfettiScreensaver = useCallback(() => {
    if (confettiInterval.current) {
      console.log('[IdleAttractor] Stopping confetti screensaver')
      clearInterval(confettiInterval.current)
      confettiInterval.current = null
    }
  }, [])

  const bump = useCallback(() => {
    clearTimeout(timerRef.current)
    clearTimeout(confettiTimer.current)
    stopConfettiScreensaver()

    // While user is interacting (editor/submap/explore), keep attractor hidden
    if (draft || submapOpen || exploring) setShowAttractor(false)

    // Set timer for confetti screensaver (shorter timeout for testing)
    confettiTimer.current = setTimeout(startConfettiScreensaver, confettiScreensaverMs)

    // Set timer for full idle reset
    timerRef.current = setTimeout(() => {
      try {
        // Let the app close the editor, submap, etc.
        onIdle?.()
      } finally {
        // Always snap the map back to the Chicago overview and show attractor
        resetToChicagoOverview(mainMapRef?.current)
        setShowAttractor(true)
      }
    }, timeoutMs)
  }, [draft, submapOpen, exploring, onIdle, timeoutMs, confettiScreensaverMs, mainMapRef, startConfettiScreensaver, stopConfettiScreensaver])

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
