// src/lib/mapUtils.js
import L from 'leaflet';
import { getPinStyle, getPinImageUrl } from '../config/pinStyles';

/* ---------- Camera / bounds constants ---------- */
export const CHI = { lat: 41.8781, lng: -87.6298 };
export const CHI_BOUNDS = L.latLngBounds([41.3, -88.8], [42.8, -87.0]);
export const CHI_MIN_ZOOM = 9; // Allow zoom 9 to show full metro (Kenosha to Joliet)
export const CHI_MAX_ZOOM = 17;
export const USA = { lat: 37.0902, lng: -95.7129 };
export const GLOBAL_ZOOM = 4;
export const GLOBAL_MAX_ZOOM = 16; // Limit to prevent gray tiles in areas with limited OSM coverage
export const INITIAL_RADIUS_MILES = 0.5;

// Lake Michigan shoreline polygon (western boundary)
// Traced from south to north along the Chicago lakefront
// Includes 0.01 degree (~0.5 mile) buffer inland to prevent pins near water's edge
const SHORELINE_BUFFER = 0.01; // ~0.5 miles inland buffer

export const LAKE_MICHIGAN_SHORELINE = [
  // Indiana border (south) - with buffer
  [41.60, -87.52 + SHORELINE_BUFFER],
  // South Chicago
  [41.65, -87.53 + SHORELINE_BUFFER],
  [41.70, -87.54 + SHORELINE_BUFFER],
  [41.73, -87.55 + SHORELINE_BUFFER],
  // Hyde Park
  [41.78, -87.58 + SHORELINE_BUFFER],
  [41.79, -87.59 + SHORELINE_BUFFER],
  // Museum Campus
  [41.86, -87.61 + SHORELINE_BUFFER],
  // Streeterville / Navy Pier
  [41.88, -87.61 + SHORELINE_BUFFER],
  [41.89, -87.61 + SHORELINE_BUFFER],
  // Gold Coast
  [41.90, -87.62 + SHORELINE_BUFFER],
  [41.91, -87.63 + SHORELINE_BUFFER],
  // Lincoln Park
  [41.92, -87.64 + SHORELINE_BUFFER],
  [41.93, -87.64 + SHORELINE_BUFFER],
  [41.94, -87.65 + SHORELINE_BUFFER],
  // Uptown
  [41.96, -87.65 + SHORELINE_BUFFER],
  [41.97, -87.65 + SHORELINE_BUFFER],
  // Edgewater
  [41.98, -87.66 + SHORELINE_BUFFER],
  [41.99, -87.66 + SHORELINE_BUFFER],
  // Rogers Park
  [42.00, -87.66 + SHORELINE_BUFFER],
  [42.01, -87.66 + SHORELINE_BUFFER],
  // Evanston
  [42.04, -87.67 + SHORELINE_BUFFER],
  [42.05, -87.67 + SHORELINE_BUFFER],
  // Wilmette
  [42.07, -87.68 + SHORELINE_BUFFER],
  [42.08, -87.69 + SHORELINE_BUFFER],
  // Winnetka
  [42.10, -87.69 + SHORELINE_BUFFER],
  // Glencoe
  [42.13, -87.70 + SHORELINE_BUFFER],
  // Highland Park
  [42.18, -87.70 + SHORELINE_BUFFER],
  // Lake Forest
  [42.24, -87.68 + SHORELINE_BUFFER],
  // Waukegan
  [42.35, -87.82 + SHORELINE_BUFFER],
  [42.40, -87.82 + SHORELINE_BUFFER],
  // Zion / Illinois Beach
  [42.45, -87.81 + SHORELINE_BUFFER],
  [42.48, -87.81 + SHORELINE_BUFFER],
  // Wisconsin border (north)
  [42.50, -87.80 + SHORELINE_BUFFER],
];

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

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];

    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a location is in Lake Michigan
 * Uses polygon boundary traced along the Chicago lakefront
 */
export function isInLakeMichigan(lat, lng) {
  // Quick bounds check first - only check the Chicago metro area
  if (lat < 41.6 || lat > 42.5 || lng < -88.0 || lng > -86.0) {
    return false;
  }

  // Create polygon: Illinois shoreline (west) + Michigan shoreline (east) + Indiana shoreline (south)
  // Michigan shoreline points (eastern boundary) - western shore of Michigan facing the lake
  // Going from north to south, following the actual Michigan coastline
  const michiganShoreline = [
    [42.50, -86.25],  // Wisconsin-Michigan border area
    [42.48, -86.26],
    [42.45, -86.27],
    [42.40, -86.28],
    [42.35, -86.29],
    [42.30, -86.30],
    [42.25, -86.30],
    [42.20, -86.30],
    [42.15, -86.30],
    [42.10, -86.29],
    [42.05, -86.28],
    [42.00, -86.27],  // Muskegon area
    [41.95, -86.26],
    [41.90, -86.25],
    [41.85, -86.24],
    [41.80, -86.23],
    [41.75, -86.22],
    [41.70, -86.21],
    [41.65, -86.20],
    [41.60, -86.85],  // Indiana-Michigan border on lake shore
  ];

  // Indiana shoreline (southern boundary) - going west along Indiana's lakefront
  const indianaShoreline = [
    [41.60, -87.00],  // Eastern Indiana shore
    [41.60, -87.30],  // Central Indiana shore near Gary
    [41.60, -87.52 + SHORELINE_BUFFER],  // Connect to Illinois border
  ];

  const polygon = [
    ...LAKE_MICHIGAN_SHORELINE,  // West side (Illinois): south to north
    ...michiganShoreline,         // East side (Michigan): north to south
    ...indianaShoreline,          // South side (Indiana): east to west
    // Auto-closes back to first point of LAKE_MICHIGAN_SHORELINE
  ];

  return pointInPolygon(lat, lng, polygon);
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
export function resetToChicagoOverview(map, options = {}) {
  if (!map) return;
  const { skipInvalidate = true } = options; // Skip invalidateSize by default to prevent tile refresh

  map.setMinZoom(CHI_MIN_ZOOM);
  map.setMaxZoom(CHI_MAX_ZOOM);
  map.setMaxBounds(null);
  map.fitBounds(CHI_BOUNDS, { animate: true });

  // Only invalidate size if explicitly requested (e.g., after window resize)
  if (!skipInvalidate) {
    setTimeout(() => map.invalidateSize(), 300);
  }
}

/** Center + fit an N-mile box (defensive center). */
export function centerAndFitMiles(map, center, miles) {
  if (!map) return;
  const c = (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) ? center : CHI;
  const b = boundsForMiles(c, miles);
  map.fitBounds(b, { animate: true });
  const z = map.getZoom();
  map.setView([c.lat, c.lng], z, { animate: true });
  // Skip invalidateSize to prevent tile refresh
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

export function pushpinHTMLFor(team = 'other', includeHalo = false, pinStyle = null) {
  // Use pin style colors if available
  let color = TEAM_COLOR[team] || TEAM_COLOR.other;
  let imageUrl = null;

  // Override with custom pin style color and image if available
  if (pinStyle) {
    const style = getPinStyle(pinStyle);
    if (style?.colors?.primary) {
      color = style.colors.primary;
    }
    if (style?.imageUrl) {
      imageUrl = style.imageUrl;
    }
  }

  // Make pin head MUCH larger when displaying custom images (3x larger)
  const hasCustomImage = !!imageUrl;
  const ICON_W = hasCustomImage ? 50 : 30;
  const ICON_H = hasCustomImage ? 70 : 46;
  const AX = ICON_W / 2, AY = ICON_H;
  const headR = hasCustomImage ? 18 : 10;  // 3x larger head for custom images
  const headBorder = 2;
  const stemW = hasCustomImage ? 4 : 3;
  const stemLen = hasCustomImage ? 34 : 22;  // Longer stem for larger head
  const tipLen = hasCustomImage ? 8 : 6;
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

  // If custom image URL is available, use clipPath to show image in circle
  const headContent = imageUrl
    ? `
      <defs>
        <clipPath id="circleClip-${pinStyle}">
          <circle cx="${hx}" cy="${hy}" r="${headR - headBorder}"/>
        </clipPath>
      </defs>
      <circle cx="${hx}" cy="${hy}" r="${headR}" fill="${color}" stroke="#fff" stroke-width="${headBorder}" filter="url(#headShadow)"/>
      <image
        href="${imageUrl}"
        x="${hx - headR + headBorder}"
        y="${hy - headR + headBorder}"
        width="${(headR - headBorder) * 2}"
        height="${(headR - headBorder) * 2}"
        clip-path="url(#circleClip-${pinStyle})"
      />
    `
    : `<circle cx="${hx}" cy="${hy}" r="${headR}" fill="${color}" stroke="#fff" stroke-width="${headBorder}" filter="url(#headShadow)"/>`;

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
      <circle cx="${AX}" cy="${AY + 3}" r="9" fill="rgba(0,0,0,0.25)"/>
      <line x1="${hx}" y1="${hy}" x2="${sx}" y2="${sy}" stroke="#8c99a6" stroke-width="${stemW}" stroke-linecap="round" filter="url(#stemShadow)"/>
      <path d="M ${b1x} ${b1y} L ${b2x} ${b2y} L ${AX} ${AY} Z" fill="#c7ccd3"/>
      <g transform="translate(${headShiftX},0)">
        ${headContent}
      </g>
    </svg>
    ${includeHalo ? `
      <!-- Ripple halo at the bottom tip of the pin where it touches the map -->
      <div style="
             position:absolute;
             left:50%;
             top:100%;
             width:80px;
             height:80px;
             transform:translate(-50%, -50%);
             pointer-events:none;
             z-index:-1;
           ">
        <!-- Outer ripple -->
        <div style="
          position:absolute;
          top:50%; left:50%;
          width:100%; height:100%;
          border-radius:50%;
          border:3px solid ${color};
          opacity:0.6;
          transform:translate(-50%, -50%);
          animation:ripple 2s ease-out infinite;
        "></div>
        <!-- Middle ripple -->
        <div style="
          position:absolute;
          top:50%; left:50%;
          width:100%; height:100%;
          border-radius:50%;
          border:2px solid ${color};
          opacity:0.5;
          transform:translate(-50%, -50%);
          animation:ripple 2s ease-out infinite 0.6s;
        "></div>
        <!-- Inner ripple -->
        <div style="
          position:absolute;
          top:50%; left:50%;
          width:100%; height:100%;
          border-radius:50%;
          border:2px solid ${color};
          opacity:0.4;
          transform:translate(-50%, -50%);
          animation:ripple 2s ease-out infinite 1.2s;
        "></div>
        <style>
          @keyframes ripple {
            0% {
              transform:translate(-50%, -50%) scale(0.3);
              opacity:0.8;
            }
            100% {
              transform:translate(-50%, -50%) scale(2.5);
              opacity:0;
            }
          }
        </style>
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

export const iconFor = (teamOrPin) => {
  // Support both old API (team string) and new API (pin object)
  const team = typeof teamOrPin === 'string' ? teamOrPin : (teamOrPin?.team || 'other');
  const pinStyle = typeof teamOrPin === 'object' ? teamOrPin?.pinStyle : null;

  // Check if pin style has custom image to determine size
  const hasCustomImage = pinStyle && getPinStyle(pinStyle)?.imageUrl;
  const iconWidth = hasCustomImage ? 50 : 30;
  const iconHeight = hasCustomImage ? 70 : 46;

  return L.divIcon({
    className: `pin pin-${pinStyle || team}`,
    html: pushpinHTMLFor(team, false, pinStyle),
    iconSize: [iconWidth, iconHeight],
    iconAnchor: [iconWidth / 2, iconHeight],
  });
};

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
  // Skip invalidateSize to prevent tile refresh
}

export function setGlobalMode(map) {
  if (!map) return;
  map.setMaxBounds(null);
  map.setMinZoom(2);
  map.setMaxZoom(GLOBAL_MAX_ZOOM);
  // Skip invalidateSize to prevent tile refresh
}