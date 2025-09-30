// src/lib/mapActions.js
import { CHI_BOUNDS, boundsForMiles, CHI_MIN_ZOOM, CHI_MAX_ZOOM } from './mapUtils'

export function focusDraft(map, centerLL, miles) {
  if (!map || !centerLL) return
  const b = boundsForMiles(centerLL, miles)
  map.fitBounds(b, { animate: true })
  const z = map.getZoom()
  map.setView([centerLL.lat, centerLL.lng], z, { animate: true })
}

export function goToChicago(map) {
  if (!map) return
  // keep min/max zoom constraints, but NO maxBounds or pannable bounds
  map.setMinZoom(CHI_MIN_ZOOM)
  map.setMaxZoom(CHI_MAX_ZOOM)
  map.setMaxBounds(null)
  map.fitBounds(CHI_BOUNDS, { animate: true })
}
