// src/components/SubMapModal.jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { placingIconFor, boundsForMiles } from '../lib/mapUtils';
import DragTip from './DragTip';

function Boot({ pos, setPos, pageTile, handoff, onPointerUpCommit, mainMapRef, mapReady }) {
  const map = useMap();
  const markerRef = useRef(null);
  const commitRef = useRef(0);
  const activeTouches = useRef({});

  useEffect(() => {
    if (!map || !mapReady) return; // Prevent execution until map is ready

    // Set initial position
    let m = markerRef.current;
    if (!m && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
      m = L.marker([pos.lat, pos.lng], {
        icon: placingIconFor(pageTile),
        draggable: true,
        autoPan: true,
      }).addTo(map);
      markerRef.current = m;
    }

    // Set initial center
    const c = pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng) ? pos : handoff;
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
      const bounds = boundsForMiles(c, 0.25); // 1/4 mile for fine-tune
      map.fitBounds(bounds, { animate: false });
      map.setView([c.lat, c.lng], map.getZoom(), { animate: false });
    }

    // Dragging
    let timeout;
    const update = () => {
      if (!markerRef.current) return;
      const ll = markerRef.current.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        setPos({ lat: ll.lat, lng: ll.lng });
      }
    };
    const commit = () => {
      if (!markerRef.current) return;
      const ll = markerRef.current.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          commitRef.current += 1;
          onPointerUpCommit({ lat: ll.lat, lng: ll.lng });
        }, 200);
      }
    };
    if (m) {
      m.on('drag', update);
      m.on('dragend', commit);
    }

    // Pinch-zoom
    map.on('zoom', () => {
      if (!markerRef.current) return;
      const ll = markerRef.current.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        map.setView([ll.lat, ll.lng], map.getZoom(), { animate: false });
      }
    });

    return () => {
      if (m) {
        m.off('drag', update);
        m.off('dragend', commit);
        m.remove();
      }
      map.off('zoom');
      clearTimeout(timeout);
      markerRef.current = null;
    };
  }, [map, pos, setPos, pageTile, handoff, onPointerUpCommit, mapReady]);

  return <DragTip pos={pos} />;
}

export default function SubMapModal({
  center,
  team = 'cubs',
  handoff,
  mainMapRef,
  baseZoom,
  onCommit,
  mapReady,
}) {
  const submapRef = useRef(null);
  const pos = useRef(handoff || center);
  const setPos = (p) => {
    pos.current = p;
  };

  useEffect(() => {
    pos.current = handoff || center;
  }, [center, handoff]);

  useEffect(() => {
    const m = mainMapRef.current;
    if (m && mapReady) {
      m.invalidateSize();
    }
  }, [mainMapRef, mapReady]);

  return (
    <div className="submap-overlay">
      <div className="submap-card glass">
        <div className="submap-head">
          <span>Fine-tune your pin placement</span>
          <button
            className="submap-close"
            onClick={() => onCommit(pos.current)}
            aria-label="Confirm pin placement"
          >
            Done
          </button>
        </div>
        <MapContainer
          center={center}
          zoom={baseZoom || 15}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          whenCreated={(map) => {
            submapRef.current = map;
          }}
          scrollWheelZoom={false}
          aria-label="Fine-tune map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Boot
            pos={pos.current}
            setPos={setPos}
            pageTile={team}
            handoff={handoff}
            onPointerUpCommit={onCommit}
            mainMapRef={mainMapRef}
            mapReady={mapReady}
          />
        </MapContainer>
        <div className="submap-help">
          Drag the pin to fine-tune its position, or pinch to zoom. Tap Done to confirm.
        </div>
      </div>
    </div>
  );
}
