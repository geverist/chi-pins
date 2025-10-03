// src/hooks/useKioskMode.js
import { useState, useEffect } from 'react'
import { enterFullscreen, ensureWakeLock, exitFullscreenAndWake, onFullscreenChange } from '../lib/kiosk'

/* ---------------- HOOK ---------------- */

/**
 * Custom hook for kiosk mode management
 * Handles fullscreen, wake lock, and auto-start behavior
 */
export function useKioskMode(mainMapRef) {
  const [needsKioskStart, setNeedsKioskStart] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  )

  const autoKiosk = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('kiosk') === '1'
    : false

  // Monitor fullscreen state
  useEffect(() => {
    if (typeof document === 'undefined') return

    const off = onFullscreenChange((isFull) => {
      setIsFullscreen(isFull)
      if (autoKiosk && !isFull) {
        setTimeout(() => enterFullscreen(), 500)
      }
      if (mainMapRef.current) {
        setTimeout(() => mainMapRef.current.invalidateSize(), 300)
      }
    })

    // Auto-start kiosk mode if URL param is set
    ;(async () => {
      if (autoKiosk) {
        await enterFullscreen()
        await ensureWakeLock()
        setNeedsKioskStart(!document.fullscreenElement)
      } else {
        setNeedsKioskStart(false)
      }
    })()

    return () => off?.()
  }, [autoKiosk, mainMapRef])

  // Start kiosk mode manually
  const startKioskNow = async () => {
    await enterFullscreen()
    await ensureWakeLock()
    setNeedsKioskStart(false)
  }

  // Exit kiosk mode manually
  const exitKioskNow = async () => {
    await exitFullscreenAndWake()
    setNeedsKioskStart(false)
  }

  return {
    isFullscreen,
    needsKioskStart,
    autoKiosk,
    startKioskNow,
    exitKioskNow,
  }
}

/**
 * Kiosk start overlay component
 */
export function KioskStartOverlay({ visible, onStart }) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 4000,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
      }}
      className="kiosk-overlay"
    >
      <button
        type="button"
        onClick={onStart}
        className="btn-toggle btn-kiosk"
        style={{ fontSize: 24, padding: '20px 40px' }}
        aria-label="Start kiosk mode"
      >
        Start Kiosk
      </button>
    </div>
  )
}
