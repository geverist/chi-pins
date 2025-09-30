// src/components/ZoomGate.jsx
import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Renders children only when the map is zoomed in past `minZoom`,
 * unless `forceOpen` is true (e.g., to show a highlighted pin popup
 * even while zoomed out).
 */
export default function ZoomGate({ minZoom = 13, forceOpen = false, children }) {
  const map = useMap()
  const [ok, setOk] = useState(() => {
    if (forceOpen) return true
    const z = map?.getZoom?.()
    return (z ?? minZoom) >= minZoom
  })

  useEffect(() => {
    if (!map) return
    const update = () => {
      if (forceOpen) {
        setOk(true)
      } else {
        setOk((map.getZoom() ?? 0) >= minZoom)
      }
    }
    map.on('zoomend', update)
    // also run once now (covers first render & forceOpen changes)
    update()
    return () => {
      map.off('zoomend', update)
    }
  }, [map, minZoom, forceOpen])

  return ok ? children : null
}
