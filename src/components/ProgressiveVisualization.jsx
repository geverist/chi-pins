// src/components/ProgressiveVisualization.jsx
// Progressive pin visualization that transitions based on zoom level:
// - Very zoomed out (< heatmapZoom): Show heatmap
// - Medium zoom (heatmapZoom to bubbleZoom): Show bubble clusters with counts
// - Zoomed in (>= bubbleZoom): Show individual pins (handled by SavedPins)

import { useEffect, useMemo, useRef, useState } from 'react';
import { LayerGroup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import Supercluster from 'supercluster';

/** Bubble icon for clusters */
function bubbleIcon(count) {
  const size =
    count >= 200 ? 52 :
    count >= 100 ? 46 :
    count >= 50  ? 40 :
    count >= 20  ? 34 :
    count >= 10  ? 28 : 24;

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
  `;
  return L.divIcon({
    className: 'cluster-bubble',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ProgressiveVisualization({
  pins = [],
  enabled = true,
  heatmapZoom = 11,      // Below this: show heatmap
  bubbleZoom = 13,       // Below this (but >= heatmapZoom): show bubbles
  maxZoom = 17,
  // Heatmap settings
  radius = 25,
  blur = 15,
  intensity = 0.8,
  max = 2.0,
}) {
  const map = useMap();
  const heatLayerRef = useRef(null);
  const indexRef = useRef(null);
  const [indexReady, setIndexReady] = useState(false);
  const [zoom, setZoom] = useState(() => map?.getZoom?.() ?? 12);
  const [bounds, setBounds] = useState(() => map?.getBounds?.() ?? null);

  // Build supercluster index for bubbles
  const points = useMemo(() => {
    const items = [];
    for (const p of pins || []) {
      if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) continue;
      items.push({
        type: 'Feature',
        properties: { __id: p.slug || p.id || `${p.lat},${p.lng}` },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      });
    }
    return items;
  }, [pins]);

  useEffect(() => {
    if (!points.length) {
      indexRef.current = null;
      setIndexReady(false);
      return;
    }
    indexRef.current = new Supercluster({
      radius: 64,
      maxZoom,
    }).load(points);
    setIndexReady(true);
  }, [points, maxZoom]);

  // Track map view changes
  useEffect(() => {
    if (!map) return;
    const update = () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    };
    map.on('moveend', update);
    map.on('zoomend', update);
    update();
    return () => {
      map.off('moveend', update);
      map.off('zoomend', update);
    };
  }, [map]);

  // Manage heatmap layer
  useEffect(() => {
    if (!enabled || !map) return;

    // Remove heatmap if zoom is too high
    if (zoom >= heatmapZoom) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Build heatmap data
    const heatPoints = [];
    for (const p of pins) {
      if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) {
        heatPoints.push([p.lat, p.lng, intensity]);
      }
    }

    if (heatPoints.length === 0) return;

    // Remove old heatmap
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heatmap
    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: radius,
      blur: blur,
      maxZoom: heatmapZoom,
      max: max,
      gradient: {
        0.0: '#3b82f6',
        0.5: '#f59e0b',
        1.0: '#ef4444'
      }
    }).addTo(map);

    // Make non-interactive
    if (heatLayerRef.current._container) {
      heatLayerRef.current._container.style.pointerEvents = 'none';
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [pins, enabled, map, zoom, heatmapZoom, radius, blur, intensity, max]);

  // Render bubbles if in bubble zoom range
  if (!enabled || !indexReady || !indexRef.current || !bounds) {
    return null;
  }

  // Show bubbles only between heatmapZoom and bubbleZoom
  if (zoom < heatmapZoom || zoom >= bubbleZoom) {
    return null;
  }

  // Compute clusters for current viewport
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const clusters = indexRef.current.getClusters(bbox, Math.floor(zoom));

  return (
    <LayerGroup>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        const isCluster = c.properties.cluster === true;

        if (!isCluster) {
          // Single pin shown as bubble with "1"
          const onClick = () => {
            map.flyTo([lat, lng], bubbleZoom, { duration: 0.6 });
          };
          return (
            <Marker
              key={c.properties.__id}
              position={[lat, lng]}
              icon={bubbleIcon(1)}
              eventHandlers={{ click: onClick }}
            />
          );
        }

        const count = c.properties.point_count;
        const clusterId = c.properties.cluster_id;

        const onClick = () => {
          const expZoom = indexRef.current.getClusterExpansionZoom(clusterId);
          map.flyTo([lat, lng], Math.max(expZoom, bubbleZoom), { duration: 0.6 });
        };

        return (
          <Marker
            key={`cluster-${clusterId}`}
            position={[lat, lng]}
            icon={bubbleIcon(count)}
            eventHandlers={{ click: onClick }}
          />
        );
      })}
    </LayerGroup>
  );
}
