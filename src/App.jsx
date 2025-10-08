// src/App.jsx
import { useMemo, useRef, useState, useEffect } from 'react';
import logoUrl from './assets/logo.png';
import { getIndustryConfig, isIndustryDemo } from './config/industryConfigs';

// hooks
import { usePins } from './hooks/usePins';
import { useIdleAttractor } from './hooks/useIdleAttractor';
import { useFunFacts, getRandomFact } from './hooks/useFunFacts';
import { useHighlightPin } from './hooks/useHighlightPin';
import { useQuadrantTouch } from './hooks/useQuadrantTouch';
import { useTouchSequence } from './hooks/useTouchSequence';

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
import { sendPinNotification } from './lib/notifications';
import { sendAnonymousMessage } from './lib/anonymousMessage';

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
import NewsTicker from './components/NewsTicker';
import NowPlayingBanner from './components/NowPlayingBanner';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import EnhancedPhotoBooth from './components/EnhancedPhotoBooth';
import ThenAndNow from './components/ThenAndNow';
import { initRemoteLogger } from './utils/remoteLogger';
import WeatherWidget from './components/WeatherWidget';
import OfflineIndicator from './components/OfflineIndicator';
import TouchSequenceIndicator from './components/TouchSequenceIndicator';
import AnonymousMessageModal from './components/AnonymousMessageModal';
import CommentsModal from './components/CommentsModal';
import LocationSwitcher from './components/LocationSwitcher';
import HolidayTheme from './components/HolidayTheme';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AchievementNotification from './components/AchievementNotification';
import DemoModeSwitcher from './components/DemoModeSwitcher';
import VoiceAssistant from './components/VoiceAssistant';
import DebugPanel from './components/DebugPanel';
import { useIndustryDemoSwitcher, IndustryDemoSwitcherModal } from './hooks/useIndustryDemoSwitcher';
import { getPersistentStorage } from './lib/persistentStorage';
import { enableImmersiveMode, maintainImmersiveMode } from './lib/immersiveMode';

// clustering helpers
import PinBubbles from './components/PinBubbles';
import PinHeatmap from './components/PinHeatmap';
import ProgressiveVisualization from './components/ProgressiveVisualization';
import ZoomGate from './components/ZoomGate';

// Admin panel
import AdminPanel from './components/AdminPanel';
import OfflineMapDownloader from './components/OfflineMapDownloader';
import AdminRoute from './components/AdminRoute';
import PinCodeModal from './components/PinCodeModal';
import MobilePinsList from './components/MobilePinsList';
import MobilePinsTable from './components/MobilePinsTable';
import MobileNavMenu from './components/MobileNavMenu';
import OrderMenu from './components/OrderMenu';
import Jukebox from './components/Jukebox';
import GamesMenu from './components/GamesMenu';
import Footer from './components/Footer';
import { useAdminSettings } from './state/useAdminSettings';
import { useNowPlaying } from './state/useNowPlaying.jsx';
import { useNavigationSettings } from './hooks/useNavigationSettings';
import { useKioskMode, KioskStartOverlay } from './hooks/useKioskMode.jsx';
import { enterFullscreen, exitFullscreenAndWake, ensureWakeLock, onFullscreenChange } from './lib/kiosk';
import { btn3d } from './lib/styles';
import { CHICAGO_FUN_FACTS } from './data/chicagoFunFacts';

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

export default function App() {
  const mainMapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // industry demo config
  const industryConfig = useMemo(() => getIndustryConfig(), []);
  const isDemoMode = useMemo(() => isIndustryDemo(), []);

  // Industry demo switcher (key sequence: D-E-M-O)
  const demoSwitcher = useIndustryDemoSwitcher();

  // data
  const { pins, setPins, hotdogSuggestions } = usePins(mainMapRef);
  const { settings: adminSettings } = useAdminSettings();
  const { settings: navSettings, enabledCount } = useNavigationSettings();
  const { currentTrack, isPlaying, lastPlayed, queue } = useNowPlaying();

  // Debug logging for Now Playing state
  useEffect(() => {
    console.log('App.jsx - currentTrack changed:', currentTrack);
    console.log('App.jsx - isPlaying:', isPlaying);
    console.log('App.jsx - lastPlayed:', lastPlayed);
    console.log('App.jsx - queue:', queue);
  }, [currentTrack, isPlaying, lastPlayed, queue]);

  // Migrate localStorage to persistent storage on app load (runs once)
  useEffect(() => {
    const storage = getPersistentStorage();
    storage.migrateFromLocalStorage();
    console.log('[App] Persistent storage migration initiated');
  }, []);

  // Apply industry demo config
  useEffect(() => {
    if (isDemoMode) {
      console.log('Industry demo mode active:', industryConfig);
      // Apply brand color to CSS variables
      document.documentElement.style.setProperty('--brand-color', industryConfig.brandColor);
      // Set page title
      document.title = `${industryConfig.name} - ${industryConfig.tagline}`;
    }
  }, [isDemoMode, industryConfig]);

  // map mode - mobile always starts in Chicago mode with closer zoom
  const [mapMode, setMapMode] = useState('chicago');

  // fun facts (DB-backed with fallback to 150 Chicago metro towns)
  const funFacts = useFunFacts(CHICAGO_FUN_FACTS);

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
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(null);

  // Log team filter changes
  useEffect(() => {
    console.log('[App] Team filter changed to:', selectedTeamFilter);
  }, [selectedTeamFilter]);

  // share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToFb, setShareToFb] = useState(false);

  // pin share modal
  const [pinShareOpen, setPinShareOpen] = useState(false);
  const [pinToShare, setPinToShare] = useState(null);

  // anonymous message modal
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [pinToMessage, setPinToMessage] = useState(null);

  // order menu modal
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);

  // jukebox modal
  const [jukeboxOpen, setJukeboxOpen] = useState(false);

  // games modal
  const [gamesOpen, setGamesOpen] = useState(false);

  // photo booth modal
  const [photoBoothOpen, setPhotoBoothOpen] = useState(false);

  // then & now modal
  const [thenAndNowOpen, setThenAndNowOpen] = useState(false);

  // comments modal
  const [commentsOpen, setCommentsOpen] = useState(false);

  // voice assistant visibility
  const [voiceAssistantVisible, setVoiceAssistantVisible] = useState(true);

  // downloading bar visibility (for footer margin adjustment)
  const [downloadingBarVisible, setDownloadingBarVisible] = useState(false);

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
    team: null,
    name: '',
    neighborhood: '',
    hotdog: '',
    note: '',
    photoUrl: null,
    allowAnonymousMessages: false,
  });

  // mobile mode detection - detect mobile device once and stick with it
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;

    // For kiosk tablets (like Fully Kiosk Browser on Android tablets),
    // prioritize screen size over user agent to avoid false positives
    const smallestDimension = Math.min(window.innerWidth, window.innerHeight);
    const isSmallScreen = smallestDimension <= 768; // Increased threshold for tablets

    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Check if running in Fully Kiosk Browser (common kiosk app)
    const isFullyKiosk = /Fully/i.test(navigator.userAgent);

    // Tablet detection (iPad or Android tablets with larger screens)
    const isTablet = /iPad/i.test(navigator.userAgent) ||
                     (/Android/i.test(navigator.userAgent) && smallestDimension > 768);

    // Only consider it mobile if:
    // - Has a small screen (<=768px), OR
    // - Is a mobile phone user agent AND has small screen
    // - NOT a tablet or kiosk browser with larger screen
    const detected = isSmallScreen && !isTablet && !isFullyKiosk;

    console.log('[App] Mobile detection:', {
      hasTouch,
      isMobileUA,
      isFullyKiosk,
      isTablet,
      smallestDimension,
      isSmallScreen,
      userAgent: navigator.userAgent,
      detected
    });

    return detected;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Initialize remote logger for debugging
    initRemoteLogger();

    // Enable Android immersive mode to hide navigation/status bars
    enableImmersiveMode();
    maintainImmersiveMode();

    // Set exploring mode based on mobile state
    if (isMobile) {
      setExploring(true);
      console.log('App: Mobile mode - exploring enabled');
    } else {
      setExploring(false);
      console.log('App: Desktop mode - exploring disabled');
    }
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

  // Note: mapReady is set by MapShell's SetMapRef component when map initializes
  // No need for a separate effect here as it would have stale ref dependency

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

  // Dismiss overlays on map zoom/pan and pinch-to-zoom
  useEffect(() => {
    const dismissOverlays = () => {
      setShowAttractor(false);
      setVoiceAssistantVisible(false);
    };

    // Global touch event handlers for pinch-to-zoom detection
    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length >= 2) {
        console.log('[App] Pinch detected (touchstart) - dismissing overlays');
        dismissOverlays();
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length >= 2) {
        console.log('[App] Pinch detected (touchmove) - dismissing overlays');
        dismissOverlays();
      }
    };

    // Listen globally on document for pinch gestures (catches all touch events)
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Also listen to map events if available
    if (mainMapRef.current) {
      const map = mainMapRef.current;
      map.on('zoomstart', dismissOverlays);
      map.on('movestart', dismissOverlays);
      map.on('zoom', dismissOverlays);
      map.on('move', dismissOverlays);

      return () => {
        map.off('zoomstart', dismissOverlays);
        map.off('movestart', dismissOverlays);
        map.off('zoom', dismissOverlays);
        map.off('move', dismissOverlays);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [mainMapRef]);

  // Dismiss overlays when keyboard appears (input/textarea focused)
  useEffect(() => {
    const handleFocusIn = (e) => {
      // Check if the focused element is an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        console.log('[App] Input focused - dismissing overlays');
        setShowAttractor(false);
        setVoiceAssistantVisible(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  const startKioskNow = async () => {
    await enterFullscreen();
    await ensureWakeLock();
    setNeedsKioskStart(false);
  };

  const exitKioskNow = async () => {
    await exitFullscreenAndWake();
    setNeedsKioskStart(false);
  };

  // Touch sequence to toggle kiosk mode (double-tap opposite corners)
  useTouchSequence(() => {
    console.log('Double-tap corners detected - toggling kiosk mode');
    if (isFullscreen) {
      // Show PIN modal to exit kiosk mode
      setShowKioskExitPin(true);
    } else {
      startKioskNow();
    }
  }, {
    sequence: 'double-tap-corners',
    timeoutMs: 2000,
    enabled: true
  });

  // Touch sequence to refresh page (triple-tap center)
  useTouchSequence(() => {
    console.log('Triple-tap detected - refreshing page');
    // Clear service worker cache if available
    if ('serviceWorker' in navigator && 'caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('Cache cleared, reloading...');
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  }, {
    sequence: 'triple-tap',
    timeoutMs: 1000, // 1 second window for three taps
    enabled: true
  });

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
    let filtered = pinsDeduped.map((p) => {
      if (p?.source === 'global') {
        const cont = p?.continent || (Number.isFinite(p?.lat) && Number.isFinite(p?.lng) ? continentFor(p.lat, p.lng) : null);
        return { ...p, team: cont || p.team || 'other' };
      }
      return p;
    });

    // Apply team filter in Chicago mode
    if (mapMode === 'chicago' && selectedTeamFilter) {
      console.log('=== TEAM FILTER ACTIVE ===');
      console.log('Selected team filter:', selectedTeamFilter);
      console.log('Before filter:', filtered.length, 'pins');

      // Log all team values to see what's in the data
      const teamCounts = {};
      filtered.forEach(p => {
        const team = p.team || 'null';
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });
      console.log('Team distribution:', teamCounts);

      filtered = filtered.filter(p => {
        const matches = p.team === selectedTeamFilter;
        if (matches) console.log('✓ Match:', p.slug, 'team:', p.team);
        return matches;
      });
      console.log('After filter:', filtered.length, 'pins');
      console.log('======================');
    }

    return filtered;
  }, [pinsDeduped, mapMode, selectedTeamFilter]);

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
      // Close all modals and reset to main map
      cancelEditing();
      setClearSearchToken((t) => t + 1);
      setVoiceAssistantVisible(true);

      // Dismiss keyboard by blurring any focused input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Close all navigation modals
      setGamesOpen(false);
      setJukeboxOpen(false);
      setOrderMenuOpen(false);
      setPhotoBoothOpen(false);
      setThenAndNowOpen(false);
      setCommentsOpen(false);
      setRecommendationsOpen(false);
      setAppointmentCheckInOpen(false);
      setReservationCheckInOpen(false);
      setGuestBookOpen(false);
      setAnonymousMessageOpen(false);
      setAdminOpen(false);
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
    // Reset form
    setForm({
      team: null,
      name: '',
      neighborhood: '',
      hotdog: '',
      note: '',
      photoUrl: null,
      allowAnonymousMessages: false,
    });
  };

  // fun-fact toast
  async function showNearestTownFact(lat, lng) {
    // Check if fun facts are enabled
    if (!adminSettings.funFactsEnabled) return;

    try {
      console.log('Fetching fun fact for:', lat, lng);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const json = await res.json();
      const addr = json?.address || {};
      const candidate = addr.city || addr.town || addr.village || addr.suburb || addr.locality || 'Chicago';
      const key = String(candidate).toLowerCase();
      console.log('Location key:', key, 'Available facts:', funFacts[key]);
      const fact = getRandomFact(funFacts, key) || `You're near ${candidate}.`;
      console.log('Showing toast with fact:', fact);
      setToast({ title: candidate, text: fact });
      const duration = (adminSettings.funFactDurationSeconds || 15) * 1000;
      setTimeout(() => setToast(null), duration);
    } catch (err) {
      console.error('Failed to fetch fun fact:', err);
    }
  }

  // Handle any map click for fun facts (desktop only)
  function handleMapClick(ll) {
    if (mapMode === 'chicago' && adminSettings.funFactsEnabled && !isMobile) {
      showNearestTownFact(ll.lat, ll.lng);
    }
  }

  // Voice-triggered pin placement
  async function handleVoicePlacePin(ll) {
    console.log('App: handleVoicePlacePin called with latlng=', ll);

    // Dismiss voice assistant when placing pin
    setVoiceAssistantVisible(false);
    setShowAttractor(false);

    if (!mapReady) return;

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
        console.warn('App: mainMapRef.current is null in handleVoicePlacePin');
        return;
      }
      const cz = map.getZoom() ?? 10;
      const tenMileBounds = boundsForMiles(ll, 10);
      map.fitBounds(tenMileBounds, { animate: false });
      const tenMileZoom = map.getZoom();
      map.setZoom(cz, { animate: false });
      if (cz < tenMileZoom) {
        map.fitBounds(tenMileBounds, { animate: true });
      } else {
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
      console.error('Voice pin placement failed:', err);
      setToast({ title: 'Error', text: 'Failed to place pin. Please try again.' });
    }
  }

  // map click
  async function handlePick(ll) {
    console.log('App: handlePick called with latlng=', ll, 'mapReady=', mapReady, 'isMobile=', isMobile);

    // Dismiss voice assistant when placing pin
    setVoiceAssistantVisible(false);
    setShowAttractor(false);

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
      allow_anonymous_messages: form.allowAnonymousMessages || false,
      loyalty_email: form.anonymousContactMethod === 'email' ? form.anonymousContactValue : null,
      // Store phone in loyalty_phone if they chose phone for anonymous messages
      // (only if they didn't already provide a loyalty phone)
      ...(!loyaltyPhoneNormalized && form.anonymousContactMethod === 'phone' && form.anonymousContactValue
        ? { loyalty_phone: normalizePhoneToE164ish(form.anonymousContactValue) }
        : {}
      ),
    };

    try {
      const inserted = await setPins(rec);

      // Facebook share with pin card image
      if (shareToFb && rec.note) {
        const pinCardImageUrl = `${window.location.origin}/api/generate-pin-image?slug=${encodeURIComponent(rec.slug)}`;
        postToFacebook({
          lat: rec.lat,
          lng: rec.lng,
          note: rec.note,
          source: rec.source,
          slug: rec.slug,
          pinCardImageUrl,
        });
      }

      // Vestaboard notification (fire and forget - don't block on errors)
      if (adminSettings.vestaboardEnabled && isVestaboardConfigured()) {
        notifyPinPlacement({
          slug: rec.slug,
          team: rec.team || rec.continent,
          notes: rec.note,
        }).catch(err => console.warn('Vestaboard notification failed:', err));
      }

      // Webhook/SMS notification (fire and forget - don't block on errors)
      if (adminSettings.notificationsEnabled) {
        sendPinNotification(rec, adminSettings)
          .then(result => {
            if (result.success) {
              console.info('Pin notification sent:', result.results);
            } else {
              console.warn('Pin notification failed:', result.error);
            }
          })
          .catch(err => console.warn('Pin notification request failed:', err));
      }

      // Square Loyalty points (fire and forget - don't block on errors)
      if (adminSettings.loyaltyEnabled && form.loyaltyPhone) {
        const phoneE164 = normalizePhoneToE164ish(form.loyaltyPhone);
        if (phoneE164) {
          fetch('/api/square-loyalty-add-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phoneNumber: phoneE164,
              points: 1,
              reason: `Pin placed at ${rec.slug || 'location'}`,
            }),
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                console.info('Loyalty points added:', data);
              } else {
                console.warn('Loyalty points failed:', data.error);
              }
            })
            .catch(err => console.warn('Loyalty API request failed:', err));
        }
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
    setVoiceAssistantVisible(false); // Dismiss voice assistant in global mode
    setShowAttractor(false); // Dismiss tap/pinch hints in global mode
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
        setVoiceAssistantVisible(true); // Show voice assistant when returning home
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
    setVoiceAssistantVisible(true); // Show voice assistant when returning home
    setExploring(isMobile ? true : false);
    if (mainMapRef.current) {
      goToChicago(mainMapRef.current, isMobile);
    }
    setResetCameraToken((t) => t + 1);
  };

  // Center map on specific continent
  const handleContinentClick = (continent) => {
    const map = mainMapRef.current;
    if (!map) return;

    // Continent center coordinates and zoom levels
    const continentViews = {
      chicago: { center: [41.8781, -87.6298], zoom: 10 },
      na: { center: [40.0, -100.0], zoom: 3 },      // North America
      sa: { center: [-15.0, -60.0], zoom: 3 },      // South America
      eu: { center: [50.0, 10.0], zoom: 4 },        // Europe
      as: { center: [30.0, 100.0], zoom: 3 },       // Asia
      af: { center: [0.0, 20.0], zoom: 3 },         // Africa
    };

    const view = continentViews[continent];
    if (view) {
      console.log(`Centering map on ${continent}:`, view);
      map.setView(view.center, view.zoom, { animate: true });
    }
  };

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
            <TeamCount
              pins={pinsDeduped}
              selectedTeam={selectedTeamFilter}
              onTeamSelect={setSelectedTeamFilter}
            />
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
    ) : null; // Continent counts are now shown in HeaderBar itself

  // admin (hidden)
  const [adminOpen, setAdminOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1'
  );
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  // kiosk exit PIN modal
  const [showKioskExitPin, setShowKioskExitPin] = useState(false);

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

  // Four-quadrant touch to open admin panel
  useQuadrantTouch(() => {
    console.log('Four quadrant touch detected - opening admin panel');
    setAdminOpen(true);
  }, !adminOpen); // Only enable when admin panel is closed
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
        continentCounts={continentCounts}
        onContinentClick={handleContinentClick}
        isMobile={isMobile}
        showTableView={showMobileList}
        onToggleView={() => setShowMobileList(!showMobileList)}
      >
        {headerRight}
      </HeaderBar>

      {isDemoMode && (
        <div style={{
          background: industryConfig.brandColor,
          color: 'white',
          padding: '12px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 600,
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span>🎭 Demo Mode: {industryConfig.name} | {industryConfig.tagline}</span>
          <a
            href="https://agentiosk.com/#demo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'white',
              color: industryConfig.brandColor,
              padding: '6px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}
          >
            🚀 Get This For Your Business →
          </a>
        </div>
      )}

      <NewsTicker
        enabled={adminSettings.newsTickerEnabled}
        feedUrl={adminSettings.newsTickerRssUrl}
        scrollSpeed={isMobile ? adminSettings.newsTickerScrollSpeedMobile : adminSettings.newsTickerScrollSpeedKiosk}
        isMobile={isMobile}
      />

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
          onMapClick={handleMapClick}
          resetCameraToken={resetCameraToken}
          editing={!!draft}
          clearSearchToken={clearSearchToken}
          mapReady={mapReady}
          isMobile={isMobile}
        >
          {(() => {
            const shouldShow = !isMobile && showPopularSpots && mapMode === 'chicago' && !draft && (!isDemoMode || industryConfig.enabledFeatures.popularSpots);
            console.log('PopularSpots check:', { isMobile, showPopularSpots, mapMode, hasDraft: !!draft, isDemoMode, popularSpotsEnabled: !isDemoMode || industryConfig.enabledFeatures.popularSpots, shouldShow });
            return shouldShow ? <PopularSpotsOverlay labelsAbove showHotDog showItalianBeef labelStyle="pill" /> : null;
          })()}
          {showCommunityPins && !draft && (
            <>
              {adminSettings?.lowZoomVisualization === 'heatmap' ? (
                <ProgressiveVisualization
                  pins={pinsForRender}
                  enabled={true}
                  heatmapZoom={11}
                  bubbleZoom={13}
                  maxZoom={17}
                  radius={adminSettings.heatmapRadius}
                  blur={adminSettings.heatmapBlur}
                  intensity={adminSettings.heatmapIntensity}
                  max={adminSettings.heatmapMax}
                />
              ) : (
                <PinBubbles pins={pinsForRender} enabled={true} minZoomForPins={13} maxZoom={17} />
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
                onMessage={(pin) => {
                  setPinToMessage(pin);
                  setMessageModalOpen(true);
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

        {/* Removed AttractorOverlay - users can figure out map interaction */}

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
            // Check for Lake Michigan before setting draft
            if (mapMode === 'chicago' && isInLakeMichigan(ll.lat, ll.lng)) {
              setToast({
                title: 'Invalid Location',
                text: 'Cannot place a pin in Lake Michigan! Please select a location on land.'
              });
              setTimeout(() => setToast(null), 5000);
              closeSubmap();
              return;
            }

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

      <GlobalAudioPlayer />

      <Footer
        isMobile={isMobile}
        draft={draft}
        exploring={exploring}
        mapMode={mapMode}
        mapReady={mapReady}
        navSettings={navSettings}
        enabledCount={enabledCount}
        setGamesOpen={setGamesOpen}
        setJukeboxOpen={setJukeboxOpen}
        setOrderMenuOpen={setOrderMenuOpen}
        setPhotoBoothOpen={setPhotoBoothOpen}
        setThenAndNowOpen={setThenAndNowOpen}
        setCommentsOpen={setCommentsOpen}
        setExploring={setExploring}
        setShowAttractor={setShowAttractor}
        setVoiceAssistantVisible={setVoiceAssistantVisible}
        handleFooterClick={handleFooterClick}
        handleFooterTouch={handleFooterTouch}
        slug={slug}
        form={form}
        setForm={setForm}
        hotdogSuggestions={hotdogSuggestions}
        cancelEditing={cancelEditing}
        setShareOpen={setShareOpen}
        adminSettings={adminSettings}
        downloadingBarVisible={downloadingBarVisible}
      />

      {(!isMobile || adminSettings.showNowPlayingOnMobile) && (
        <NowPlayingBanner
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          lastPlayed={lastPlayed}
          nextInQueue={queue[0] || null}
          scrollSpeed={isMobile ? adminSettings.nowPlayingScrollSpeedMobile : adminSettings.nowPlayingScrollSpeedKiosk}
          isMobile={isMobile}
        />
      )}

      <ShareConfirmModal
        open={shareOpen}
        onCancel={() => setShareOpen(false)}
        onConfirm={savePin}
        shareToFb={shareToFb}
        setShareToFb={setShareToFb}
        draft={draft}
        form={form}
        setForm={setForm}
        mapMode={mapMode}
        facebookShareEnabled={adminSettings.facebookShareEnabled}
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

      {messageModalOpen && pinToMessage && (
        <AnonymousMessageModal
          recipientPin={pinToMessage}
          onClose={() => {
            setMessageModalOpen(false);
            setPinToMessage(null);
          }}
          onSend={async (messageData) => {
            await sendAnonymousMessage(messageData, adminSettings);
            setToast({
              title: 'Message Sent!',
              text: 'Your anonymous message has been delivered.',
            });
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}

      {adminOpen && (
        <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
      )}

      <PinCodeModal
        open={showKioskExitPin}
        onSuccess={() => {
          exitKioskNow();
          setShowKioskExitPin(false);
        }}
        onCancel={() => setShowKioskExitPin(false)}
        title="Exit Kiosk Mode"
        expectedPin={adminSettings.kioskExitPin}
      />

      {isMobile && showMobileList && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: '#0f1117',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MobilePinsTable
            pins={pinsForRender}
            onClose={() => setShowMobileList(false)}
          />
        </div>
      )}

      {orderMenuOpen && (
        <OrderMenu onClose={() => setOrderMenuOpen(false)} />
      )}

      {jukeboxOpen && (!isDemoMode || industryConfig.enabledFeatures.jukebox) && (
        <Jukebox onClose={() => {
          console.log('App.jsx - Jukebox onClose called, closing modal...');
          setJukeboxOpen(false);
        }} />
      )}

      {gamesOpen && (!isDemoMode || industryConfig.enabledFeatures.games) && (
        <GamesMenu onClose={() => setGamesOpen(false)} />
      )}

      {photoBoothOpen && (!isDemoMode || industryConfig.enabledFeatures.photoBooth) && (
        <EnhancedPhotoBooth onClose={() => setPhotoBoothOpen(false)} />
      )}

      {thenAndNowOpen && (!isDemoMode || industryConfig.enabledFeatures.thenAndNow) && (
        <ThenAndNow onClose={() => setThenAndNowOpen(false)} />
      )}

      {commentsOpen && (!isDemoMode || industryConfig.enabledFeatures.feedback) && (
        <CommentsModal onClose={() => setCommentsOpen(false)} />
      )}

      {adminSettings.showWeatherWidget && (
        <WeatherWidget autoDismissOnEdit={draft !== null || exploring} />
      )}

      {(() => {
        const shouldShow = isMobile && adminSettings.showNavMenuOnMobile;
        console.log('[App] MobileNavMenu render check:', { isMobile, showNavMenuOnMobile: adminSettings.showNavMenuOnMobile, shouldShow });
        return shouldShow ? (
          <MobileNavMenu
            navSettings={navSettings}
            setGamesOpen={setGamesOpen}
            setJukeboxOpen={setJukeboxOpen}
            setOrderMenuOpen={setOrderMenuOpen}
            setPhotoBoothOpen={setPhotoBoothOpen}
            setThenAndNowOpen={setThenAndNowOpen}
            setCommentsOpen={setCommentsOpen}
            setVoiceAssistantVisible={setVoiceAssistantVisible}
          />
        ) : null;
      })()}

      <OfflineIndicator />
      <TouchSequenceIndicator />
      <LocationSwitcher />
      <HolidayTheme />
      <PWAInstallPrompt />
      <AchievementNotification />
      <DemoModeSwitcher />

      {/* Voice AI Agent - enabled for all demos and industries, hidden in admin panel */}
      {!adminOpen && (
        <VoiceAssistant
          locationId={isDemoMode ? `demo-${industryConfig.industry}` : 'default'}
          industry={isDemoMode ? industryConfig.industry : 'default'}
          enabled={true}
          language="en-US"
          enabledFeatures={isDemoMode ? industryConfig.enabledFeatures : {}}
          navSettings={navSettings}
          onPlacePin={handleVoicePlacePin}
          shouldShow={voiceAssistantVisible}
        />
      )}

      {/* Offline Map Downloader - Auto-starts in native app, hidden in browser */}
      {adminSettings.showOfflineMapDownloader !== false && (
        <OfflineMapDownloader
          autoStart={true}
          mode={mapMode}
          onVisibilityChange={setDownloadingBarVisible}
        />
      )}

      {/* Industry Demo Switcher - Press D-E-M-O to open */}
      <IndustryDemoSwitcherModal
        isOpen={demoSwitcher.isOpen}
        onClose={demoSwitcher.close}
        onSwitch={demoSwitcher.switchToIndustry}
      />

      {/* Debug Panel - Press D-E-B-U-G to toggle or add ?debug=true to URL */}
      <DebugPanel />
    </div>
  );
}