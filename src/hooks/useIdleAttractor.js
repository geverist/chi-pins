// hooks/useIdleAttractor.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { resetToChicagoOverview } from '../lib/mapUtils'

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
  onIdle, // <-- NEW
}) {
  const [showAttractor, setShowAttractor] = useState(false)
  const timerRef = useRef(null)

  const bump = useCallback(() => {
    clearTimeout(timerRef.current)
    // While user is interacting (editor/submap/explore), keep attractor hidden
    if (draft || submapOpen || exploring) setShowAttractor(false)

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
  }, [draft, submapOpen, exploring, onIdle, timeoutMs, mainMapRef])

  useEffect(() => {
    window.addEventListener('pointerdown', bump)
    window.addEventListener('keydown', bump)
    bump() // start the timer immediately
    return () => {
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('keydown', bump)
      clearTimeout(timerRef.current)
    }
    // re-arm when deps change (e.g. map mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, ...deps])

  return { showAttractor, setShowAttractor, bumpAttractor: bump }
}
