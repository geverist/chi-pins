// src/components/SubMapModal.jsx
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { placingIconFor, boundsForMiles } from '../lib/mapUtils';
import DragTip from './DragTip';

function Boot({ pos, setPos, pageTile, handoff, onPointerUpCommit }) {
  const map = useMap();
  const markerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragTimeoutRef = useRef(null);

  // Create marker on mount
  useEffect(() => {
    if (!map) {
      console.warn('Boot: map not available');
      return;
    }

    console.log('Boot: Creating marker with pos=', pos, 'handoff=', handoff);

    // Use pos (which should be the lat/lng)
    const initialPos = pos;

    if (!initialPos || !Number.isFinite(initialPos.lat) || !Number.isFinite(initialPos.lng)) {
      console.error('Boot: Invalid initial position', initialPos);
      return;
    }

    console.log('Boot: Using position', initialPos);

    // Create marker (non-draggable, we'll handle dragging manually)
    const marker = L.marker([initialPos.lat, initialPos.lng], {
      icon: placingIconFor(pageTile),
      draggable: false,
      autoPan: false,
      interactive: true,
      bubblingMouseEvents: false,
    }).addTo(map);

    markerRef.current = marker;
    console.log('Boot: Marker created and added to map at', [initialPos.lat, initialPos.lng]);
    console.log('Boot: Marker element:', marker.getElement());

    // Force marker to be visible
    const markerEl = marker.getElement();
    if (markerEl) {
      markerEl.style.pointerEvents = 'auto';
      markerEl.style.cursor = 'move';
      markerEl.style.zIndex = '10000';
      console.log('Boot: Marker element styled');
    }

    // Set initial view
    const bounds = boundsForMiles(initialPos, 0.25); // 1/4 mile for fine-tune
    map.fitBounds(bounds, { animate: false });

    // Small delay to ensure map is ready, then invalidate size
    setTimeout(() => {
      map.invalidateSize();
      map.setView([initialPos.lat, initialPos.lng], map.getZoom(), { animate: false });
    }, 50);

    // If we have handoff coordinates, start dragging immediately
    if (handoff && Number.isFinite(handoff.x) && Number.isFinite(handoff.y)) {
      console.log('Boot: Starting with handoff, beginning drag immediately');
      isDraggingRef.current = true;
    }

    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      e.preventDefault();
      e.stopPropagation();
      console.log('Boot: Drag started on marker');
    };

    const onPointerMove = (e) => {
      if (!isDraggingRef.current || !markerRef.current) return;

      // Get map container position
      const mapContainer = map.getContainer();
      const rect = mapContainer.getBoundingClientRect();

      // Calculate coordinates relative to map container
      const containerX = e.clientX - rect.left;
      const containerY = e.clientY - rect.top;

      // Convert to lat/lng
      const point = map.containerPointToLatLng([containerX, containerY]);

      if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
        // Move marker to cursor position WITHOUT panning the map
        markerRef.current.setLatLng(point);
        // Update position state
        setPos({ lat: point.lat, lng: point.lng });
      }
    };

    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      console.log('Boot: Drag ended');

      const ll = markerRef.current.getLatLng();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        setPos({ lat: ll.lat, lng: ll.lng });
        // Center map on final position
        map.panTo([ll.lat, ll.lng], { animate: true });
        // Auto-commit after short delay
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = setTimeout(() => {
          console.log('Boot: Auto-committing position', ll);
          onPointerUpCommit({ lat: ll.lat, lng: ll.lng });
        }, 300);
      }
    };

    // Attach pointerdown only to marker, move/up to window
    markerEl.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

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
      if (markerEl) {
        markerEl.removeEventListener('pointerdown', onPointerDown);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
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
  const [pos, setPos] = useState(center);
  const [tilesLoading, setTilesLoading] = useState(true);

  console.log('SubMapModal rendering with:', { center, handoff, team, baseZoom, pos });

  useEffect(() => {
    console.log('SubMapModal: Setting initial position to center', center);
    setPos(center);
  }, [center]);

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
            onClick={() => onCommit(pos)}
            aria-label="Confirm pin placement"
          >
            Done
          </button>
        </div>
        <div className="submap-map" style={{ position: 'relative' }}>
          {tilesLoading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(22, 24, 29, 0.9)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 10000,
              color: '#fff',
              fontSize: '14px'
            }}>
              Loading map...
            </div>
          )}
          <MapContainer
            center={center && Number.isFinite(center.lat) && Number.isFinite(center.lng) ? [center.lat, center.lng] : [41.8781, -87.6298]}
            zoom={baseZoom || 15}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            scrollWheelZoom={true}
            touchZoom={true}
            doubleClickZoom={true}
            aria-label="Fine-tune map"
            whenCreated={(map) => {
              console.log('MapContainer created:', map);
              submapRef.current = map;
              setTimeout(() => {
                map.invalidateSize();
                console.log('MapContainer size invalidated');
              }, 100);

              // Listen for tile load events
              let tilesLoaded = 0;
              const onTileLoad = () => {
                tilesLoaded++;
                if (tilesLoaded >= 3) { // Wait for at least 3 tiles
                  setTilesLoading(false);
                }
              };
              map.on('tileload', onTileLoad);
              map.on('tileerror', onTileLoad); // Count errors as loaded too

              // Fallback: hide loading after 2 seconds regardless
              setTimeout(() => setTilesLoading(false), 2000);
            }}
          >
            <SetSubMapRef submapRef={submapRef} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Boot
              pos={pos}
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