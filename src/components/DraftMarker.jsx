// src/components/DraftMarker.jsx
import { useEffect, useRef } from 'react'
import { Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { placingIconFor } from '../lib/mapUtils'

/**
 * DraftMarker
 * - Renders the temporary "placing" pin.
 * - On pointer down, always opens the SubMapModal and hands off the drag.
 */
export default function DraftMarker({
  lat,
  lng,
  team = 'other',
  onOpenModal,      // (center, handoff) => void
  tipToken,         // used to force-refresh tooltip / icon if needed
  setDraft,         // not used here, but kept for API parity
  modalOpen = false // if modal is open, ignore extra pointer starts
}) {
  const map = useMap()
  const markerRef = useRef(null)

  // Attach pointer handler directly to the pin's DOM element
  useEffect(() => {
    const m = markerRef.current
    const el = m?.getElement?.()
    if (!el || !map) return

    const handlePointerDown = (ev) => {
      console.log('[DraftMarker] pointerdown detected, modalOpen=', modalOpen)

      // Avoid re-entrancy if the modal is already open
      if (modalOpen) return

      const center = { lat, lng }
      const handoff = {
        x: ev.clientX,
        y: ev.clientY,
        id: ev.pointerId ?? -1
      }

      console.log('[DraftMarker] Opening modal with center=', center, 'handoff=', handoff)

      // Hand off to the modal (App will disable map interactions)
      try {
        onOpenModal?.(center, handoff)
      } catch (e) {
        console.error('[DraftMarker] onOpenModal failed:', e)
      }

      // Prevent map from treating this as a normal click
      ev.preventDefault?.()
      ev.stopPropagation?.()
    }

    el.addEventListener('pointerdown', handlePointerDown, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown, { passive: false })
    }
  }, [map, lat, lng, onOpenModal, modalOpen, tipToken])

  // If lat/lng are invalid, render nothing (safety)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={placingIconFor(team)}
      draggable={false}             // modal is the only fine-tune UI now
      keyboard={false}
      bubblingMouseEvents={false}
      autoPan={false}
      interactive={true}             // ensure marker is interactive
    >
      {/* Optional helper label for the draft pin */}
      <Tooltip
        direction="top"
        offset={[0, -30]}
        opacity={1}
        permanent
        interactive={false}
        className="biz-label biz-label--pill"
      >
        drag to fine-tune →
      </Tooltip>
    </Marker>
  )
}
