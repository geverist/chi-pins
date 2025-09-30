import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export default function MobileFreeZoom({
  minZoom = 1,             // allow full world
  maxBounds = null,        // pass null to remove bounds
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const prevMin = map.getMinZoom?.()
    const prevBounds = map.options.maxBounds

    try {
      if (typeof map.setMinZoom === 'function') map.setMinZoom(minZoom)
      if (maxBounds === null) {
        // Clear max bounds restriction for mobile only
        map.setMaxBounds(null)
        map.options.maxBounds = null
      }
    } catch {}

    return () => {
      try {
        if (typeof prevMin === 'number') map.setMinZoom(prevMin)
        if (prevBounds) {
          map.setMaxBounds(prevBounds)
          map.options.maxBounds = prevBounds
        }
      } catch {}
    }
  }, [map, minZoom, maxBounds])

  return null
}
