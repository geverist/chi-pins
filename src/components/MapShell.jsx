// src/components/MapShell.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, useMapEvent, useMap } from 'react-leaflet';
import OfflineTileLayer from './OfflineTileLayer';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder';
import { CHI, CHI_BOUNDS, CHI_MIN_ZOOM, CHI_MAX_ZOOM, USA, GLOBAL_ZOOM, GLOBAL_MAX_ZOOM } from '../lib/mapUtils';
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
    /* Pulse animation for microphone when listening */
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
      50% {
        opacity: 0.7;
        transform: translateY(-50%) scale(1.1);
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
  isMobile = false,
  onSearchInteraction,
}) {
  const map = useMap();
  const hostRef = useRef(null);
  const shellRef = useRef(null);
  const geocoderRef = useRef(null);
  const inputRef = useRef(null);
  const clearBtnRef = useRef(null);
  // Mobile should always start in Chicago mode with zoom 12
  const initialMode = isMobile ? 'chicago' : mode;
  const initialPlaceholder = isMobile ? 'Search Chicago & nearby…' : placeholder;
  const [dynamicMode, setDynamicMode] = useState(initialMode);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState(initialPlaceholder);

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
        } else if (!text) {
          // Skip warning for empty text to reduce log clutter
          return;
        } else {
          console.warn('GeocoderTopCenter: geocoderRef.current is', geocoderRef.current, 'text=', text);
        }
      }, 300),
    []
  );

  useEffect(() => {
    ensureSearchCss();
  }, []);

  // Mobile: dynamically switch between chicago/global search based on map bounds
  useEffect(() => {
    if (!isMobile || !map) return;

    const checkBounds = () => {
      const mapBounds = map.getBounds();
      const chicagoBounds = CHI_BOUNDS;
      const currentZoom = map.getZoom();

      // Use zoom level as primary indicator for mode
      // Zoom >= 9 = Chicago mode (even if you can see all of Chicago)
      // Zoom < 9 = Global mode (too zoomed out)
      const isInChicago = currentZoom >= CHI_MIN_ZOOM && chicagoBounds.intersects(mapBounds);

      const newMode = isInChicago ? 'chicago' : 'global';
      const newPlaceholder = isInChicago ? 'Search Chicago & nearby…' : 'Search places worldwide…';

      console.log('GeocoderTopCenter: checkBounds - zoom:', currentZoom, 'CHI_MIN_ZOOM:', CHI_MIN_ZOOM, 'intersects:', chicagoBounds.intersects(mapBounds), 'isInChicago:', isInChicago, 'newMode:', newMode, 'currentMode:', dynamicMode);

      if (newMode !== dynamicMode) {
        console.log('GeocoderTopCenter: MODE CHANGE - Switching from', dynamicMode, 'to', newMode);
        setDynamicMode(newMode);
        setDynamicPlaceholder(newPlaceholder);

        // Update placeholder in the input
        if (inputRef.current) {
          inputRef.current.placeholder = newPlaceholder;
          console.log('GeocoderTopCenter: Updated input placeholder to:', newPlaceholder);
        }
      }
    };

    // Check on zoom/move
    map.on('zoomend', checkBounds);
    map.on('moveend', checkBounds);

    // Initial check with small delay to ensure map is fully initialized
    const timeoutId = setTimeout(checkBounds, 100);

    return () => {
      map.off('zoomend', checkBounds);
      map.off('moveend', checkBounds);
      clearTimeout(timeoutId);
    };
  }, [isMobile, map, dynamicMode]);

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
      minHeight: '52px', // Fixed height to prevent shifting
      maxHeight: '52px', // Fixed height to prevent shifting
    });
    hostRef.current.appendChild(shell);
    shellRef.current = shell;

    const effectiveMode = isMobile ? dynamicMode : mode;
    const effectivePlaceholder = isMobile ? dynamicPlaceholder : (mode === 'global' ? 'Search places worldwide…' : placeholder);

    const geocoder = L.Control.geocoder({
      geocoder: effectiveMode === 'global'
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
      placeholder: effectivePlaceholder,
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
      input.placeholder = effectivePlaceholder;
      input.setAttribute('aria-label', effectiveMode === 'global' ? 'Search places worldwide' : 'Search Chicago and nearby');
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          clearAll();
        }
      });
      // Track if this is the initial focus (auto-focus on mount)
      let hasInteracted = false;

      // Dismiss overlays when user interacts with search (not on auto-focus)
      input.addEventListener('focus', () => {
        if (hasInteracted) {
          onSearchInteraction?.();
        }
        hasInteracted = true;
      });
      input.addEventListener('input', () => {
        onSearchInteraction?.();
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

    // Add microphone button for voice search
    const micBtn = L.DomUtil.create('button', 'map-search-mic', shell);
    Object.assign(micBtn.style, {
      position: 'absolute',
      right: '46px', // Position to left of clear button
      top: '50%',
      transform: 'translateY(-50%)',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(0,0,0,0.35)',
      color: '#e9eef3',
      cursor: 'pointer',
      fontSize: '16px',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      zIndex: 3700,
      willChange: 'transform', // GPU acceleration
      pointerEvents: 'auto', // Ensure clickable
    });
    micBtn.textContent = '🎤';
    micBtn.title = 'Voice Search';
    micBtn.setAttribute('aria-label', 'Voice search');
    L.DomEvent.disableClickPropagation(micBtn);

    let recognition = null;
    let isListening = false;

    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        micBtn.style.background = 'rgba(239, 68, 68, 0.8)'; // Red when listening
        micBtn.style.animation = 'pulse 1s infinite';
      };

      recognition.onend = () => {
        isListening = false;
        micBtn.style.background = 'rgba(0,0,0,0.35)';
        micBtn.style.animation = 'none';
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('[VoiceSearch] Recognized:', transcript);

        if (inputRef.current) {
          inputRef.current.value = transcript;
          inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
          inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          showHideClear();
        }
      };

      recognition.onerror = (event) => {
        console.error('[VoiceSearch] Error:', event.error);
        isListening = false;
        micBtn.style.background = 'rgba(0,0,0,0.35)';
        micBtn.style.animation = 'none';
      };
    } else {
      // Hide mic button if speech recognition not supported
      micBtn.style.display = 'none';
    }

    micBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (!recognition) {
        console.warn('[VoiceSearch] Speech recognition not available');
        return;
      }

      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
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
        micBtn?.remove();
        if (recognition) {
          recognition.abort();
        }
        geocoder.remove();
      } catch {}
      geocoderRef.current = null;
      inputRef.current = null;
      clearBtnRef.current = null;
      shellRef.current?.parentNode?.removeChild(shellRef.current);
      shellRef.current = null;
    };
  }, [map, mode, debouncedGeocode, dynamicMode, dynamicPlaceholder]);

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

function MapModeController({ mode, isMobile }) {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      console.warn('MapModeController: Map not available');
      return;
    }
    console.log('[MapModeController] Setting up map. isMobile:', isMobile, 'mode:', mode);
    map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
    map.setMaxZoom(CHI_MAX_ZOOM);
    map.setMaxBounds(null);
    // On mobile, keep the initial zoom level; on desktop, fit to full metro bounds
    if (!isMobile) {
      console.log('[MapModeController] Fitting to CHI_BOUNDS (desktop)');
      map.fitBounds(CHI_BOUNDS, { animate: false });
    } else {
      console.log('[MapModeController] Keeping initial zoom (mobile), current zoom:', map.getZoom());
    }
    map.dragging?.enable();
    map.scrollWheelZoom?.enable();
    map.touchZoom?.enable();
    map.boxZoom?.enable();
    map.keyboard?.enable();
    setTimeout(() => {
      map.invalidateSize();
      console.log('[MapModeController] After invalidateSize, zoom:', map.getZoom());
    }, 300);
  }, [map, isMobile]);

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
        map.setMaxZoom(GLOBAL_MAX_ZOOM);
        map.setView([USA.lat, USA.lng], GLOBAL_ZOOM, { animate: true });
        map.dragging?.enable();
        map.scrollWheelZoom?.enable();
        map.touchZoom?.enable();
        map.boxZoom?.enable();
        map.keyboard?.enable();
      } else {
        map.setMaxBounds(null);
        map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
        map.setMaxZoom(CHI_MAX_ZOOM);
        map.fitBounds(CHI_BOUNDS, { animate: true });
        map.dragging?.enable();
        map.scrollWheelZoom?.enable();
        map.touchZoom?.enable();
        map.boxZoom?.enable();
        map.keyboard?.enable();
      }
    }, 300);
  }, [mode, map, isMobile]);

  return null;
}

function CameraReset({ mapMode, resetCameraToken, isMobile }) {
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
        if (isMobile) {
          // On mobile, zoom to Chicago proper (zoom 11) instead of full metro bounds
          map.setView([CHI.lat, CHI.lng], 11, { animate: true });
        } else {
          // On desktop, fit to full metro bounds
          map.fitBounds(CHI_BOUNDS, { animate: true, maxZoom: CHI_MAX_ZOOM });
        }
        map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
      } catch {}
    }, 300);
  }, [resetCameraToken, mapMode, map, isMobile]);
  return null;
}

function TapToPlace({ onPick, onMapClick, disabled = false, mapReady }) {
  useMapEvent('click', (e) => {
    console.log('TapToPlace: Click event, disabled=', disabled, 'mapReady=', mapReady);
    const { lat, lng } = e.latlng || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    // Always call onMapClick for fun facts (even when exploring/disabled)
    if (onMapClick) {
      onMapClick({ lat, lng });
    }

    // Only call onPick when not disabled (for pin placement)
    if (!disabled && mapReady && onPick) {
      onPick({ lat, lng });
    }
  });
  return null;
}

function SetMapRef({ mainMapRef, setMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && mainMapRef && typeof setMapReady === 'function') {
      mainMapRef.current = map;
      setMapReady(true);
      console.log('SetMapRef: mainMapRef.current set to', map);
      setTimeout(() => map.invalidateSize(), 300); // Ensure initial render
    } else {
      console.warn('SetMapRef: map, mainMapRef, or setMapReady is invalid', { map, mainMapRef, setMapReady });
    }
  }, [map, mainMapRef, setMapReady]);
  return null;
}

export default function MapShell({
  mapMode,
  mainMapRef,
  setMapReady,
  exploring,
  onPick,
  onMapClick,
  children,
  resetCameraToken,
  editing = false,
  clearSearchToken = 0,
  mapReady,
  isMobile,
  onSearchInteraction,
}) {
  const center = useMemo(() => [CHI.lat, CHI.lng], []);
  // Mobile: zoom 11 (Chicago proper, shows neighborhoods). Desktop: zoom 9 (full metro)
  const zoom = useMemo(() => {
    const z = isMobile ? 11 : 9;
    console.log('[MapShell] Initial zoom:', z, 'isMobile:', isMobile);
    return z;
  }, [isMobile]);

  const whenCreated = (map) => {
    if (mainMapRef && typeof setMapReady === 'function') {
      mainMapRef.current = map;
      setMapReady(true);
      console.log('MapShell: Map initialized, setting mainMapRef to', map);
      setTimeout(() => map.invalidateSize(), 300); // Ensure initial render
    } else {
      console.warn('MapShell: mainMapRef or setMapReady is invalid', { mainMapRef, setMapReady });
    }
  };

  // Dynamic maxZoom based on map mode
  const maxZoom = mapMode === 'global' ? GLOBAL_MAX_ZOOM : CHI_MAX_ZOOM;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', willChange: 'transform' }} className="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={isMobile ? 1 : 2}
        maxZoom={maxZoom}
        zoomControl={true}
        whenCreated={whenCreated}
        style={{ width: '100%', height: '100%' }}
        worldCopyJump={true}
        scrollWheelZoom
        wheelPxPerZoomLevel={60}
        renderer={L.svg()}
        fullscreenControl={false}
        aria-label="Interactive map"
      >
        <SetMapRef mainMapRef={mainMapRef} setMapReady={setMapReady} />
        <OfflineTileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={maxZoom}
          // Performance optimizations
          maxNativeZoom={18}
          minNativeZoom={0}
          keepBuffer={2}  // Keep tiles around viewport (default is 2)
          updateWhenIdle={false}  // Update tiles while panning
          updateWhenZooming={false}  // Don't update during zoom animation
          updateInterval={200}  // Throttle tile updates to 200ms
          // Loading optimizations
          className="map-tiles"
          errorTileUrl="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="  // Blank 1x1 transparent GIF
        />
        <MapModeController mode={mapMode} isMobile={isMobile} />
        <CameraReset mode={mapMode} resetCameraToken={resetCameraToken} isMobile={isMobile} />
        {!editing && (
          <GeocoderTopCenter
            mode={mapMode === 'global' ? 'global' : 'chicago'}
            clearToken={clearSearchToken}
            isMobile={isMobile}
            onSearchInteraction={onSearchInteraction}
          />
        )}
        <TapToPlace onPick={onPick} onMapClick={onMapClick} disabled={exploring} mapReady={mapReady} />
        {children}
      </MapContainer>
    </div>
  );
}