// src/components/SubMapModal.jsx
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { placingIconFor, boundsForMiles } from '../lib/mapUtils';
import DragTip from './DragTip';

function Boot({ pos, setPos, pageTile, handoff, onPointerUpCommit }) {
  const map = useMap();
  const markerRef = useRef(null);
  const dragTimeoutRef = useRef(null);

  // Create marker on mount
  useEffect(() => {
    if (!map) {
      console.warn('Boot: map not available');
      return;
    }

    console.log('Boot: Creating marker at', pos);

    // Create marker
    const initialPos = pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)
      ? pos
      : handoff;

    if (!initialPos || !Number.isFinite(initialPos.lat) || !Number.isFinite(initialPos.lng)) {
      console.error('Boot: Invalid initial position', initialPos);
      return;
    }

    const marker = L.marker([initialPos.lat, initialPos.lng], {
      icon: placingIconFor(pageTile),
      draggable: true,
      autoPan: false,
    }).addTo(map);

    markerRef.current = marker;
    console.log('Boot: Marker created and added to map');

    // Set initial view
    const bounds = boundsForMiles(initialPos, 0.25); // 1/4 mile for fine-tune
    map.fitBounds(bounds, { animate: false });

    // Small delay to ensure map is ready, then invalidate size
    setTimeout(() => {
      map.invalidateSize();
      map.setView([initialPos.lat, initialPos.lng], map.getZoom(), { animate: false });
    }, 50);

    // Handle dragging
    const onDrag = () => {
      const ll = marker.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        setPos({ lat: ll.lat, lng: ll.lng });
        // Keep marker centered while dragging
        map.panTo([ll.lat, ll.lng], { animate: false });
      }
    };

    const onDragEnd = () => {
      const ll = marker.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        setPos({ lat: ll.lat, lng: ll.lng });
        // Auto-commit after short delay
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = setTimeout(() => {
          console.log('Boot: Auto-committing position', ll);
          onPointerUpCommit({ lat: ll.lat, lng: ll.lng });
        }, 300);
      }
    };

    marker.on('drag', onDrag);
    marker.on('dragend', onDragEnd);

    // Handle zoom - keep marker centered
    const onZoom = () => {
      const ll = marker.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        map.setView([ll.lat, ll.lng], map.getZoom(), { animate: false });
      }
    };

    map.on('zoom', onZoom);

    // Cleanup
    return () => {
      console.log('Boot: Cleaning up marker');
      marker.off('drag', onDrag);
      marker.off('dragend', onDragEnd);
      map.off('zoom', onZoom);
      marker.remove();
      markerRef.current = null;
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, [map]); // Only recreate if map changes

  return <DragTip pos={pos} />;
}

function SetSubMapRef({ submapRef }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      submapRef.current = map;
      console.log('SetSubMapRef: submapRef.current set to', map);
    } else {
      console.warn('SetSubMapRef: map is not available');
    }
  }, [map, submapRef]);
  return null;
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

  // Invalidate submap size when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (submapRef.current) {
        submapRef.current.invalidateSize();
        console.log('SubMapModal: invalidateSize called');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
        <div className="submap-map">
          <MapContainer
            center={center}
            zoom={baseZoom || 15}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            scrollWheelZoom={true}
            touchZoom={true}
            doubleClickZoom={true}
            aria-label="Fine-tune map"
          >
            <SetSubMapRef submapRef={submapRef} />
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
            />
          </MapContainer>
        </div>
        <div className="submap-help">
          Drag the pin to fine-tune its position, or pinch to zoom. Tap Done to confirm.
        </div>
      </div>
    </div>
  );
}