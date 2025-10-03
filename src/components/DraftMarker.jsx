// src/components/DraftMarker.jsx
import { useEffect, useRef } from 'react'
import { Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { placingIconFor } from '../lib/mapUtils'

/**
 * DraftMarker
 * - Renders the temporary "placing" pin.
 * - If map zoom < max (18), opens SubMapModal for fine-tuning.
 * - If map zoom >= max (18), enables direct dragging on main map.
 */
export default function DraftMarker({
  lat,
  lng,
  team = 'other',
  onOpenModal,      // (center, handoff) => void
  tipToken,         // used to force-refresh tooltip / icon if needed
  setDraft,         // (pos) => void - update draft position
  modalOpen = false // if modal is open, ignore extra pointer starts
}) {
  const map = useMap()
  const markerRef = useRef(null)
  const isDraggingRef = useRef(false)

  // Attach pointer handler directly to the pin's DOM element
  useEffect(() => {
    const m = markerRef.current
    const el = m?.getElement?.()
    if (!el || !map) return

    const MAX_ZOOM = 18
    const MODAL_ZOOM_BOOST = 2 // SubMapModal zooms in 2 levels

    const handlePointerDown = (ev) => {
      console.log('[DraftMarker] pointerdown detected, modalOpen=', modalOpen)

      // Avoid re-entrancy if the modal is already open
      if (modalOpen) return

      const currentZoom = map.getZoom()
      const modalZoom = Math.min(MAX_ZOOM, currentZoom + MODAL_ZOOM_BOOST)

      // If modal can't zoom in further than current view, enable direct dragging on main map
      if (modalZoom <= currentZoom) {
        console.log('[DraftMarker] Modal cannot zoom further, enabling direct drag on main map')
        isDraggingRef.current = true
        // Disable map dragging while dragging pin
        map.dragging?.disable()
        ev.preventDefault?.()
        ev.stopPropagation?.()
        return
      }

      // Otherwise, open modal for fine-tuning
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

    const handlePointerMove = (ev) => {
      if (!isDraggingRef.current || !m) return

      // Get map container position
      const mapContainer = map.getContainer()
      const rect = mapContainer.getBoundingClientRect()

      // Calculate coordinates relative to map container
      const containerX = ev.clientX - rect.left
      const containerY = ev.clientY - rect.top

      // Convert to lat/lng
      const point = map.containerPointToLatLng([containerX, containerY])

      if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
        // Move marker to cursor position
        m.setLatLng(point)
        // Update draft position
        setDraft?.({ lat: point.lat, lng: point.lng })
      }
    }

    const handlePointerUp = (ev) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      // Re-enable map dragging
      map.dragging?.enable()

      const ll = m.getLatLng()
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        setDraft?.({ lat: ll.lat, lng: ll.lng })
        // Don't pan - keep the view stable
      }
    }

    el.addEventListener('pointerdown', handlePointerDown, { passive: false })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [map, lat, lng, onOpenModal, modalOpen, tipToken, setDraft])

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
