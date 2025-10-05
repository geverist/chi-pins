// src/lib/mapActions.js
import L from 'leaflet';
import { CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM } from './mapUtils';
export function focusDraft(map, latlng, radiusMiles) {
if (!map || !latlng) return;
const ll = latlng.lat && latlng.lng ? L.latLng(latlng.lat, latlng.lng) : latlng; // Handle both L.LatLng and { lat, lng }
map.fitBounds(ll.toBounds(radiusMiles * 1609.34), { animate: true });
}
export function goToChicago(map, isMobile = false) {
if (!map) return;
map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
map.setMaxZoom(CHI_MAX_ZOOM);
map.setMaxBounds(null);
if (isMobile) {
// On mobile, zoom to Chicago proper (zoom 11) for better focus
const CHI = { lat: 41.8781, lng: -87.6298 };
map.setView([CHI.lat, CHI.lng], 11, { animate: true });
} else {
// Desktop: Zoom out one level from the min zoom (10 → 9) to show full metro
map.fitBounds(CHI_BOUNDS, { animate: true, maxZoom: CHI_MIN_ZOOM - 1 });
}
map.invalidateSize();
}