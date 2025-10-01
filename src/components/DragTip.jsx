// src/components/DragTip.jsx
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function DragTip({ pos }) {
  const map = useMap();
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!map || !pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;

    let tooltip = tooltipRef.current;
    if (!tooltip) {
      tooltip = L.tooltip({
        className: 'drag-tip',
        offset: [0, -40], // Above pin
        direction: 'top',
        permanent: true,
      })
        .setContent('Drag to adjust')
        .setLatLng([pos.lat, pos.lng])
        .addTo(map);
      tooltipRef.current = tooltip;
    } else {
      tooltip.setLatLng([pos.lat, pos.lng]);
    }

    return () => {
      if (tooltip) {
        tooltip.remove();
        tooltipRef.current = null;
      }
    };
  }, [map, pos]);

  return null;
}