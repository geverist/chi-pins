// src/components/SubMapModal.jsx
import { useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet'
import L from 'leaflet'
import { boundsForMiles, squareMileDeltas, placingIconFor } from '../lib/mapUtils'

/* ---- Zoom → granularity helpers ---- */
function frameMilesForZoom(baseZoom) {
  const z = Number.isFinite(baseZoom) ? baseZoom : 14
  const anchorZoom = 15
  const anchorMiles = 1.0
  const miles = anchorMiles * Math.pow(0.5, z - anchorZoom)
  return Math.min(16, Math.max(0.08, miles))
}
function pageStepMilesForZoom(baseZoom) {
  return frameMilesForZoom(baseZoom) * 0.5
}

/* ---- Drag + edge paging controller ---- */
function DragAndPageController({
  pos,
  setPos,
  pageTile,
  handoff,
  onPointerUpCommit,
  mainMapRef,                // ⬅️ let controller sync the main map during drag
}) {
  const map = useMap()
  const posRef = useRef(pos)
  const activeIdRef = useRef(null)
  const cooldown = useRef(0)
  const unsubRef = useRef({})

  const setBoth = (ll) => { posRef.current = ll; setPos(ll) }
  useEffect(() => { posRef.current = pos }, [pos])

  const clientToLatLng = (clientX, clientY) => {
    const rect = map.getContainer().getBoundingClientRect()
    const pt = L.point(clientX - rect.left, clientY - rect.top)
    return map.containerPointToLatLng(pt)
  }

  const maybePageAtEdges = (clientX, clientY) => {
    const rect = map.getContainer().getBoundingClientRect()
    const PAD = 12
    const now = performance.now()
    if (now < cooldown.current) return

    if (clientY < rect.top + PAD)  { cooldown.current = now + 110; pageTile('N', { x: clientX, y: clientY }); return }
    if (clientY > rect.bottom - PAD){ cooldown.current = now + 110; pageTile('S', { x: clientX, y: clientY }); return }
    if (clientX > rect.right - PAD){ cooldown.current = now + 110; pageTile('E', { x: clientX, y: clientY }); return }
    if (clientX < rect.left + PAD) { cooldown.current = now + 110; pageTile('W', { x: clientX, y: clientY }); return }
  }

  const endDrag = (commit = true) => {
    const { move, up, cancel } = unsubRef.current
    if (move) window.removeEventListener('pointermove', move, { passive: false })
    if (up) window.removeEventListener('pointerup', up, { passive: false })
    if (cancel) window.removeEventListener('pointercancel', cancel, { passive: false })
    unsubRef.current = {}
    const id = activeIdRef.current
    activeIdRef.current = null
    if (commit && id != null) onPointerUpCommit(posRef.current)
  }

  const startDrag = (clientX, clientY, id = -1) => {
    activeIdRef.current = id
    const startLL = clientToLatLng(clientX, clientY)
    const start = { lat: startLL.lat, lng: startLL.lng }
    setBoth(start)
    // keep main map centered immediately on drag start
    mainMapRef?.current?.panTo([start.lat, start.lng], { animate: false })

    const onMove = (ev) => {
      if (activeIdRef.current !== -1 && ev.pointerId !== activeIdRef.current) return
      maybePageAtEdges(ev.clientX, ev.clientY)
      const ll = clientToLatLng(ev.clientX, ev.clientY)
      const next = { lat: ll.lat, lng: ll.lng }
      setBoth(next)
      // continuous follow while dragging
      mainMapRef?.current?.panTo([next.lat, next.lng], { animate: false })
      ev.preventDefault?.()
    }

    const onEnd = (ev) => {
      if (activeIdRef.current !== -1 && ev.pointerId !== activeIdRef.current) return
      endDrag(true)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onEnd, { passive: false })
    window.addEventListener('pointercancel', onEnd, { passive: false })
    unsubRef.current = { move: onMove, up: onEnd, cancel: onEnd }
  }

  useEffect(() => {
    if (!handoff || handoff.x == null || handoff.y == null) return
    startDrag(handoff.x, handoff.y, handoff.id ?? -1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff])

  useEffect(() => {
    const container = map.getContainer()
    const onPointerDown = (ev) => {
      if (activeIdRef.current != null) endDrag(false)
      startDrag(ev.clientX, ev.clientY, ev.pointerId ?? -1)
      ev.preventDefault?.()
    }
    container.addEventListener('pointerdown', onPointerDown, { passive: false })
    return () => {
      container.removeEventListener('pointerdown', onPointerDown, { passive: false })
      endDrag(false)
    }
  }, [map])

  return null
}

/* ---- Modal ---- */
export default function SubMapModal({
  center,
  team,
  handoff,
  onCommit,
  mainMapRef,
  baseZoom,
}) {
  // Always create a valid center (final backstop here)
  const safeCenter = useMemo(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) return center
    const live = mainMapRef?.current?.getCenter?.()
    if (live && Number.isFinite(live.lat) && Number.isFinite(live.lng)) {
      return { lat: live.lat, lng: live.lng }
    }
    console.error('[SubMapModal] No valid center; falling back to CHI.', { center, live })
    return { lat: 41.8781, lng: -87.6298 }
  }, [center, mainMapRef])

  if (!Number.isFinite(safeCenter.lat) || !Number.isFinite(safeCenter.lng)) {
    console.error('[SubMapModal] Still no valid center; skip render.')
    return null
  }

  const [pos, setPos] = useState(safeCenter)
  const [viewCenter, setViewCenter] = useState(safeCenter)
  const subMapRef = useRef(null)

  // NEW: absolute safety—whenever pos changes, follow on the main map
  useEffect(() => {
    if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return
    mainMapRef?.current?.panTo([pos.lat, pos.lng], { animate: false })
  }, [pos, mainMapRef])

  // Adopt new center from parent if it changes to a valid value
  useEffect(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      setPos(center)
      setViewCenter(center)
    }
  }, [center])

  // Guarantee the modal is tighter than the main map by adding a zoom bias
  const ZOOM_BIAS = 1.25

  // frame/step derived from biased base zoom
  const { frameMiles, stepMiles } = useMemo(() => {
    const z = Number.isFinite(baseZoom) ? baseZoom + ZOOM_BIAS : 14 + ZOOM_BIAS
    return {
      frameMiles: frameMilesForZoom(z),
      stepMiles: pageStepMilesForZoom(z),
    }
  }, [baseZoom])

  function Boot() {
    const map = useMap()
    useEffect(() => {
      subMapRef.current = map
      map.fitBounds(boundsForMiles(viewCenter, frameMiles), { animate: false })
      map.scrollWheelZoom.enable()
      map.touchZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
      setTimeout(() => map.invalidateSize(), 0)
    }, [map])

    useEffect(() => {
      if (!subMapRef.current) return
      subMapRef.current.fitBounds(boundsForMiles(viewCenter, frameMiles), { animate: false })
    }, [viewCenter, frameMiles])

    return null
  }

  const pageTile = (dir, clientPoint) => {
    const { dLat, dLng } = squareMileDeltas(viewCenter.lat)
    const dLatMiles = dLat * stepMiles
    const dLngMiles = dLng * stepMiles

    let next = viewCenter
    if (dir === 'N') next = { lat: viewCenter.lat + dLatMiles, lng: viewCenter.lng }
    if (dir === 'S') next = { lat: viewCenter.lat - dLatMiles, lng: viewCenter.lng }
    if (dir === 'E') next = { lat: viewCenter.lat, lng: viewCenter.lng + dLngMiles }
    if (dir === 'W') next = { lat: viewCenter.lat, lng: viewCenter.lng - dLngMiles }
    setViewCenter(next)

    // keep main map centered as we page
    mainMapRef?.current?.panTo([next.lat, next.lng], { animate: false })

    requestAnimationFrame(() => {
      const map = subMapRef.current
      if (!map || !clientPoint) return
      const rect = map.getContainer().getBoundingClientRect()
      const pt = L.point(clientPoint.x - rect.left, clientPoint.y - rect.top)
      const ll = map.containerPointToLatLng(pt)
      const updated = { lat: ll.lat, lng: ll.lng }
      setPos(updated)
      // also sync main map to the new pin position after paging snap
      mainMapRef?.current?.panTo([updated.lat, updated.lng], { animate: false })
    })
  }

  return (
    <div className="submap-overlay" role="dialog" aria-modal="true">
      <div className="submap-card">
        <div className="submap-head">
          <strong>Fine tune your pin</strong>
          <button className="submap-close" onClick={() => onCommit(pos)} aria-label="Close">✕</button>
        </div>

        <div className="submap-map">
          <MapContainer
            style={{ height: '100%', width: '100%' }}
            center={[viewCenter.lat, viewCenter.lng]}
            zoom={16}                 // visual baseline; fitBounds controls actual span
            dragging={false}          // move the pin, not the map
            doubleClickZoom={false}
            attributionControl={false}
            closePopupOnClick={false}
            scrollWheelZoom
            wheelPxPerZoomLevel={90}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Boot />

            <Marker position={[pos.lat, pos.lng]} icon={placingIconFor(team)} />

            <DragAndPageController
              pos={pos}
              setPos={setPos}
              pageTile={pageTile}
              handoff={handoff}
              onPointerUpCommit={(finalPos) => onCommit(finalPos)}
              mainMapRef={mainMapRef} // live-sync main map on drag
            />
          </MapContainer>
        </div>

        <div className="submap-help">
          Drag the pin; hover near edges to page; lift to place it.
        </div>
      </div>
    </div>
  )
}
