// src/components/PopularSpotsOverlay.jsx
import { useEffect, useMemo, useState } from 'react'
import { LayerGroup, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import { CHI_BOUNDS } from '../lib/mapUtils'

const FALLBACK_SPOTS = [
  // Hot dogs
  { id: 'genejudes',    name: "Gene & Jude's",                     category: 'hotdog', lat: 41.92757, lng: -87.85537 },
  { id: 'superdawg',    name: 'Superdawg Drive-In',                category: 'hotdog', lat: 41.99559, lng: -87.78750 },
  { id: 'viennabeef',   name: 'Vienna Beef Factory Store',         category: 'hotdog', lat: 41.91315, lng: -87.67062 },
  { id: 'wienercircle', name: 'The Wiener’s Circle',               category: 'hotdog', lat: 41.93233, lng: -87.64409 },
  { id: 'jimmys',       name: "Jimmy's Red Hots",                  category: 'hotdog', lat: 41.90022, lng: -87.73937 },
  { id: 'jimsoriginal', name: "Jim’s Original (Maxwell St.)",      category: 'hotdog', lat: 41.86660, lng: -87.64730 },
  { id: 'maxwelldepot', name: "Maxwell Street Depot (Bridgeport)", category: 'hotdog', lat: 41.83700, lng: -87.63800 },
  // Italian beef
  { id: 'johnnies',     name: "Johnnie's Beef",                    category: 'beef',   lat: 41.90238, lng: -87.82457 },
  { id: 'alsbeef',      name: "Al's #1 Italian Beef (Taylor)",     category: 'beef',   lat: 41.86958, lng: -87.64632 },
  { id: 'portillos',    name: "Portillo's (Clark & Ontario)",      category: 'beef',   lat: 41.89238, lng: -87.63187 },
  { id: 'mrbeef',       name: 'Mr. Beef on Orleans',               category: 'beef',   lat: 41.89280, lng: -87.63569 },
  { id: 'popsmtgreen',  name: "Pop’s Italian Beef (Mt. Greenwood)",category: 'beef',   lat: 41.70690, lng: -87.70050 },
  // Pizza
  { id: 'vitonicks',    name: "Vito & Nick’s",                     category: 'pizza',  lat: 41.73686, lng: -87.72119 },
  { id: 'palermos',     name: "Palermo's 95th",                    category: 'pizza',  lat: 41.72158, lng: -87.70058 },
  { id: 'rosangelas',   name: "Rosangela’s",                       category: 'pizza',  lat: 41.72084, lng: -87.70183 },
  { id: 'aurelios',     name: "Aurelio’s Pizza (Homewood)",        category: 'pizza',  lat: 41.55974, lng: -87.66262 },
  { id: 'pequods',      name: "Pequod’s Pizza (Lincoln Park)",     category: 'pizza',  lat: 41.91877, lng: -87.66380 },
]

// Normalize DB/category values into one of: 'hotdog' | 'beef' | 'pizza'
function toKind(category, name = '') {
  let t = (category ?? '').toString().toLowerCase().trim()
  if (t === 'italian_beef' || t === 'italian-beef') t = 'beef'
  if (!['hotdog', 'beef', 'pizza'].includes(t)) {
    const n = name.toLowerCase()
    if (n.includes('beef')) t = 'beef'
    else if (n.includes('pizza')) t = 'pizza'
    else t = 'hotdog'
  }
  return t
}

function makeBizIcon(kind = 'hotdog', isClickable = false) {
  const emoji = kind === 'beef' ? '🥩' : (kind === 'pizza' ? '🍕' : '🌭')
  const bg =   kind === 'beef' ? '#7b4a2b' : (kind === 'pizza' ? '#cc1b1b' : '#2a6ae0')
  const cursor = isClickable ? 'pointer' : 'default'

  return L.divIcon({
    className: `biz-pin biz-${kind}`,
    iconSize: [50, 60], // Increased from 30x42 for larger clickable area
    iconAnchor: [25, 60], // Adjusted anchor point
    html: `
      <div style="position:relative;width:50px;height:60px;cursor:${cursor};">
        <!-- Larger invisible clickable area -->
        <div style="
          position:absolute;left:0;top:0;width:100%;height:100%;
          z-index:1;
        "></div>
        <!-- Visual pin -->
        <div style="
          position:absolute;left:15px;top:10px;width:20px;height:20px;
          background:${bg};color:#fff;border:2px solid #fff;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 2px rgba(0,0,0,0.35);font-size:14px;line-height:1;
          z-index:2;
          ${isClickable ? 'transition: transform 0.2s;' : ''}"
          class="biz-pin-icon">${emoji}</div>
        <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;left:0;top:0;z-index:0;">
          <circle cx="25" cy="54" r="12" fill="rgba(0,0,0,0.25)"/>
          <line x1="25" y1="32" x2="25" y2="50" stroke="#8c99a6" stroke-width="3" stroke-linecap="round"/>
          <path d="M 23 50 L 27 50 L 25 58 Z" fill="#c7ccd3"/>
        </svg>
      </div>
      ${isClickable ? `
      <style>
        .biz-pin:hover .biz-pin-icon {
          transform: scale(1.15);
        }
      </style>
      ` : ''}`
  })
}

export default function PopularSpotsOverlay({
  showHotDog = true,
  showItalianBeef = true,
  showPizza = true,
  labelsAbove = true,
  labelStyle = 'pill',   // 'clean' | 'pill'
  minLabelZoom = 12,
  exploring = false,
  onSpotClick = null,
}) {
  const map = useMap()
  const [rows, setRows] = useState(null)
  const [showLabels, setShowLabels] = useState(() => {
    try { return (map?.getZoom?.() ?? 12) >= minLabelZoom } catch { return true }
  })

  // Fetch from `popular_spots` (id, name, category, lat, lng). Falls back to in-file list.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let dbRows = null
      try {
        console.log('[PopularSpotsOverlay] Fetching from popular_spots table...');
        const { data, error } = await supabase
          .from('popular_spots')
          .select('id,name,category,lat,lng')
          .limit(1000)
        if (error) {
          console.warn('[PopularSpotsOverlay] DB error:', error);
        } else if (Array.isArray(data) && data.length > 0) {
          console.log('[PopularSpotsOverlay] Loaded', data.length, 'spots from database');
          dbRows = data;
        } else {
          console.log('[PopularSpotsOverlay] No spots in database, using fallback');
        }
      } catch (err) {
        console.error('[PopularSpotsOverlay] Fetch error:', err);
      }
      if (!cancelled) {
        const spots = dbRows && dbRows.length ? dbRows : FALLBACK_SPOTS;
        console.log('[PopularSpotsOverlay] Setting', spots.length, 'spots');
        setRows(spots);
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Label visibility with zoom
  useEffect(() => {
    if (!map) return
    const update = () => setShowLabels(map.getZoom() >= minLabelZoom)
    map.on('zoomend', update)
    map.on('moveend', update)
    update()
    return () => {
      map.off('zoomend', update)
      map.off('moveend', update)
    }
  }, [map, minLabelZoom])

  const icons = useMemo(() => ({
    hotdog: makeBizIcon('hotdog', exploring),
    beef: makeBizIcon('beef', exploring),
    pizza: makeBizIcon('pizza', exploring),
  }), [exploring])

  const bounds = useMemo(() => CHI_BOUNDS, [])
  const visible = useMemo(() => {
    if (!rows) return []
    return rows
      .map(r => {
        const kind = toKind(r.category, r.name)
        return { ...r, kind }
      })
      .filter(r => {
        if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return false
        if (r.kind === 'hotdog' && !showHotDog) return false
        if (r.kind === 'beef' && !showItalianBeef) return false
        if (r.kind === 'pizza' && !showPizza) return false
        return bounds.contains([r.lat, r.lng])
      })
  }, [rows, showHotDog, showItalianBeef, showPizza, bounds])

  if (!visible.length) return null

  const tooltipClass =
    labelStyle === 'pill' ? 'biz-label biz-label--pill' : 'biz-label biz-label--clean'

  return (
    <LayerGroup>
      {visible.map((r) => {
        const icon = icons[r.kind] || icons.hotdog
        return (
          <Marker
            key={r.id || `${r.name}-${r.lat},${r.lng}`}
            position={[r.lat, r.lng]}
            icon={icon}
            zIndexOffset={500}
            eventHandlers={{
              click: () => {
                if (exploring && onSpotClick) {
                  onSpotClick(r);
                }
              }
            }}
          >
            {showLabels && (
              <Tooltip
                direction="top"
                offset={[0, labelsAbove ? -42 : -6]}
                opacity={1}
                permanent
                interactive={false}
                className={tooltipClass}
              >
                {r.name}
              </Tooltip>
            )}
          </Marker>
        )
      })}
    </LayerGroup>
  )
}
