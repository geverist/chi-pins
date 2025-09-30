import { useEffect, useMemo, useRef, useState } from 'react'
import { LayerGroup, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import { iconFor } from '../lib/mapUtils'
import { titleFromSlug } from '../lib/pinsUtils'

const DEFAULT_MIN_LABEL_ZOOM = 13

export default function SavedPins({
  pins = [],
  exploring = false,
  minLabelZoom = DEFAULT_MIN_LABEL_ZOOM,
  showTooltips = true,
  // Auto-open support (after save)
  highlightSlug = null,
  highlightMs = 30000,
  onHighlightEnd,
  // Auto-dismiss after exploring click
  exploreDismissMs = 12000,
  // Override icon (used for Global/region coloring)
  getIcon = (p) => iconFor(p.team || 'other'),
}) {
  const map = useMap()

  const [showLabels, setShowLabels] = useState(() => {
    try { return (map?.getZoom?.() ?? 12) >= minLabelZoom } catch { return true }
  })

  // Refs
  const markerRefs = useRef(Object.create(null))
  const highlightTimerRef = useRef(null)
  const exploreTimersRef = useRef(Object.create(null)) // ← per-marker timers
  const userInteractedRef = useRef(false)

  // Keep labels tidy with zoom/move
  useEffect(() => {
    if (!map) return
    const update = () => setShowLabels((map.getZoom() ?? 0) >= minLabelZoom)
    map.on('zoomend', update)
    map.on('moveend', update)
    update()
    return () => {
      map.off('zoomend', update)
      map.off('moveend', update)
    }
  }, [map, minLabelZoom])

  // Valid pins only
  const markers = useMemo(
    () => (pins || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)),
    [pins]
  )

  // Robust “open after save” by slug, without dragging the map
  useEffect(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
    if (!highlightSlug || !map) return

    userInteractedRef.current = false

    // Any user navigation cancels auto-open attempts
    const markInteracted = () => { userInteractedRef.current = true }
    map.on('movestart', markInteracted)
    map.on('zoomstart', markInteracted)
    map.on('dragstart', markInteracted)
    map.on('mousedown', markInteracted)
    map.on('touchstart', markInteracted)
    map.on('wheel', markInteracted)

    let attempts = 0
    const maxAttempts = 40
    const gap = 150
    let tickTimer = null

    const tryOpen = () => {
      if (userInteractedRef.current) return true // stop trying silently
      attempts += 1
      const m = markerRefs.current?.[highlightSlug]
      if (m && m.openPopup) {
        try { m.openPopup() } catch {}
        highlightTimerRef.current = setTimeout(() => {
          try { m.closePopup?.() } catch {}
          onHighlightEnd?.()
        }, Math.max(1000, highlightMs || 15000))
        return true
      }
      return false
    }

    const tick = () => {
      if (tryOpen()) return
      if (attempts >= maxAttempts) { onHighlightEnd?.(); return }
      tickTimer = setTimeout(tick, gap)
    }

    if (!tryOpen()) tickTimer = setTimeout(tick, gap)

    return () => {
      map.off('movestart', markInteracted)
      map.off('zoomstart', markInteracted)
      map.off('dragstart', markInteracted)
      map.off('mousedown', markInteracted)
      map.off('touchstart', markInteracted)
      map.off('wheel', markInteracted)
      if (tickTimer) clearTimeout(tickTimer)
    }
  }, [highlightSlug, markers, map, highlightMs, onHighlightEnd])

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      // clear all per-marker timers
      const timers = exploreTimersRef.current || {}
      Object.keys(timers).forEach(k => clearTimeout(timers[k]))
      exploreTimersRef.current = Object.create(null)
    }
  }, [])

  if (!markers.length) return null

  return (
    <LayerGroup>
      {markers.map((p) => {
        const key = p.id || p.slug || `${p.lat},${p.lng},${p.created_at || ''}`
        const icon = getIcon(p)
        const slugText = p.slug || '(no-id)'
        const prettyId = titleFromSlug(slugText)
        const isGlobal = p?.source === 'global'
        const isHighlighted = !!highlightSlug && slugText === highlightSlug

        const setRef = (el) => {
          if (!markerRefs.current) markerRefs.current = Object.create(null)
          if (el) markerRefs.current[slugText] = el
          else delete markerRefs.current[slugText]
        }

        const clearExploreTimer = () => {
          const timers = exploreTimersRef.current
          if (timers?.[slugText]) {
            clearTimeout(timers[slugText])
            delete timers[slugText]
          }
        }

        const onPopupOpen = () => {
          clearExploreTimer()
          const duration = Math.max(2000, exploreDismissMs || 12000)
          exploreTimersRef.current[slugText] = setTimeout(() => {
            const m = markerRefs.current?.[slugText]
            try { m?.closePopup?.() } catch {}
            clearExploreTimer()
          }, duration)
        }

        const onPopupClose = () => {
          clearExploreTimer()
        }

        return (
          <Marker
            key={key}
            position={[p.lat, p.lng]}
            icon={icon}
            draggable={false}
            ref={setRef}
            // keep markers non-clickable unless exploring;
            // programmatic open still works even if interactive=false
            interactive={exploring}
            bubblingMouseEvents={exploring}
            eventHandlers={
              exploring ? { popupopen: onPopupOpen, popupclose: onPopupClose } : {}
            }
          >
            {(exploring || isHighlighted) && (
              <Popup
                autoPan={false}    // don't move map when popup opens
                keepInView={false}
                closeOnClick={false}
                autoClose={false}
              >
                <div style={{ minWidth: 200, lineHeight: 1.35 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {p.name?.trim() || prettyId}
                  </div>
                  <div><small className="muted">🆔 {prettyId}</small></div>

                  {!isGlobal ? (
                    <div style={{ marginTop: 6 }}>
                      <small className="muted">Team:</small> {p.team || 'other'}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6 }}>
                      <small className="muted">Region:</small> {p.continent || '—'}
                    </div>
                  )}

                  {!isGlobal && p.neighborhood ? (
                    <div><small className="muted">Neighborhood:</small> {p.neighborhood}</div>
                  ) : null}

                  {p.hotdog ? (
                    <div><small className="muted">🌭 Favorite stand:</small> {p.hotdog}</div>
                  ) : null}

                  {p.note ? (
                    <div style={{ marginTop: 6 }}>{p.note}</div>
                  ) : null}
                </div>
              </Popup>
            )}

            {showTooltips && showLabels && (
              <Tooltip
                direction="top"
                offset={[0, -30]}
                opacity={1}
                permanent
                interactive={false}
                className="biz-label biz-label--pill"
              >
                {prettyId}
              </Tooltip>
            )}
          </Marker>
        )
      })}
    </LayerGroup>
  )
}
