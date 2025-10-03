// src/lib/mapUtils.js
import L from 'leaflet';

/* ---------- Camera / bounds constants ---------- */
export const CHI = { lat: 41.8781, lng: -87.6298 };
export const CHI_BOUNDS = L.latLngBounds([41.3, -88.8], [42.8, -87.0]);
export const CHI_MIN_ZOOM = 10;
export const CHI_MAX_ZOOM = 17;
export const USA = { lat: 37.0902, lng: -95.7129 };
export const GLOBAL_ZOOM = 4;
export const INITIAL_RADIUS_MILES = 0.5;

/* ---------- Utility: geographic helpers ---------- */
export function squareMileDeltas(centerLat) {
  const mileKm = 1.609344;
  const latDegPerKm = 1 / 111.32;
  const dLat = mileKm * latDegPerKm;
  const latRad = (centerLat * Math.PI) / 180;
  const lonDegPerKm = 1 / (111.32 * Math.cos(latRad) || 1);
  const dLng = mileKm * lonDegPerKm;
  return { dLat, dLng };
}

export function boundsForMiles(center, miles) {
  let c = center;
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) c = CHI;
  const ll = c.lat && c.lng && !('toBounds' in c) ? L.latLng(c.lat, c.lng) : c;
  const { dLat, dLng } = squareMileDeltas(ll.lat);
  return L.latLngBounds(
    [ll.lat - (dLat * miles) / 2, ll.lng - (dLng * miles) / 2],
    [ll.lat + (dLat * miles) / 2, ll.lng + (dLng * miles) / 2]
  );
}

/* ---------- Chicago overview (no pannable bounds) ---------- */
export function resetToChicagoOverview(map) {
  if (!map) return;
  map.setMinZoom(CHI_MIN_ZOOM);
  map.setMaxZoom(CHI_MAX_ZOOM);
  map.setMaxBounds(null);
  map.fitBounds(CHI_BOUNDS, { animate: true });
  setTimeout(() => map.invalidateSize(), 300);
}

/** Center + fit an N-mile box (defensive center). */
export function centerAndFitMiles(map, center, miles) {
  if (!map) return;
  const c = (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) ? center : CHI;
  const b = boundsForMiles(c, miles);
  map.fitBounds(b, { animate: true });
  const z = map.getZoom();
  map.setView([c.lat, c.lng], z, { animate: true });
  setTimeout(() => map.invalidateSize(), 300);
}

/* ---------- Push-pin SVG + Leaflet icons ---------- */
export const TEAM_COLOR = {
  cubs: '#2a6ae0',
  whitesox: '#e8e8e8',
  other: '#666666',
  chicago: '#0ea5e9',
  na: '#3b82f6',
  sa: '#ef4444',
  eu: '#22c55e',
  af: '#f59e0b',
  as: '#a855f7',
};

const STEM_ANGLE_DEG = 8;

export function pushpinHTMLFor(team = 'other', includeHalo = false) {
  const color = TEAM_COLOR[team] || TEAM_COLOR.other;
  const ICON_W = 30, ICON_H = 46;
  const AX = ICON_W / 2, AY = ICON_H;
  const headR = 10, headBorder = 2;
  const stemW = 3, stemLen = 22, tipLen = 6;
  const theta = (STEM_ANGLE_DEG * Math.PI) / 180;
  const Ltot = stemLen + tipLen;
  const dx = Math.sin(theta) * Ltot;
  const dy = Math.cos(theta) * Ltot;
  const hx = AX - dx, hy = AY - dy;
  const sx = AX - Math.sin(theta) * tipLen;
  const sy = AY - Math.cos(theta) * tipLen;
  const px = Math.cos(theta), py = -Math.sin(theta);
  const halfTipW = 2;
  const b1x = sx + px * halfTipW, b1y = sy + py * halfTipW;
  const b2x = sx - px * halfTipW, b2y = sy - py * halfTipW;
  const headShiftX = Math.round(-STEM_ANGLE_DEG * 0.12);

  return `
  <div style="position:relative;width:${ICON_W}px;height:${ICON_H}px;pointer-events:auto;">
    <svg width="${ICON_W}" height="${ICON_H}" viewBox="0 0 ${ICON_W} ${ICON_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="stemShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" flood-color="black" flood-opacity="0.35"/>
        </filter>
        <filter id="headShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="black" flood-opacity="0.35"/>
        </filter>
      </defs>
      <ellipse cx="${AX}" cy="${AY + 3}" rx="9" ry="3" fill="rgba(0,0,0,0.25)"/>
      <line x1="${hx}" y1="${hy}" x2="${sx}" y2="${sy}" stroke="#8c99a6" stroke-width="${stemW}" stroke-linecap="round" filter="url(#stemShadow)"/>
      <path d="M ${b1x} ${b1y} L ${b2x} ${b2y} L ${AX} ${AY} Z" fill="#c7ccd3"/>
      <g transform="translate(${headShiftX},0)">
        <circle cx="${hx}" cy="${hy}" r="${headR}" fill="${color}" stroke="#fff" stroke-width="${headBorder}" filter="url(#headShadow)"/>
      </g>
    </svg>
    ${includeHalo ? `
      <!-- Tilted ground halo, but positioned with your preferred offsets -->
      <div class="pin-halo pin-halo--ground"
           style="
             position:absolute;
             left:${AX - 0}px;
             top:${AY - 60}px;
             width:60px; height:50px;
             pointer-events:none;
             z-index:-10;
           ">
      </div>
    ` : ''}
  </div>`;
}

/* Small square icon used by PopularSpots */
export function spotIconFor(category = 'hotdog') {
  const emoji = category === 'beef' ? '🥪' : '🌭';
  const html = `
    <div class="spot-icon" style="position:relative; transform: translate(-50%, -100%);">
      <div class="spot-emoji" style="
        font-size:20px; line-height:20px; width:24px; height:24px;
        display:grid; place-items:center;
        background:#111; border:1px solid #2a2f37; border-radius:6px;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
      ">${emoji}</div>
    </div>`;
  return L.divIcon({
    className: 'spot',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

export const SPOT_TOOLTIP_OFFSET = [0, -28];

export const iconFor = (team) =>
  L.divIcon({
    className: `pin pin-${team}`,
    html: pushpinHTMLFor(team, false),
    iconSize: [30, 46],
    iconAnchor: [15, 46],
  });

export const placingIconFor = (team) =>
  L.divIcon({
    className: `pin pin-${team} pin-placing`,
    html: pushpinHTMLFor(team, true),
    iconSize: [30, 46],
    iconAnchor: [15, 46],
  });

/* ---------- Interaction toggles for main map ---------- */
export function disableMainMapInteractions(map) {
  if (!map) return;
  map.dragging?.disable();
  map.scrollWheelZoom?.disable();
  map.touchZoom?.disable();
  map.boxZoom?.disable();
  map.keyboard?.disable();
}

export function enableMainMapInteractions(map) {
  if (!map) return;
  map.dragging?.enable();
  map.scrollWheelZoom?.enable();
  map.touchZoom?.enable();
  map.boxZoom?.enable();
  map.keyboard?.enable();
}

/* ---------- Mode helpers (no bounds applied) ---------- */
export function setChicagoMode(map) {
  if (!map) return;
  map.setMinZoom(CHI_MIN_ZOOM);
  map.setMaxZoom(CHI_MAX_ZOOM);
  map.setMaxBounds(null);
  setTimeout(() => map.invalidateSize(), 300);
}

export function setGlobalMode(map) {
  if (!map) return;
  map.setMaxBounds(null);
  map.setMinZoom(2);
  map.setMaxZoom(19);
  setTimeout(() => map.invalidateSize(), 300);
}