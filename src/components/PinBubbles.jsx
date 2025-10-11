// src/components/PinBubbles.jsx
import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { LayerGroup, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import Supercluster from 'supercluster'

/** Simple, readable bubble icon (no rectangles) */
function bubbleIcon(count) {
  const size =
    count >= 200 ? 52 :
    count >= 100 ? 46 :
    count >= 50  ? 40 :
    count >= 20  ? 34 :
    count >= 10  ? 28 : 24

  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background: radial-gradient(circle at 30% 30%, #3a7cf4, #1f5bd8);
      border:2px solid rgba(255,255,255,0.9);
      color:#fff; display:grid; place-items:center;
      font-weight:800; text-shadow:0 1px 2px rgba(0,0,0,0.35);
      box-shadow:0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
    ">
      ${count}
    </div>
  `
  return L.divIcon({
    className: 'cluster-bubble',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/**
 * PinBubbles renders cluster bubbles when zoomed out.
 * It does NOT render individual pins; SavedPins will handle those when zoomed in.
 */
function PinBubbles({
  pins = [],
  enabled = true,
  minZoomForPins = 13,     // when zoom < this => show bubbles
  maxZoom = 17,
}) {
  const map = useMap()
  const indexRef = useRef(null)
  const [indexReady, setIndexReady] = useState(false)
  const [view, setView] = useState(() => ({
    zoom: map?.getZoom?.() ?? 12,
    bounds: map?.getBounds?.() ?? null,
  }))

  // Build index (supercluster expects GeoJSON points with [lng,lat])
  const points = useMemo(() => {
    const items = []
    for (const p of pins || []) {
      if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) continue
      items.push({
        type: 'Feature',
        properties: { __id: p.slug || p.id || `${p.lat},${p.lng}` },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })
    }
    return items
  }, [pins])

  useEffect(() => {
    console.log('PinBubbles: Building index with', points.length, 'points');
    if (!points.length) {
      indexRef.current = null;
      setIndexReady(false);
      console.log('PinBubbles: No points, index cleared');
      return;
    }
    indexRef.current = new Supercluster({
      radius: 64,          // px
      maxZoom,             // up to Leaflet's practical max
    }).load(points)
    setIndexReady(true);
    console.log('PinBubbles: Index built successfully, triggering re-render');
  }, [points, maxZoom])

  // Track map view
  useEffect(() => {
    if (!map) return
    const update = () => setView({
      zoom: map.getZoom(),
      bounds: map.getBounds(),
    })
    map.on('moveend', update)
    map.on('zoomend', update)
    update()
    return () => {
      map.off('moveend', update)
      map.off('zoomend', update)
    }
  }, [map])

  if (!enabled || !indexReady || !indexRef.current || !view.bounds) {
    console.log('PinBubbles: Not rendering -', { enabled, indexReady, hasIndex: !!indexRef.current, hasBounds: !!view.bounds, pinCount: pins.length });
    return null;
  }

  const zoom = view.zoom
  // Only show bubbles when zoomed out
  if (zoom >= minZoomForPins) {
    console.log('PinBubbles: Zoom too high', { zoom, minZoomForPins });
    return null;
  }

  // Compute clusters for current viewport
  const b = view.bounds
  const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
  const clusters = indexRef.current.getClusters(bbox, Math.floor(zoom))
  console.log('PinBubbles: Rendering', { zoom, clusterCount: clusters.length, pinCount: pins.length });

  return (
    <LayerGroup>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates
        const isCluster = c.properties.cluster === true

        if (!isCluster) {
          // For singletons at low zoom we still keep it minimal: tiny bubble with "1"
          const onClick = () => {
            map.flyTo([lat, lng], minZoomForPins, { duration: 0.6 })
          }
          return (
            <Marker
              key={c.properties.__id}
              position={[lat, lng]}
              icon={bubbleIcon(1)}
              eventHandlers={{ click: onClick }}
            />
          )
        }

        const count = c.properties.point_count
        const clusterId = c.properties.cluster_id

        // When clicking a bubble, zoom in to its expansion zoom
        const onClick = () => {
          const expZoom = indexRef.current.getClusterExpansionZoom(clusterId)
          // small easing nudge to center on it
          map.flyTo([lat, lng], Math.max(expZoom, minZoomForPins), { duration: 0.6 })
        }

        return (
          <Marker
            key={`cluster-${clusterId}`}
            position={[lat, lng]}
            icon={bubbleIcon(count)}
            eventHandlers={{ click: onClick }}
          />
        )
      })}
    </LayerGroup>
  )
}

// Memoize PinBubbles to prevent expensive re-clustering when props haven't changed
export default memo(PinBubbles, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.pins === nextProps.pins &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.minZoomForPins === nextProps.minZoomForPins &&
    prevProps.maxZoom === nextProps.maxZoom
  )
})
