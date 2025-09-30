// src/hooks/useHighlightPin.js
import { useRef } from 'react'

/**
 * Small helper to coordinate programmatic popup opening in <SavedPins/>.
 * You pass setHighlightSlug from App state to this hook.
 */
export function useHighlightPin(setHighlightSlug) {
  const tRef = useRef(null)

  const clear = () => {
    if (tRef.current) { clearTimeout(tRef.current); tRef.current = null }
    setHighlightSlug(null)
  }

  const trigger = (slug, delayMs = 0) => {
    clear()
    tRef.current = setTimeout(() => {
      setHighlightSlug(slug)
      tRef.current = null
    }, Math.max(0, delayMs || 0))
  }

  return { trigger, clear }
}
