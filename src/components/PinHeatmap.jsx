// src/components/PinHeatmap.jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * PinHeatmap renders a heatmap layer for pins when zoomed out.
 */
export default function PinHeatmap({
  pins = [],
  enabled = true,
  minZoomForPins = 13, // when zoom < this => show heatmap
  radius = 25,
  blur = 15,
  intensity = 0.8,
  max = 2.0,
}) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !map) return;

    // Get current zoom
    const zoom = map.getZoom();

    // Only show heatmap when zoomed out
    if (zoom >= minZoomForPins) {
      // Remove heatmap if it exists
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Build heatmap data points
    const heatPoints = [];
    for (const p of pins) {
      if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) {
        // Format: [lat, lng, intensity]
        heatPoints.push([p.lat, p.lng, intensity]);
      }
    }

    // Remove old layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heatmap layer
    if (heatPoints.length > 0) {
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: radius,
        blur: blur,
        maxZoom: minZoomForPins,
        max: max,
        gradient: {
          0.0: '#3b82f6',
          0.5: '#f59e0b',
          1.0: '#ef4444'
        }
      }).addTo(map);

      // Make heatmap non-interactive so clicks pass through
      if (heatLayerRef.current._container) {
        heatLayerRef.current._container.style.pointerEvents = 'none';
      }
    }

    // Listen for zoom changes
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();
      if (currentZoom >= minZoomForPins && heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      } else if (currentZoom < minZoomForPins && !heatLayerRef.current && heatPoints.length > 0) {
        heatLayerRef.current = L.heatLayer(heatPoints, {
          radius: radius,
          blur: blur,
          maxZoom: minZoomForPins,
          max: max,
          gradient: {
            0.0: '#3b82f6',
            0.5: '#f59e0b',
            1.0: '#ef4444'
          }
        }).addTo(map);

        // Make heatmap non-interactive so clicks pass through
        if (heatLayerRef.current._container) {
          heatLayerRef.current._container.style.pointerEvents = 'none';
        }
      }
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [pins, enabled, map, minZoomForPins, radius, blur, intensity, max]);

  return null;
}
