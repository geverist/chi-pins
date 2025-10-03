// src/components/ZoomGate.jsx
import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Renders children only when the map is zoomed in past `minZoom`,
 * unless `forceOpen` is true (e.g., to show a highlighted pin popup
 * even while zoomed out).
 *
 * Once forceOpen has been true, pins remain visible at that zoom level
 * until the user zooms out further.
 */
export default function ZoomGate({ minZoom = 13, forceOpen = false, children }) {
  const map = useMap()
  const [ok, setOk] = useState(() => {
    if (forceOpen) return true
    const z = map?.getZoom?.()
    return (z ?? minZoom) >= minZoom
  })
  const [wasForceOpened, setWasForceOpened] = useState(forceOpen)

  useEffect(() => {
    if (!map) return
    const update = () => {
      const currentZoom = map.getZoom() ?? 0
      if (forceOpen) {
        setOk(true)
        setWasForceOpened(true)
      } else if (wasForceOpened) {
        // Keep visible until user zooms out
        setOk(currentZoom >= minZoom)
        if (currentZoom < minZoom) {
          setWasForceOpened(false)
        }
      } else {
        setOk(currentZoom >= minZoom)
      }
    }
    map.on('zoomend', update)
    // also run once now (covers first render & forceOpen changes)
    update()
    return () => {
      map.off('zoomend', update)
    }
  }, [map, minZoom, forceOpen, wasForceOpened])

  return ok ? children : null
}
