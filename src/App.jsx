// src/App.jsx
import { useMemo, useRef, useState, useEffect } from 'react';
import logoUrl from './assets/logo.png';

// hooks
import { usePins } from './hooks/usePins';
import { useIdleAttractor } from './hooks/useIdleAttractor';
import { useFunFacts } from './hooks/useFunFacts';
import { useHighlightPin } from './hooks/useHighlightPin';

// geo / map helpers
import { continentFor, countByContinent } from './lib/geo';
import {
  CHI,
  INITIAL_RADIUS_MILES,
  enableMainMapInteractions,
  disableMainMapInteractions,
  boundsForMiles,
  CHI_BOUNDS,
  CHI_MIN_ZOOM,
  isInLakeMichigan,
} from './lib/mapUtils';
import { focusDraft, goToChicago } from './lib/mapActions';

// pin helpers
import { ensureUniqueSlug, makeChiSlug } from './lib/pinsUtils';
import { postToFacebook } from './lib/facebookShare';
import { notifyPinPlacement, isVestaboardConfigured } from './lib/vestaboard';
import { getPinSlugFromUrl } from './lib/pinShare';

// components
import HeaderBar from './components/HeaderBar';
import TeamCount from './components/TeamCount';
import MapShell from './components/MapShell';
import SavedPins from './components/SavedPins';
import DraftMarker from './components/DraftMarker';
import SubMapModal from './components/SubMapModal';
import ShareConfirmModal from './components/ShareConfirmModal';
import PopularSpotsOverlay from './components/PopularSpotsOverlay';
import Editor from './components/Editor';
import Toast from './components/Toast';
import AttractorOverlay from './components/AttractorOverlay';
import GlobalCounters from './components/GlobalCounters';
import PinShareModal from './components/PinShareModal';

// clustering helpers
import PinBubbles from './components/PinBubbles';
import PinHeatmap from './components/PinHeatmap';
import ZoomGate from './components/ZoomGate';

// Admin panel
import AdminPanel from './components/AdminPanel';
import MobilePinsList from './components/MobilePinsList';
import { useAdminSettings } from './state/useAdminSettings';
import { useKioskMode, KioskStartOverlay } from './hooks/useKioskMode';

function normalizePhoneToE164ish(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

/* ------------------------------------------------------------------------ */

const DEFAULT_FUN_FACTS = {
  chicago: 'The Chicago River flows backwards! Engineers reversed it in 1900 to improve sanitation.',
  evanston: 'Home to Northwestern University and birthplace of the ice cream sundae (1890s).',
  oakpark: 'Frank Lloyd Wright's architectural playground—25 buildings still stand here.',
  cicero: 'Al Capone ran his empire from the Hawthorne Hotel, still standing on Ogden Ave.',
  skokie: 'The "World's Largest Village" was called Niles Center until 1940.',
  schaumburg: 'Went from 130 residents (1956) to 75,000+ today—one of America's fastest-growing suburbs.',
  naperville: 'Named "Best Place to Live in America" twice by Money magazine.',
  aurora: 'First U.S. city to illuminate its streets entirely with electric lights (1881).',
  joliet: 'The Old Joliet Prison hosted Jake and Elwood in The Blues Brothers opening scene.',
  waukegan: 'Ray Bradbury grew up here—Green Town in his novels is based on Waukegan.',
  'oak lawn': 'The Hilltop restaurant's iconic neon sign has been a Route 66 landmark since 1961.',
  'des plaines': 'Home of the first McDonald's franchise opened by Ray Kroc in 1955.',
  wilmette: 'The Bahá'í House of Worship is the oldest surviving Bahá'í temple in the world.',
  berwyn: 'Features the world's largest laundromat and Cermak Plaza's iconic "Spindle" car sculpture.',
  'park ridge': 'Hillary Clinton's hometown—she graduated from Maine South High School.',
  'glen ellyn': 'Lake Ellyn was created in 1889 by damming a creek to power a mill.',
  wheaton: 'Red Grange, "The Galloping Ghost," played football at Wheaton College.',
  'orland park': 'Named after the town's founder, John Orland, who arrived in the 1840s.',
  'tinley park': 'Home to the Hollywood Casino Amphitheatre, one of the Midwest's premier concert venues.',
  'oak brook': 'McDonald's global headquarters moved here in 2018 to a sprawling campus.',
  lombard: 'The Lilac Village celebrates Lilacia Park's 1,200+ lilac bushes each May.',
  'downers grove': 'The Pierce Downer cabin (1832) is one of the oldest structures in the area.',
  elmhurst: 'York Theatre, built in 1924, is one of the few remaining atmospheric movie palaces.',
  palatine: 'Named after Palatine, New York, by early settlers from that region.',
  'arlington heights': 'Arlington Park racetrack hosted the first million-dollar horse race in 1981.',
  'buffalo grove': 'Named after the buffalo that once roamed the prairie groves here.',
  'mount prospect': 'The Busse-Biermann mansion (1910) is now a historical museum.',
  hoffman: 'Hoffman Estates was farmland until the 1950s when Sam Hoffman built planned suburbs.',
  bolingbrook: 'Incorporated in 1965, it's one of Illinois's youngest and fastest-growing towns.',
  'crystal lake': 'The lake itself was formed by a glacier and is spring-fed—hence the crystal-clear water.',
};

export default function App() {
  const mainMapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // data
  const { pins, setPins, hotdogSuggestions } = usePins(mainMapRef);
  const { settings: adminSettings } = useAdminSettings();

  // map mode
  const [mapMode, setMapMode] = useState('chicago');

  // fun facts (DB-backed with fallback)
  const funFacts = useFunFacts(DEFAULT_FUN_FACTS);

  // draft pin
  const [draft, setDraft] = useState(null);
  const [slug, setSlug] = useState(null);
  const [tipToken, setTipToken] = useState(0);

  // sub-map modal state
  const [submapCenter, setSubmapCenter] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [submapBaseZoom, setSubmapBaseZoom] = useState(null);

  // UI state
  const [toast, setToast] = useState(null);
  const [exploring, setExploring] = useState(false);

  // share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToFb, setShareToFb] = useState(false);

  // pin share modal
  const [pinShareOpen, setPinShareOpen] = useState(false);
  const [pinToShare, setPinToShare] = useState(null);

  // layer toggles
  const [showPopularSpots, setShowPopularSpots] = useState(true);
  const [showCommunityPins, setShowCommunityPins] = useState(true);
  const [showMobileList, setShowMobileList] = useState(false);

  // highlight
  const [highlightSlug, setHighlightSlug] = useState(null);
  const { trigger: triggerHighlight, clear: clearHighlight } = useHighlightPin(setHighlightSlug);

  // Handle shared pin URLs (e.g., ?pin=deep-dish-delight)
  useEffect(() => {
    const sharedSlug = getPinSlugFromUrl();
    if (sharedSlug && pins.length > 0 && mapReady) {
      const sharedPin = pins.find(p => p.slug === sharedSlug);
      if (sharedPin) {
        // Zoom to and highlight the shared pin
        triggerHighlight(sharedSlug, 5000); // Highlight for 5 seconds
        setTimeout(() => {
          if (mainMapRef.current) {
            mainMapRef.current.flyTo([sharedPin.lat, sharedPin.lng], 16, {
              animate: true,
              duration: 1.5,
            });
          }
        }, 300);
      }
    }
  }, [pins, mapReady]);

  // editor form
  const [form, setForm] = useState({
    team: 'cubs',
    name: '',
    neighborhood: '',
    hotdog: '',
    note: '',
    photoUrl: null,
  });

  // mobile mode detection - detect mobile device once and stick with it
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Detect if this is a mobile device based on:
    // 1. Touch capability
    // 2. User agent contains mobile indicators
    // 3. Screen size (use the smaller dimension to handle rotation)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const smallestDimension = Math.min(window.innerWidth, window.innerHeight);
    const isSmallScreen = smallestDimension <= 640;

    return (hasTouch && isSmallScreen) || isMobileUA;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Set exploring mode based on mobile state
    if (isMobile) {
      setExploring(true);
      console.log('App: Mobile mode - exploring enabled');
    } else {
      setExploring(false);
      console.log('App: Desktop mode - exploring disabled');
    }

    // Handle resize for map invalidation only, don't change mobile mode
    const handleResize = () => {
      if (mainMapRef.current) {
        setTimeout(() => mainMapRef.current.invalidateSize(), 300);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // kiosk state
  const [needsKioskStart, setNeedsKioskStart] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  );
  const autoKiosk = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('kiosk') === '1'
    : false;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const off = onFullscreenChange((isFull) => {
      setIsFullscreen(isFull);
      if (autoKiosk && !isFull) {
        setTimeout(() => enterFullscreen(), 500);
      }
      if (mainMapRef.current) {
        setTimeout(() => mainMapRef.current.invalidateSize(), 300);
      }
    });
    (async () => {
      if (autoKiosk) {
        await enterFullscreen();
        await ensureWakeLock();
        setNeedsKioskStart(!document.fullscreenElement);
      } else {
        setNeedsKioskStart(false);
      }
    })();
    return () => off?.();
  }, [autoKiosk]);

  // Handle resize and orientation for Safari
  useEffect(() => {
    const handleResize = () => {
      if (mainMapRef.current) {
        setTimeout(() => mainMapRef.current.invalidateSize(), 300);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Set mapReady when mainMapRef is initialized
  useEffect(() => {
    if (mainMapRef.current) {
      console.log('App: mainMapRef set, enabling mapReady');
      setMapReady(true);
      setTimeout(() => mainMapRef.current.invalidateSize(), 300);
    } else {
      console.warn('App: mainMapRef not set yet');
    }
  }, [mainMapRef.current]);

  // Mobile mode zoom and mode switching
  useEffect(() => {
    if (!mainMapRef.current || !isMobile) return;

    const map = mainMapRef.current;

    const switchMode = () => {
      const currentZoom = map.getZoom();
      const currentBounds = map.getBounds();
      if (mapMode === 'chicago' && currentZoom < CHI_MIN_ZOOM) {
        setMapMode('global');
      } else if (mapMode === 'global' && currentZoom >= CHI_MIN_ZOOM && currentBounds.intersects(CHI_BOUNDS)) {
        setMapMode('chicago');
      }
    };

    map.on('zoomend', switchMode);
    map.on('moveend', switchMode);

    return () => {
      map.off('zoomend', switchMode);
      map.off('moveend', switchMode);
    };
  }, [isMobile, mapMode, mainMapRef]);

  const startKioskNow = async () => {
    await enterFullscreen();
    await ensureWakeLock();
    setNeedsKioskStart(false);
  };

  const exitKioskNow = async () => {
    await exitFullscreenAndWake();
    setNeedsKioskStart(false);
  };

  // Hidden key sequence to toggle kiosk mode (press 'k' 3 times within 1 second)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let keyPresses = [];
    const SEQUENCE_KEY = 'k';
    const SEQUENCE_LENGTH = 3;
    const TIMEOUT_MS = 1000;

    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === SEQUENCE_KEY) {
        const now = Date.now();
        keyPresses.push(now);

        // Remove old presses outside the timeout window
        keyPresses = keyPresses.filter(time => now - time < TIMEOUT_MS);

        // Check if we have the right number of presses
        if (keyPresses.length >= SEQUENCE_LENGTH) {
          keyPresses = [];
          if (isFullscreen) {
            exitKioskNow();
          } else {
            startKioskNow();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

  // dedupe pins
  const pinsDeduped = useMemo(() => {
    const seen = new Map();
    return (pins || []).reduce((out, p) => {
      const k = p?.id ?? p?.slug ?? `${p?.lat},${p?.lng}`;
      if (k && !seen.has(k)) {
        seen.set(k, true);
        out.push(p);
      }
      return out;
    }, []);
  }, [pins]);

  // continent counters
  const continentCounts = useMemo(() => countByContinent(pinsDeduped), [pinsDeduped]);

  // render-only mapping: color global pins by continent
  const pinsForRender = useMemo(() => {
    return pinsDeduped.map((p) => {
      if (p?.source === 'global') {
        const cont = p?.continent || (Number.isFinite(p?.lat) && Number.isFinite(p?.lng) ? continentFor(p.lat, p.lng) : null);
        return { ...p, team: cont || p.team || 'other' };
      }
      return p;
    });
  }, [pinsDeduped]);

  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [clearSearchToken, setClearSearchToken] = useState(0);

  // idle attractor
  const { showAttractor, setShowAttractor } = useIdleAttractor({
    deps: [mapMode],
    mainMapRef,
    draft,
    submapOpen: !!submapCenter,
    exploring,
    timeoutMs: 60 * 1000,
    onIdle: () => {
      cancelEditing();
      setClearSearchToken((t) => t + 1);
    },
  });

  // cancel helper
  const cancelEditing = () => {
    enableMainMapInteractions(mainMapRef.current);
    setDraft(null);
    setSlug(null);
    setSubmapCenter(null);
    setHandoff(null);
    setSubmapBaseZoom(null);
    setShareOpen(false);
    setShareToFb(false);
    setExploring(isMobile ? true : false);
    clearHighlight();
    setMapMode('chicago');
    if (mainMapRef.current) {
      goToChicago(mainMapRef.current, isMobile);
    }
    setResetCameraToken((t) => t + 1);
    setForm((f) => ({ ...f, name: '', neighborhood: '', hotdog: '', note: '', photoUrl: null }));
  };

  // fun-fact toast
  async function showNearestTownFact(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const json = await res.json();
      const addr = json?.address || {};
      const candidate = addr.city || addr.town || addr.village || addr.suburb || addr.locality || 'Chicago';
      const key = String(candidate).toLowerCase();
      const fact = funFacts[key] || `You’re near ${candidate}.`;
      setToast({ title: candidate, text: fact });
      setTimeout(() => setToast(null), 10000);
    } catch {}
  }

  // map click
  async function handlePick(ll) {
    console.log('App: handlePick called with latlng=', ll, 'mapReady=', mapReady, 'isMobile=', isMobile);
    if (isMobile || !mapReady) return;

    // Prevent placing pins in Lake Michigan
    if (isInLakeMichigan(ll.lat, ll.lng)) {
      setToast({
        title: 'Invalid Location',
        text: 'Cannot place a pin in Lake Michigan! Please select a location on land.'
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    try {
      const map = mainMapRef.current;
      if (!map) {
        console.warn('App: mainMapRef.current is null in handlePick');
        return;
      }
      const cz = map.getZoom() ?? 10;
      const tenMileBounds = boundsForMiles(ll, 10);
      map.fitBounds(tenMileBounds, { animate: false });
      const tenMileZoom = map.getZoom();
      map.setZoom(cz, { animate: false });
      if (cz < tenMileZoom) {
        // If zoomed out beyond 10 miles, zoom in to 10 mile view
        map.fitBounds(tenMileBounds, { animate: true });
      } else {
        // If already zoomed in closer than 10 miles, stay at current zoom (or zoom in slightly)
        map.setView([ll.lat, ll.lng], cz, { animate: true });
      }
      setDraft(ll);
      if (mapMode === 'chicago') {
        showNearestTownFact(ll.lat, ll.lng);
      }
      if (!slug) {
        const fresh = await ensureUniqueSlug(makeChiSlug());
        setSlug(fresh);
      }
      setExploring(false);
      setShowAttractor(false);
    } catch (err) {
      console.error('Pin placement failed:', err);
      setToast({ title: 'Error', text: 'Failed to place pin. Please try again.' });
    }
  }

  // keep draft pin centered
  useEffect(() => {
    if (!draft || submapCenter || !mapReady) return;
    const { lat, lng } = draft;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      try {
        mainMapRef.current?.panTo([lat, lng], { animate: false });
      } catch {}
    }
  }, [draft?.lat, draft?.lng, submapCenter, mapReady]);

  // save
  async function savePin() {
    if (!draft || !slug) return;
    const isChicago = mapMode === 'chicago';
    const cont = continentFor(draft.lat, draft.lng);
    const loyaltyPhoneNormalized = normalizePhoneToE164ish(form?.loyaltyPhone);
    const loyaltyOptIn = !!loyaltyPhoneNormalized;

    const rec = {
      slug,
      lat: draft.lat,
      lng: draft.lng,
      team: isChicago ? form.team : null,
      continent: isChicago ? null : cont,
      name: form.name?.trim() || null,
      neighborhood: isChicago ? (form.neighborhood?.trim() || null) : null,
      hotdog: form.hotdog?.trim() || null,
      note: form.note?.trim() || null,
      table_id: null,
      source: isChicago ? 'kiosk' : 'global',
      created_at: new Date().toISOString(),
      device_id: 'kiosk-1',
      loyalty_phone: loyaltyPhoneNormalized,
      loyalty_opt_in: loyaltyOptIn,
    };

    try {
      const inserted = await setPins(rec);

      // Facebook share
      if (shareToFb && rec.note) {
        postToFacebook({
          lat: rec.lat,
          lng: rec.lng,
          note: rec.note,
          source: rec.source,
          slug: rec.slug,
        });
      }

      // Vestaboard notification (fire and forget - don't block on errors)
      if (isVestaboardConfigured()) {
        notifyPinPlacement({
          slug: rec.slug,
          team: rec.team || rec.continent,
          notes: rec.note,
        }).catch(err => console.warn('Vestaboard notification failed:', err));
      }

      setShowCommunityPins(true);
      cancelEditing();
      if (isChicago) {
        triggerHighlight(inserted.slug, 350);
      } else {
        clearHighlight();
      }
      setTipToken((t) => t + 1);
    } catch (err) {
      console.error('Pin save failed:', err);
      setToast({ title: 'Error', text: 'Unexpected error saving pin.' });
    }
  }

  // fine-tune modal
  const openSubmap = (center, pointer) => {
    const live = mainMapRef.current?.getCenter?.();
    const safeCenter =
      center && Number.isFinite(center.lat) && Number.isFinite(center.lng)
        ? center
        : live && Number.isFinite(live.lat) && Number.isFinite(live.lng)
        ? { lat: live.lat, lng: live.lng }
        : CHI;
    const z = mainMapRef.current?.getZoom?.() ?? null;
    disableMainMapInteractions(mainMapRef.current);
    setSubmapBaseZoom(z);
    setSubmapCenter(safeCenter);
    setHandoff(pointer);
  };

  const closeSubmap = () => {
    enableMainMapInteractions(mainMapRef.current);
    setTimeout(() => mainMapRef.current?.invalidateSize(), 300);
    setSubmapCenter(null);
    setHandoff(null);
    setSubmapBaseZoom(null);
  };

  // mode switches
  const goGlobal = () => {
    setMapMode('global');
    setDraft(null);
    setSlug(null);
    setSubmapCenter(null);
    setHandoff(null);
    setSubmapBaseZoom(null);
    setShowAttractor(false);
    setExploring(isMobile ? true : false);
    setToast(null);
  };

  const goChicagoZoomedOut = () => {
    const needsReset = !!(draft || submapCenter || shareOpen);
    if (needsReset) {
      cancelEditing();
      setTimeout(() => {
        setShowAttractor(!isMobile);
        setExploring(isMobile ? true : false);
        if (mainMapRef.current) {
          goToChicago(mainMapRef.current, isMobile);
        }
        setResetCameraToken((t) => t + 1);
      }, 0);
      return;
    }
    setMapMode('chicago');
    setShowAttractor(!isMobile);
    setExploring(isMobile ? true : false);
    if (mainMapRef.current) {
      goToChicago(mainMapRef.current, isMobile);
    }
    setResetCameraToken((t) => t + 1);
  };

  // button style helper
  const btn3d = (pressed) => ({
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #2a2f37',
    background: pressed ? 'linear-gradient(#242a33, #1a1f26)' : 'linear-gradient(#1f242b, #171b20)',
    color: '#f4f6f8',
    boxShadow: pressed
      ? 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)'
      : '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    transform: pressed ? 'translateY(1px)' : 'translateY(0)',
    transition: 'transform 80ms ease, box-shadow 120ms ease',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  });

  const headerRight =
    mapMode === 'chicago' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setShowMobileList(true)}
            style={btn3d(false)}
            className="btn-kiosk"
            aria-label="View pins list"
          >
            📋 Pins List
          </button>
        ) : (
          <>
            <TeamCount pins={pinsDeduped} />
            <button
              type="button"
              aria-pressed={showPopularSpots}
              onClick={() => setShowPopularSpots((v) => !v)}
              style={btn3d(showPopularSpots)}
              className="btn-kiosk"
              aria-label={showPopularSpots ? 'Hide popular spots' : 'Show popular spots'}
            >
              🌟 {showPopularSpots ? 'Popular spots ON' : 'Popular spots OFF'}
            </button>
            <button
              type="button"
              aria-pressed={showCommunityPins}
              onClick={() => setShowCommunityPins((v) => !v)}
              style={btn3d(showCommunityPins)}
              className="btn-kiosk"
              aria-label={showCommunityPins ? 'Hide community pins' : 'Show community pins'}
            >
              📍 {showCommunityPins ? 'Hide pins' : 'Show pins'}
            </button>
          </>
        )}
      </div>
    ) : (
      <GlobalCounters counts={continentCounts} />
    );

  // admin (hidden)
  const [adminOpen, setAdminOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1'
  );
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const shouldCountTap = (e) => {
    const target = e.target;
    if (!target) return false;
    if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-admin-tap]')) {
      return false;
    }
    return true;
  };

  const registerTap = () => {
    if (!tapTimerRef.current) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        tapTimerRef.current = null;
      }, 5000);
    }
    tapCountRef.current += 1;
    if (tapCountRef.current >= 3) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      tapCountRef.current = 0;
      setAdminOpen(true);
    }
  };

  const handleFooterClick = (e) => {
    if (shouldCountTap(e)) registerTap();
  };
  const handleFooterTouch = (e) => {
    if (shouldCountTap(e)) registerTap();
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  return (
    <div
      className="app"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: '-webkit-fill-available',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      <HeaderBar
        mapMode={mapMode}
        totalCount={pinsDeduped.length}
        onGlobal={goGlobal}
        onChicago={goChicagoZoomedOut}
        logoSrc={logoUrl}
        onLogoClick={goChicagoZoomedOut}
      >
        {headerRight}
      </HeaderBar>

      <div
        className="map-wrap"
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          height: '100%',
          width: '100%',
          borderTop: '1px solid #222',
          borderBottom: '1px solid #222',
          willChange: 'transform',
        }}
      >
        <MapShell
          mapMode={mapMode}
          mainMapRef={mainMapRef}
          setMapReady={setMapReady}
          exploring={exploring}
          onPick={handlePick}
          resetCameraToken={resetCameraToken}
          editing={!!draft}
          clearSearchToken={clearSearchToken}
          mapReady={mapReady}
          isMobile={isMobile}
        >
          {!isMobile && showPopularSpots && mapMode === 'chicago' && !draft && (
            <PopularSpotsOverlay labelsAbove showHotDog showItalianBeef labelStyle="pill" />
          )}
          {showCommunityPins && !draft && (
            <>
              {adminSettings?.lowZoomVisualization === 'heatmap' ? (
                <PinHeatmap pins={pinsDeduped} enabled={true} minZoomForPins={13} />
              ) : (
                <PinBubbles pins={pinsDeduped} enabled={true} minZoomForPins={13} maxZoom={17} />
              )}
            </>
          )}
          {showCommunityPins && !draft && (
            <ZoomGate minZoom={13} forceOpen={!!highlightSlug}>
              <SavedPins
                key={`pins-${exploring ? 'on' : 'off'}`}
                pins={pinsForRender}
                exploring={exploring}
                highlightSlug={mapMode === 'chicago' ? highlightSlug : null}
                highlightMs={15000}
                onHighlightEnd={clearHighlight}
                onShare={(pin) => {
                  setPinToShare(pin);
                  setPinShareOpen(true);
                }}
              />
            </ZoomGate>
          )}
          {draft && (
            <DraftMarker
              lat={draft.lat}
              lng={draft.lng}
              team={form.team}
              onOpenModal={(center, pointer) => openSubmap(center, pointer)}
              tipToken={tipToken}
              setDraft={setDraft}
              modalOpen={!!submapCenter}
            />
          )}
        </MapShell>

        {showAttractor && !draft && !submapCenter && !exploring && (
          <AttractorOverlay onDismiss={() => setShowAttractor(false)} />
        )}

        {toast && <Toast title={toast.title} text={toast.text} onClose={() => setToast(null)} />}
      </div>

      {submapCenter && (
        <SubMapModal
          center={submapCenter}
          team={form.team}
          handoff={handoff}
          mainMapRef={mainMapRef}
          baseZoom={submapBaseZoom}
          onCommit={(ll) => {
            setDraft(ll);
            try {
              const map = mainMapRef.current;
              if (!map) return;
              const cz = map.getZoom() ?? 10;
              const nz = Math.min(cz + 0.5, 19);
              map.setView([ll.lat, ll.lng], nz, { animate: true });
            } catch {}
            closeSubmap();
            setTipToken((t) => t + 1);
          }}
          mapReady={mapReady}
        />
      )}

      {!isMobile && (
        <footer
          style={{ padding: '10px 14px' }}
          onClick={handleFooterClick}
          onTouchStart={handleFooterTouch}
          aria-label="Footer controls"
        >
          {!draft ? (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                minHeight: 44,
              }}
            >
              <div
                className="hint"
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  color: '#a7b0b8',
                  pointerEvents: 'none',
                  width: '100%',
                }}
              >
                {exploring
                  ? 'Click any pin to see details.'
                  : mapMode === 'global'
                  ? 'Click the map to place your pin anywhere in the world.'
                  : mapReady
                  ? 'Tap the map to place your pin, then start dragging the pin to fine-tune.'
                  : 'Loading map, please wait...'}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }} data-no-admin-tap>
                {!exploring ? (
                  <button
                    onClick={() => {
                      setExploring(true);
                      setShowAttractor(false);
                    }}
                    className="btn-kiosk"
                    aria-label="Explore community pins"
                  >
                    🔎 Explore pins
                  </button>
                ) : (
                  <button
                    onClick={() => setExploring(false)}
                    className="btn-kiosk"
                    aria-label="Close explore mode"
                  >
                    ✖ Close explore
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Editor
              mapMode={mapMode}
              slug={slug}
              form={form}
              setForm={setForm}
              hotdogSuggestions={hotdogSuggestions}
              onCancel={cancelEditing}
              onOpenShare={() => setShareOpen(true)}
            />
          )}
        </footer>
      )}

      <ShareConfirmModal
        open={shareOpen}
        onCancel={() => setShareOpen(false)}
        onConfirm={savePin}
        shareToFb={shareToFb}
        setShareToFb={setShareToFb}
        draft={draft}
        form={form}
        mapMode={mapMode}
      />

      <KioskStartOverlay visible={autoKiosk && needsKioskStart && !isFullscreen} onStart={startKioskNow} />

      <PinShareModal
        open={pinShareOpen}
        onClose={() => {
          setPinShareOpen(false);
          setPinToShare(null);
        }}
        pin={pinToShare}
      />

      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />

      {isMobile && showMobileList && (
        <MobilePinsList
          pins={pinsForRender}
          onClose={() => setShowMobileList(false)}
        />
      )}
    </div>
  );
}