// src/lib/geo.js
import { CHI_BOUNDS } from './mapUtils'

// coarse continent bucketing (good enough for counters + colors)
export function continentFor(lat, lng) {
  const sw = CHI_BOUNDS.getSouthWest()
  const ne = CHI_BOUNDS.getNorthEast()
  const sWLat = sw.lat, sWLng = sw.lng
  const nELat = ne.lat, nELng = ne.lng
  if (lat >= sWLat && lat <= nELat && lng >= sWLng && lng <= nELng) return 'chicago'

  // North America (incl. Central America & Caribbean)
  if (lng >= -170 && lng <= -30 && lat >= 5 && lat <= 83) return 'na'
  // South America
  if (lng >= -90 && lng <= -30 && lat >= -60 && lat <= 15) return 'sa'
  // Europe
  if (lng >= -31 && lng <= 60 && lat >= 35 && lat <= 72) return 'eu'
  // Africa
  if (lng >= -20 && lng <= 55 && lat >= -35 && lat <= 38) return 'af'
  // Asia (broad; includes Middle East)
  if (lng >= 25 && lng <= 180 && lat >= 0 && lat <= 80) return 'as'

  // default bucket
  return 'na'
}

export function countByContinent(pins = []) {
  const counts = { chicago: 0, na: 0, sa: 0, eu: 0, af: 0, as: 0 }
  for (const p of pins) {
    const { lat, lng } = p || {}
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    counts[continentFor(lat, lng)]++
  }
  return counts
}
