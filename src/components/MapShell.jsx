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
import { useLayoutStack } from '../hooks/useLayoutStack';

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
  downloadingBarVisible = false,
  nowPlayingVisible = false,
}) {
  const map = useMap();
  const { layout } = useLayoutStack();
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

  // Update position when layout stack changes
  useEffect(() => {
    if (hostRef.current) {
      const topPosition = (layout.headerHeight || 0) + (layout.commentsBannerHeight || 0) + 5; // Reduced from 10 to 5
      hostRef.current.style.top = `${topPosition}px`;
    }
  }, [layout.headerHeight, layout.commentsBannerHeight]);

  useEffect(() => {
    if (!map) {
      console.warn('GeocoderTopCenter: Map not available');
      return;
    }

    // Clean up any existing geocoder to prevent duplicates
    // Remove all existing search bars from the DOM
    const existingHosts = map.getContainer().querySelectorAll('.map-search-host');
    existingHosts.forEach(host => {
      console.log('[GeocoderTopCenter] Removing existing search host:', host);
      host.remove();
    });

    if (hostRef.current) {
      try {
        hostRef.current.remove();
      } catch (e) {
        console.warn('[GeocoderTopCenter] Error removing hostRef:', e);
      }
      hostRef.current = null;
    }
    if (shellRef.current) {
      try {
        shellRef.current.remove();
      } catch (e) {
        console.warn('[GeocoderTopCenter] Error removing shellRef:', e);
      }
      shellRef.current = null;
    }
    if (geocoderRef.current) {
      try {
        geocoderRef.current.remove();
      } catch (e) {
        console.warn('[GeocoderTopCenter] Error removing geocoderRef:', e);
      }
      geocoderRef.current = null;
    }

    // Position search bar below header and comments banner using layout stack
    const topPosition = (layout.headerHeight || 0) + (layout.commentsBannerHeight || 0) + 20; // Reduced from 50 to 20 to raise search bar higher

    const host = L.DomUtil.create('div', 'map-search-host');
    Object.assign(host.style, {
      position: 'absolute',
      left: '50%',
      top: `${topPosition}px`,
      transform: 'translateX(-50%)',
      transition: 'top 0.3s ease',
      zIndex: 5000,
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
      padding: '6px 8px', // Reduced padding to prevent overlap
      borderRadius: '12px',
      backdropFilter: 'blur(6px) saturate(115%)',
      WebkitBackdropFilter: 'blur(6px) saturate(115%)',
      background: 'rgba(16,17,20,0.45)',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.30)',
      position: 'relative',
      minHeight: '48px', // Slightly reduced to fit inner input better
      maxHeight: '48px',
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

        // Dismiss keyboard after selecting a location
        if (inputRef.current) {
          inputRef.current.blur();
        }
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
      input.style.padding = '8px 96px 8px 12px'; // Reduced vertical padding, right padding for mic (88px) + clear (40px) buttons
      input.style.borderRadius = '8px'; // Match inner radius
      input.style.outline = 'none';
      input.style.height = '36px'; // Fixed height for inner input
      input.style.width = 'min(70vw, 520px)'; // Clean width for input field
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
      // Don't auto-focus to prevent keyboard popup
      // input.focus();
      // Explicitly blur and disable autofocus
      console.log('[MapShell] Preventing auto-focus: calling blur() and setting attributes');
      input.blur();
      input.setAttribute('autofocus', 'false');
      input.setAttribute('autocomplete', 'off');
    } else {
      console.warn('GeocoderTopCenter: Input not found');
    }

    // Remove all default geocoder icons and buttons from the DOM entirely
    const iconBtn = ctrlEl.querySelector('.leaflet-control-geocoder-icon');
    if (iconBtn) {
      iconBtn.remove();
    }

    // Also remove any other default buttons/icons that might appear
    const allIcons = ctrlEl.querySelectorAll('.leaflet-control-geocoder-icon, button.leaflet-control-geocoder-icon, button[title="Search"]');
    allIcons.forEach(icon => {
      icon.remove();
    });

    const clearBtn = L.DomUtil.create('button', 'map-search-clear', shell);
    Object.assign(clearBtn.style, {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '32px',
      height: '32px',
      borderRadius: '8px', // Match mic button
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(0,0,0,0.25)',
      color: '#e9eef3',
      cursor: 'pointer',
      fontSize: '18px',
      fontWeight: '300',
      lineHeight: '1',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      zIndex: 3700,
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    });
    clearBtn.textContent = '×';
    clearBtn.title = 'Clear';
    clearBtn.setAttribute('aria-label', 'Clear search input');
    clearBtnRef.current = clearBtn;

    // Add hover effect for clear button
    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.background = 'rgba(239, 68, 68, 0.3)';
      clearBtn.style.transform = 'translateY(-50%) scale(1.05)';
    });
    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.background = 'rgba(0,0,0,0.25)';
      clearBtn.style.transform = 'translateY(-50%)';
    });

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
      right: '52px', // Position to left of clear button (32px clear + 8px gap + 12px margin)
      top: '50%',
      transform: 'translateY(-50%)',
      width: '36px',
      height: '36px',
      borderRadius: '8px', // Match search bar aesthetic
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(0,0,0,0.25)',
      color: '#e9eef3',
      cursor: 'pointer',
      fontSize: '18px',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      zIndex: 3700,
      willChange: 'transform',
      pointerEvents: 'auto',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    });
    micBtn.textContent = '🎤';
    micBtn.title = 'Voice Search';
    micBtn.setAttribute('aria-label', 'Voice search');

    // Add hover effect
    micBtn.addEventListener('mouseenter', () => {
      if (!isListening) {
        micBtn.style.background = 'rgba(0,0,0,0.4)';
        micBtn.style.transform = 'translateY(-50%) scale(1.05)';
      }
    });
    micBtn.addEventListener('mouseleave', () => {
      if (!isListening) {
        micBtn.style.background = 'rgba(0,0,0,0.25)';
        micBtn.style.transform = 'translateY(-50%)';
      }
    });

    L.DomEvent.disableClickPropagation(micBtn);

    let recognition = null;
    let isListening = false;

    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true; // Show interim results for better UX
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

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

        // Don't treat "no-speech" as a fatal error - just keep waiting
        if (event.error === 'no-speech') {
          console.log('[VoiceSearch] No speech detected, waiting for input...');
          // Keep the mic active-looking for a moment before resetting
          setTimeout(() => {
            if (!isListening) {
              micBtn.style.background = 'rgba(0,0,0,0.35)';
              micBtn.style.animation = 'none';
            }
          }, 500);
          return;
        }

        // For other errors, stop listening
        isListening = false;
        micBtn.style.background = 'rgba(0,0,0,0.35)';
        micBtn.style.animation = 'none';

        // Show user-friendly error message
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow microphone access in your browser settings.');
        }
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
        console.log('[GeocoderTopCenter] Cleanup: removing all search elements');
        clearBtn?.remove();
        micBtn?.remove();
        if (recognition) {
          recognition.abort();
        }
        if (geocoderRef.current) {
          geocoderRef.current.remove();
        }
        if (shellRef.current) {
          shellRef.current.remove();
        }
        if (hostRef.current) {
          hostRef.current.remove();
        }
      } catch (e) {
        console.warn('[GeocoderTopCenter] Cleanup error:', e);
      }
      geocoderRef.current = null;
      inputRef.current = null;
      clearBtnRef.current = null;
      shellRef.current = null;
      hostRef.current = null;
    };
  }, [map, mode, debouncedGeocode, dynamicMode, dynamicPlaceholder]);

  // Update host position when bars visibility changes
  // Search bar is now at top, no need to adjust for bottom bars
  // Keep the effect for potential future use but make it a no-op
  useEffect(() => {
    // Search bar position is fixed at top, no adjustments needed
  }, [downloadingBarVisible, nowPlayingVisible]);

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
    // Skip invalidateSize - only needed on initial render and window resize
    console.log('[MapModeController] Map interactions enabled, zoom:', map.getZoom());
  }, [map, isMobile]);

  useEffect(() => {
    if (!map) {
      console.warn('MapModeController: Map not available');
      return;
    }
    // Skip invalidateSize - only apply mode changes
    if (mode === 'global') {
      map.setMaxBounds(null);
      map.setMinZoom(2);
      map.setMaxZoom(GLOBAL_MAX_ZOOM);
      // Use flyTo for smooth animated transition with easing
      console.log('[MapModeController] Animating to global view...');
      map.flyTo([USA.lat, USA.lng], GLOBAL_ZOOM, {
        animate: true,
        duration: 1.5, // 1.5 second smooth animation
        easeLinearity: 0.25, // Smooth easing (0 = very smooth, 1 = linear)
      });
      map.dragging?.enable();
      map.scrollWheelZoom?.enable();
      map.touchZoom?.enable();
      map.boxZoom?.enable();
      map.keyboard?.enable();
    } else {
      map.setMaxBounds(null);
      map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
      map.setMaxZoom(CHI_MAX_ZOOM);
      // Use flyToBounds for smooth animated transition back to Chicago
      console.log('[MapModeController] Animating to Chicago view...');
      map.flyToBounds(CHI_BOUNDS, {
        animate: true,
        duration: 1.5, // 1.5 second smooth animation
        easeLinearity: 0.25, // Smooth easing
        paddingTopLeft: [0, 0],
        paddingBottomRight: [0, 0],
      });
      map.dragging?.enable();
      map.scrollWheelZoom?.enable();
      map.touchZoom?.enable();
      map.boxZoom?.enable();
      map.keyboard?.enable();
    }
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
    // Skip invalidateSize - only apply camera reset
    try {
      if (isMobile) {
        // On mobile, zoom to Chicago proper (zoom 11) instead of full metro bounds
        map.setView([CHI.lat, CHI.lng], 11, { animate: true });
      } else {
        // On desktop, fit to full metro bounds
        map.fitBounds(CHI_BOUNDS, { animate: true, maxZoom: CHI_MAX_ZOOM });
      }
      map.setMinZoom(isMobile ? 1 : CHI_MIN_ZOOM);
    } catch {}
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

// Disable map dragging during pin placement when zoomed in far enough
function PinPlacementLock({ editing, mapMode }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const checkAndLock = () => {
      const currentZoom = map.getZoom();
      const maxZoom = mapMode === 'global' ? GLOBAL_MAX_ZOOM : CHI_MAX_ZOOM;
      // Lock when zoomed in sufficiently (2 levels below max) for precise pin placement
      const lockThreshold = maxZoom - 2;
      const isZoomedIn = currentZoom >= lockThreshold;

      // Lock dragging when editing AND zoomed in far enough
      if (editing && isZoomedIn) {
        console.log('[PinPlacementLock] Locking map dragging - editing mode at zoom', currentZoom, '(threshold:', lockThreshold, ')');
        map.dragging?.disable();
        map.touchZoom?.disable();
        map.scrollWheelZoom?.disable();
        map.doubleClickZoom?.disable();
      } else {
        console.log('[PinPlacementLock] Unlocking map dragging - zoom:', currentZoom);
        map.dragging?.enable();
        map.touchZoom?.enable();
        map.scrollWheelZoom?.enable();
        map.doubleClickZoom?.enable();
      }
    };

    // Check initially and on zoom changes
    checkAndLock();
    map.on('zoomend', checkAndLock);

    return () => {
      map.off('zoomend', checkAndLock);
      // Re-enable dragging on unmount
      map.dragging?.enable();
      map.touchZoom?.enable();
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
    };
  }, [map, editing, mapMode]);

  return null;
}

function SetMapRef({ mainMapRef, setMapReady }) {
  const map = useMap();
  useEffect(() => {
    if (map && mainMapRef && typeof setMapReady === 'function') {
      mainMapRef.current = map;
      setMapReady(true);
      console.log('SetMapRef: mainMapRef.current set to', map);
      // Only invalidateSize on very first mount
      setTimeout(() => map.invalidateSize(), 300);
    } else {
      console.warn('SetMapRef: map, mainMapRef, or setMapReady is invalid', { map, mainMapRef, setMapReady });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // Only run when map instance changes, not when setMapReady changes
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
  downloadingBarVisible = false,
  nowPlayingVisible = false,
  walkupAttractorActive = false,
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
      // Skip invalidateSize here - SetMapRef component handles it
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
        // Enhanced touch gestures
        touchZoom={true}  // Pinch-to-zoom
        tap={true}  // Enable tap events
        tapTolerance={15}  // Tolerance for tap detection (px)
        doubleClickZoom={true}  // Double-tap/click to zoom
        bounceAtZoomLimits={true}  // Visual feedback at zoom limits
        zoomAnimation={true}  // Smooth zoom animations
        zoomAnimationThreshold={4}  // Animation for zoom changes less than this
        fadeAnimation={true}  // Fade tiles when zooming
        markerZoomAnimation={true}  // Animate markers on zoom
      >
        <SetMapRef mainMapRef={mainMapRef} setMapReady={setMapReady} />
        <OfflineTileLayer
          attribution='&copy; OpenStreetMap contributors'
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
          // Progressive caching in global mode
          enableProgressiveCaching={(() => {
            const enabled = mapMode === 'global';
            console.log('[MapShell] Progressive caching enabled:', enabled, 'mapMode:', mapMode);
            return enabled;
          })()}
        />
        <MapModeController mode={mapMode} isMobile={isMobile} />
        <CameraReset mode={mapMode} resetCameraToken={resetCameraToken} isMobile={isMobile} />
        <PinPlacementLock editing={editing} mapMode={mapMode} />
        {!editing && !walkupAttractorActive && (
          <GeocoderTopCenter
            mode={mapMode === 'global' ? 'global' : 'chicago'}
            clearToken={clearSearchToken}
            isMobile={isMobile}
            onSearchInteraction={onSearchInteraction}
            downloadingBarVisible={downloadingBarVisible}
            nowPlayingVisible={nowPlayingVisible}
          />
        )}
        <TapToPlace onPick={onPick} onMapClick={onMapClick} disabled={exploring} mapReady={mapReady} />
        {children}
      </MapContainer>
    </div>
  );
}