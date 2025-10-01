   // src/components/MapShell.jsx
   import { useEffect, useMemo, useRef } from 'react';
   import L from 'leaflet';
   import { MapContainer, TileLayer, useMapEvent, useMap } from 'react-leaflet';
   import 'leaflet/dist/leaflet.css';
   import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
   import 'leaflet-control-geocoder';
   import { CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM, USA, GLOBAL_ZOOM } from '../lib/mapUtils';
   import debounce from 'lodash/debounce';

   // Fix default marker icon paths (vite)
   import iconUrl from 'leaflet/dist/images/marker-icon.png';
   import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
   import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
   L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

   /* ---------- one-time CSS injector so ALL text is consistently styled ---------- */
   let __searchCssInjected = false;
   function ensureSearchCss() {
     if (__searchCssInjected || typeof document === 'undefined') return;
     const css = `
       /* Input text + placeholder (high contrast) */
       .map-search-wrap .leaflet-control-geocoder-form input {
         color: #e9eef3 !important;
         background: rgba(0,0,0,0.22) !important;
         border: 1px solid rgba(255,255,255,0.18) !important;
         font-weight: 600 !important;
       }
       .map-search-wrap .leaflet-control-geocoder-form input::placeholder {
         color: #cfd6de !important;
         opacity: 0.95 !important;
       }
       /* Extra placeholder vendor selectors for stubborn browsers */
       .map-search-wrap .leaflet-control-geocoder-form input::-webkit-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }
       .map-search-wrap .leaflet-control-geocoder-form input:-ms-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }
       .map-search-wrap .leaflet-control-geocoder-form input::-ms-input-placeholder { color: #cfd6de !important; opacity: 0.95 !important; }
       /* Results text/links */
       .map-search-wrap .leaflet-control-geocoder-alternatives {
         background: rgba(16,17,20,0.92) !important;
         border: 1px solid rgba(255,255,255,0.14) !important;
         color: #e9eef3 !important;
         border-radius: 10px !important;
         box-shadow: 0 12px 28px rgba(0,0,0,0.35) !important;
         overflow: hidden !important;
         max-height: 50vh !important;
         overscroll-behavior: contain !important;
       }
       .map-search-wrap .leaflet-control-geocoder-alternatives a {
         color: #e9eef3 !important;
         text-decoration: none !important;
         display: block !important;
         padding: 8px 10px !important;
       }
       .map-search-wrap .leaflet-control-geocoder-alternatives li + li a {
         border-top: 1px solid rgba(255,255,255,0.10) !important;
       }
       .map-search-wrap .leaflet-control-geocoder-alternatives a:hover {
         background: rgba(255,255,255,0.06) !important;
       }
       /* Touch-friendly sizing for kiosk */
       @media (min-width: 1920px) {
         .map-search-wrap .leaflet-control-geocoder-form input {
           min-height: 60px !important;
           font-size: 1.25rem !important;
           padding: 12px 48px 12px 12px !important;
         }
         .map-search-clear {
           min-width: 48px !important;
           min-height: 48px !important;
           font-size: 1.5rem !important;
           right: 8px !important;
         }
       }
     `;
     const style = document.createElement('style');
     style.setAttribute('data-map-search-css', '1');
     style.textContent = css;
     document.head.appendChild(style);
     __searchCssInjected = true;
   }

   /* ------------------------ Chicago/global glassy search ------------------------ */
   function GeocoderTopCenter({
     placeholder = 'Search Chicago & nearby…',
     mode = 'chicago',
     clearToken = 0,
   }) {
     const map = useMap();
     const hostRef = useRef(null);
     const shellRef = useRef(null);
     const geocoderRef = useRef(null);
     const inputRef = useRef(null);
     const clearBtnRef = useRef(null);

     const debouncedGeocode = useMemo(
       () =>
         debounce((text) => {
           if (geocoderRef.current && text) {
             console.log('GeocoderTopCenter: Attempting to geocode', text);
             if (typeof geocoderRef.current.geocode === 'function') {
               geocoderRef.current.geocode(text);
             } else {
               console.error('GeocoderTopCenter: geocode is not a function on geocoderRef.current', geocoderRef.current);
             }
           } else {
             console.warn('GeocoderTopCenter: geocoderRef.current is', geocoderRef.current, 'text=', text);
           }
         }, 300),
       []
     );

     useEffect(() => {
       ensureSearchCss();
     }, []);

     useEffect(() => {
       if (!map) {
         console.warn('GeocoderTopCenter: Map not available');
         return;
       }

       // Clean up any existing geocoder to prevent duplicates
       if (hostRef.current) {
         hostRef.current.remove();
         hostRef.current = null;
       }
       if (shellRef.current) {
         shellRef.current.remove();
         shellRef.current = null;
       }
       if (geocoderRef.current) {
         geocoderRef.current.remove();
         geocoderRef.current = null;
       }

       const host = L.DomUtil.create('div', 'map-search-host');
       Object.assign(host.style, {
         position: 'absolute',
         left: '50%',
         top: '10px',
         transform: 'translateX(-50%)',
         zIndex: 3600,
         pointerEvents: 'auto',
         maxWidth: 'min(92vw, 720px)',
         width: 'max-content',
       });
       map.getContainer().appendChild(host);
       hostRef.current = host;

       const shell = L.DomUtil.create('div', 'map-search-wrap glass');
       Object.assign(shell.style, {
         display: 'flex',
         alignItems: 'center',
         gap: '8px',
         padding: '8px 10px',
         borderRadius: '12px',
         backdropFilter: 'blur(6px) saturate(115%)',
         WebkitBackdropFilter: 'blur(6px) saturate(115%)',
         background: 'rgba(16,17,20,0.45)',
         border: '1px solid rgba(255,255,255,0.14)',
         boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
         position: 'relative',
       });
       hostRef.current.appendChild(shell);
       shellRef.current = shell;

       const geocoder = L.Control.geocoder({
         geocoder: mode === 'global'
           ? L.Control.Geocoder.nominatim({
               geocodingQueryParams: {
                 addressdetails: 1,
                 limit: 10,
               },
             })
           : L.Control.Geocoder.nominatim({
               geocodingQueryParams: {
                 viewbox: '-88.5,42.6,-87.3,41.4',
                 bounded: 1,
                 countrycodes: 'us',
                 addressdetails: 1,
                 limit: 10,
               },
             }),
         defaultMarkGeocode: false,
         collapsed: false,
         placeholder: mode === 'global' ? 'Search places worldwide…' : placeholder,
       });
       console.log('GeocoderTopCenter: Geocoder initialized', geocoder);

       geocoder.on('markgeocode', (e) => {
         const center = e?.geocode?.center;
         if (center) {
           const targetZoom = Math.max(map.getZoom() ?? 0, 13);
           map.flyTo(center, targetZoom);
         }
       });

       geocoder.addTo(map);
       geocoderRef.current = geocoder;
       const ctrlEl = geocoder._container;

       shell.appendChild(ctrlEl);
       L.DomEvent.disableClickPropagation(shell);
       L.DomEvent.disableScrollPropagation(shell);

       Object.assign(ctrlEl.style, {
         background: 'transparent',
         border: 'none',
         boxShadow: 'none',
         margin: '0',
         padding: '0',
       });

       const input =
         geocoder._input ||
         ctrlEl.querySelector('input') ||
         ctrlEl.querySelector('.leaflet-control-geocoder-form input');
       inputRef.current = input;
       if (input) {
         input.style.padding = '10px 36px 10px 12px';
         input.style.borderRadius = '10px';
         input.style.outline = 'none';
         input.style.width = 'min(72vw, 520px)';
         input.placeholder = mode === 'global' ? 'Search places worldwide…' : placeholder;
         input.setAttribute('aria-label', mode === 'global' ? 'Search places worldwide' : 'Search Chicago and nearby');
         input.addEventListener('keydown', (ev) => {
           if (ev.key === 'Escape') {
             ev.stopPropagation();
             clearAll();
           }
         });
         input.focus();
       } else {
         console.warn('GeocoderTopCenter: Input not found');
       }

       const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon');
       if (iconBtn) iconBtn.style.display = 'none';

       const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell);
       Object.assign(clearBtn.style, {
         position: 'absolute',
         right: '16px',
         top: '50%',
         transform: 'translateY(-50%)',
         width: '22px',
         height: '22px',
         borderRadius: '50%',
         border: '1px solid rgba(255,255,255,0.25)',
         background: 'rgba(0,0,0,0.35)',
         color: '#e9eef3',
         cursor: 'pointer',
         fontSize: '14px',
         lineHeight: '1',
         display: 'none',
         alignItems: 'center',
         justifyContent: 'center',
         padding: '0',
         zIndex: 3700,
       });
       clearBtn.textContent = '×';
       clearBtn.title = 'Clear';
       clearBtn.setAttribute('aria-label', 'Clear search input');
       clearBtnRef.current = clearBtn;
       L.DomEvent.disableClickPropagation(clearBtn);

       const showHideClear = () => {
         const v = inputRef.current?.value ?? '';
         clearBtn.style.display = v ? 'inline-flex' : 'none';
       };

       function clearAll() {
         const g = geocoderRef.current;
         const i = inputRef.current;
         if (i) {
           i.value = '';
           i.dispatchEvent(new Event('input', { bubbles: true }));
           i.dispatchEvent(new Event('change', { bubbles: true }));
         }
         if (g && g._input) g._input.value = '';
         try {
           g?._clearResults?.();
         } catch {}
         const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives');
         if (list) list.style.display = 'none';
         clearBtn.style.display = 'none';
       }

       clearBtn.addEventListener('click', (ev) => {
         ev.preventDefault();
         ev.stopPropagation();
         clearAll();
         inputRef.current?.focus();
       });

       if (input) {
         const handleInput = (e) => {
           showHideClear();
           debouncedGeocode(e.target.value);
         };
         input.addEventListener('input', handleInput);
         input.addEventListener('keyup', showHideClear);
         input.addEventListener('change', showHideClear);
         const mo = new MutationObserver(showHideClear);
         mo.observe(input, { attributes: true, attributeFilter: ['value'] });

         return () => {
           input.removeEventListener('input', handleInput);
           input.removeEventListener('keyup', showHideClear);
           input.removeEventListener('change', showHideClear);
           mo.disconnect();
         };
       }

       showHideClear();

       return () => {
         try {
           clearBtn?.remove();
           geocoder.remove();
         } catch {}
         geocoderRef.current = null;
         inputRef.current = null;
         clearBtnRef.current = null;
         shellRef.current?.parentNode?.removeChild(shellRef.current);
         shellRef.current = null;
       };
     }, [map, mode, debouncedGeocode]);

     useEffect(() => {
       const g = geocoderRef.current;
       const i = inputRef.current;
       if (!g && !i) return;
       if (i) {
         i.value = '';
         i.dispatchEvent(new Event('input', { bubbles: true }));
         i.dispatchEvent(new Event('change', { bubbles: true }));
       }
       if (g && g._input) g._input.value = '';
       try {
         g?._clearResults?.();
       } catch {}
       const ctrlEl = g?._container;
       if (ctrlEl) {
         const list = ctrlEl.querySelector('.leaflet-control-geocoder-alternatives');
         if (list) list.style.display = 'none';
       }
       if (clearBtnRef.current) clearBtnRef.current.style.display = 'none';
     }, [clearToken]);

     return null;
   }

   /* --------------------------------------------------------------------------- */

   function MapModeController({ mode }) {
     const map = useMap();

     useEffect(() => {
       if (!map) {
         console.warn('MapModeController: Map not available');
         return;
       }
       map.setMinZoom(CHI_MIN_ZOOM);
       map.setMaxZoom(CHI_MAX_ZOOM);
       map.setMaxBounds(null);
       map.fitBounds(CHI_BOUNDS, { animate: false });
       map.dragging?.enable();
       map.scrollWheelZoom?.enable();
       map.touchZoom?.enable();
       map.boxZoom?.enable();
       map.keyboard?.enable();
     }, [map]);

     useEffect(() => {
       if (!map) {
         console.warn('MapModeController: Map not available');
         return;
       }
       setTimeout(() => {
         map.invalidateSize();
         if (mode === 'global') {
           map.setMaxBounds(null);
           map.setMinZoom(2);
           map.setMaxZoom(19);
           map.setView([USA.lat, USA.lng], GLOBAL_ZOOM, { animate: true });
           map.dragging?.enable();
           map.scrollWheelZoom?.enable();
           map.touchZoom?.enable();
           map.boxZoom?.enable();
           map.keyboard?.enable();
         } else {
           map.setMaxBounds(null);
           map.setMinZoom(CHI_MIN_ZOOM);
           map.setMaxZoom(CHI_MAX_ZOOM);
           map.fitBounds(CHI_BOUNDS, { animate: true });
           map.dragging?.enable();
           map.scrollWheelZoom?.enable();
           map.touchZoom?.enable();
           map.boxZoom?.enable();
           map.keyboard?.enable();
         }
       }, 0);
     }, [mode, map]);

     return null;
   }

   function CameraReset({ mapMode, resetCameraToken }) {
     const map = useMap();
     useEffect(() => {
       if (!map) {
         console.warn('CameraReset: Map not available');
         return;
       }
       if (mapMode !== 'chicago') return;
       setTimeout(() => {
         try {
           map.invalidateSize();
           map.fitBounds(CHI_BOUNDS, { animate: true });
         } catch {}
       }, 0);
     }, [resetCameraToken, mapMode, map]);
     return null;
   }

   function TapToPlace({ onPick, disabled = false, mapReady }) {
     useMapEvent('click', (e) => {
       console.log('TapToPlace: Click event, disabled=', disabled, 'mapReady=', mapReady);
       if (disabled || !mapReady) return;
       if (!onPick) return;
       const { lat, lng } = e.latlng || {};
       if (Number.isFinite(lat) && Number.isFinite(lng)) {
         onPick({ lat, lng });
       }
     });
     return null;
   }

   export default function MapShell({
     mapMode,
     mainMapRef,
     exploring,
     onPick,
     children,
     resetCameraToken,
     editing = false,
     clearSearchToken = 0,
     mapReady,
   }) {
     const center = useMemo(() => [CHI.lat, CHI.lng], []);
     const zoom = useMemo(() => 10, []);
     const whenCreated = (map) => {
       if (mainMapRef) {
         console.log('MapShell: Map initialized, setting mainMapRef');
         mainMapRef.current = map;
       } else {
         console.warn('MapShell: mainMapRef is undefined');
       }
     };

     return (
       <div style={{ position: 'relative', width: '100%', height: '100%' }} className="map-container">
         <MapContainer
           center={center}
           zoom={zoom}
           minZoom={2}
           maxZoom={19}
           zoomControl={true}
           whenCreated={whenCreated}
           style={{ width: '100%', height: '100%' }}
           worldCopyJump={true}
           scrollWheelZoom
           wheelPxPerZoomLevel={60}
           aria-label="Interactive map"
         >
           <TileLayer
             attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
           />
           <MapModeController mode={mapMode} />
           <CameraReset mode={mapMode} resetCameraToken={resetCameraToken} />
           {!editing && (
             <GeocoderTopCenter
               mode={mapMode === 'global' ? 'global' : 'chicago'}
               clearToken={clearSearchToken}
             />
           )}
           <TapToPlace onPick={onPick} disabled={exploring} mapReady={mapReady} />
           {children}
         </MapContainer>
       </div>
     );
   }