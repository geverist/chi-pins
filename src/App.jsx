// src/App.jsx
import { useMemo, useRef, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import logoUrl from './assets/logo.png';
import { getIndustryConfig, isIndustryDemo } from './config/industryConfigs';

// hooks
import { usePins } from './hooks/usePins';
import { useIdleAttractor } from './hooks/useIdleAttractor';
import { useFunFacts, getRandomFact } from './hooks/useFunFacts';
import { useModalManager } from './hooks/useModalManager';
import { useHighlightPin } from './hooks/useHighlightPin';
import { useTouchSequence } from './hooks/useTouchSequence';
import { useSmartProximityDetection } from './hooks/useSmartProximityDetection';
import { useAdaptiveLearning } from './hooks/useAdaptiveLearning';
import { initConsoleWebhook, updateWebhookUrl, sendTestEvent, getWebhookStatus } from './lib/consoleWebhook';
import { getSyncService } from './lib/syncService';
import { LayoutStackProvider } from './hooks/useLayoutStack';

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
import { goToChicago } from './lib/mapActions';

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
import PinPlacementEffect from './components/PinPlacementEffect';
import DraftMarker from './components/DraftMarker';
import SubMapModal from './components/SubMapModal';
import ShareConfirmModal from './components/ShareConfirmModal';
import PopularSpotsOverlay from './components/PopularSpotsOverlay';
import PopularSpotModal from './components/PopularSpotModal';
import Toast from './components/Toast';
import AttractorOverlay from './components/AttractorOverlay';
import WalkupAttractor from './components/WalkupAttractor';
import PinShareModal from './components/PinShareModal';
import NewsTicker from './components/NewsTicker';
import CommentsBanner from './components/CommentsBanner';
import NowPlayingBanner from './components/NowPlayingBanner';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
const EnhancedPhotoBooth = lazy(() => import('./components/EnhancedPhotoBooth'));
import ThenAndNow from './components/ThenAndNow';
import { initRemoteLogger } from './utils/remoteLogger';
import WeatherWidget from './components/WeatherWidget';
import QRCodeWidget from './components/QRCodeWidget';
import OfflineIndicator from './components/OfflineIndicator';
import TouchSequenceIndicator from './components/TouchSequenceIndicator';
import AnonymousMessageModal from './components/AnonymousMessageModal';
import CommentsModal from './components/CommentsModal';
import EmployeeCheckinModal from './components/EmployeeCheckinModal';
import LocationSwitcher from './components/LocationSwitcher';
import HolidayTheme from './components/HolidayTheme';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AchievementNotification from './components/AchievementNotification';
import DemoModeSwitcher from './components/DemoModeSwitcher';
import VoiceAssistant from './components/VoiceAssistant';
import DebugPanel from './components/DebugPanel';
import PerformanceDiagnostics from './components/PerformanceDiagnostics';
import FloatingExploreButton from './components/FloatingExploreButton';
import { useIndustryDemoSwitcher, IndustryDemoSwitcherModal } from './hooks/useIndustryDemoSwitcher';
import { getPersistentStorage } from './lib/persistentStorage';
import { enableImmersiveMode, maintainImmersiveMode } from './lib/immersiveMode';
import { useLayoutEditMode } from './hooks/useLayoutEditMode';
import DraggableEditWrapper from './components/DraggableEditWrapper';
import LayoutEditModeOverlay from './components/LayoutEditModeOverlay';
import { useBusinessHours } from './hooks/useBusinessHours';
import ClosedOverlay from './components/ClosedOverlay';
import MotionIndicator from './components/MotionIndicator';
import CallBorderIndicator from './components/CallBorderIndicator';

// clustering helpers
import PinBubbles from './components/PinBubbles';
import ProgressiveVisualization from './components/ProgressiveVisualization';
import ZoomGate from './components/ZoomGate';

// Admin panel
import AdminPanel from './components/AdminPanel';
import OfflineMapDownloader from './components/OfflineMapDownloader';
import PinCodeModal from './components/PinCodeModal';
import MobilePinsTable from './components/MobilePinsTable';
import MobileNavMenu from './components/MobileNavMenu';
import OrderMenu from './components/OrderMenu';
const Jukebox = lazy(() => import('./components/Jukebox'));
import GamesMenu from './components/GamesMenu';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
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

  // Adaptive Learning - ML-powered proximity threshold optimization
  const adaptiveLearning = useAdaptiveLearning({
    tenantId: adminSettings.tenantId || 'chicago-mikes',
    enabled: adminSettings.proximityLearningEnabled !== false,
    learningAggressiveness: adminSettings.learningAggressiveness || 50,
    passiveLearningMode: adminSettings.passiveLearningMode || false,
    passiveLearningDays: adminSettings.passiveLearningDays || 7,
    onThresholdAdjusted: ({ newThresholds, reason }) => {
      console.log('[App] Threshold adjustment recommended:', reason, newThresholds);
      setToast({
        title: '🎯 Thresholds Adjusted',
        text: reason,
      });
      setTimeout(() => setToast(null), 5000);
    },
    onModelTrained: ({ accuracy, sessionsUsed }) => {
      console.log(`[App] Model trained! Accuracy: ${(accuracy * 100).toFixed(1)}% (${sessionsUsed} sessions)`);
    },
  });

  // Layout edit mode (4-corner tap sequence for dragging widgets)
  const { isEditMode, setIsEditMode, savePosition, getPosition, getAllPositions } = useLayoutEditMode();

  // Business hours management
  const { isOpen: isBusinessHoursOpen, nextChange, businessHoursEnabled, openTime } = useBusinessHours();

  // Adaptive learning session tracking refs
  const currentLearningSessionRef = useRef(null);
  const sessionEngagementStartRef = useRef(null);

  // Ambient music player ref for proximity-triggered playback
  const ambientMusicPlayerRef = useRef(null);
  const [ambientMusicPlaying, setAmbientMusicPlaying] = useState(false);

  // Ambient music playback functions (wrapped in useCallback to prevent infinite re-renders)
  const playAmbientMusic = useCallback(() => {
    if (!ambientMusicPlayerRef.current && adminSettings.ambientMusicPlaylist?.length > 0) {
      const playlist = adminSettings.ambientMusicPlaylist;
      const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];

      const audio = new Audio(randomTrack.url);
      audio.volume = adminSettings.ambientMusicVolume || 0.5;
      audio.loop = true;

      if (adminSettings.ambientMusicFadeIn) {
        audio.volume = 0;
        audio.play();
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol += 0.05;
          if (vol >= (adminSettings.ambientMusicVolume || 0.5)) {
            audio.volume = adminSettings.ambientMusicVolume || 0.5;
            clearInterval(fadeInterval);
          } else {
            audio.volume = vol;
          }
        }, 100);
      } else {
        audio.play();
      }

      ambientMusicPlayerRef.current = audio;
      setAmbientMusicPlaying(true);
      console.log('[App] Ambient music started:', randomTrack.name);
    }
  }, [adminSettings.ambientMusicPlaylist, adminSettings.ambientMusicVolume, adminSettings.ambientMusicFadeIn]);

  const stopAmbientMusic = useCallback(() => {
    if (ambientMusicPlayerRef.current) {
      const audio = ambientMusicPlayerRef.current;

      if (adminSettings.ambientMusicFadeOut) {
        let vol = audio.volume;
        const fadeInterval = setInterval(() => {
          vol -= 0.05;
          if (vol <= 0) {
            audio.pause();
            audio.src = '';
            ambientMusicPlayerRef.current = null;
            setAmbientMusicPlaying(false);
            clearInterval(fadeInterval);
          } else {
            audio.volume = vol;
          }
        }, 100);
      } else {
        audio.pause();
        audio.src = '';
        ambientMusicPlayerRef.current = null;
        setAmbientMusicPlaying(false);
      }

      console.log('[App] Ambient music stopped');
    }
  }, [adminSettings.ambientMusicFadeOut]);

  // Proximity detection callbacks (wrapped in useCallback to prevent infinite re-renders)
  const handleProximityApproach = useCallback(({ proximityLevel }) => {
    console.log('[App] Person detected approaching! Proximity:', proximityLevel);

    // Start learning session
    const session = adaptiveLearning.startSession({
      proximityLevel,
      intent: 'approaching',
      confidence: 85,
      baseline: 50,
      threshold: adminSettings.proximityThreshold || 60,
    });

    if (session) {
      currentLearningSessionRef.current = session;
      sessionEngagementStartRef.current = Date.now();
    }

    // Stop ambient music when person approaches for voice greeting
    if (ambientMusicPlaying) {
      console.log('[App] Stopping ambient music for voice greeting');
      stopAmbientMusic();
    }

    // Pause any jukebox music playing via GlobalAudioPlayer
    const globalAudio = document.querySelector('audio[data-global-audio]');
    if (globalAudio && !globalAudio.paused) {
      console.log('[App] Pausing jukebox audio for voice greeting');
      globalAudio.pause();
      // Store reference so we can resume later if needed
      globalAudio.dataset.pausedForVoice = 'true';
    }

    setShowAttractor(true);
    // Voice greeting will be triggered by WalkupAttractor component
    // if adminSettings.proximityTriggerVoice && adminSettings.walkupAttractorVoiceEnabled
  }, [ambientMusicPlaying, stopAmbientMusic, adaptiveLearning, adminSettings.proximityThreshold]);

  const handleProximityLeave = useCallback(() => {
    console.log('[App] Person left walkup zone');
  }, []);

  const handleAmbientDetected = useCallback(({ proximityLevel }) => {
    console.log('[App] Ambient motion detected! Proximity:', proximityLevel);

    // Start learning session for ambient
    const session = adaptiveLearning.startSession({
      proximityLevel,
      intent: 'ambient',
      confidence: 70,
      baseline: 50,
      threshold: adminSettings.ambientMusicThreshold || 95,
    });

    if (session) {
      currentLearningSessionRef.current = session;
      sessionEngagementStartRef.current = Date.now();
    }

    // DEMO: Force play ambient music (hardcoded for demo) - plays only once
    if (!ambientMusicPlaying) {
      // Hardcoded demo track
      if (!ambientMusicPlayerRef.current) {
        const audio = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
        audio.volume = 0.5;
        audio.loop = false; // Play only once, not continuously
        audio.play();
        // Auto-cleanup when song ends
        audio.addEventListener('ended', () => {
          ambientMusicPlayerRef.current = null;
          setAmbientMusicPlaying(false);
          console.log('[App] Ambient music ended');
        });
        ambientMusicPlayerRef.current = audio;
        setAmbientMusicPlaying(true);
        console.log('[App] DEMO - Ambient music started (will play once)');
      }
    }
  }, [ambientMusicPlaying, adaptiveLearning, adminSettings.ambientMusicThreshold]);

  const handleAmbientCleared = useCallback(() => {
    console.log('[App] Ambient area cleared');
    // Fade out or stop ambient music after idle timeout
    if (adminSettings.ambientMusicEnabled && ambientMusicPlaying) {
      stopAmbientMusic();
    }
  }, [adminSettings.ambientMusicEnabled, ambientMusicPlaying, stopAmbientMusic]);

  // Employee checkin modal state
  const [employeeCheckinOpen, setEmployeeCheckinOpen] = useState(false);
  const [staringPerson, setStaringPerson] = useState(null);
  const [stareDuration, setStareDuration] = useState(0);

  const handleStareDetected = useCallback(({ personId, proximityLevel, stareDuration, isLookingAtKiosk, headPose }) => {
    console.log('[App] 🔍 Stare detected! Person:', personId, 'Proximity:', proximityLevel, 'Duration:', Math.round(stareDuration / 1000), 's', 'Looking:', isLookingAtKiosk);

    // Update stare duration state
    setStareDuration(stareDuration);

    // Open employee checkin modal
    setStaringPerson({ personId, proximityLevel, stareDuration, isLookingAtKiosk, headPose });
    setEmployeeCheckinOpen(true);
  }, []);

  const handleStareEnded = useCallback(({ personId, stareDuration }) => {
    console.log('[App] Stare ended. Person:', personId, 'Duration:', Math.round(stareDuration / 1000), 's');
    // Clear stare duration
    setStareDuration(0);
    // Keep modal open even if they look away briefly
  }, []);

  // Add disengagement handler
  const handleDisengagement = useCallback(({ personId, reason }) => {
    console.log('[App] Patron disengaged. Person:', personId, 'Reason:', reason);
    // Return to main attractor screen if no one else is engaged
  }, []);

  // Smart Proximity Detection - Multi-person tracking with gaze validation
  const {
    isAmbientDetected,
    isWalkupDetected,
    isStaring,
    trackedPeople,
    activePeopleCount,
    maxProximityLevel,
    isInitialized,
    trackingError,
    recordInteraction,
    recordConversion,
  } = useSmartProximityDetection({
    enabled: adminSettings.proximityDetectionEnabled,
    ambientThreshold: adminSettings.ambientMusicThreshold || 30,
    walkupThreshold: adminSettings.proximityThreshold || 60,
    stareThreshold: adminSettings.stareThreshold || 60,
    stareDurationMs: adminSettings.stareDurationMs || 15000,
    detectionInterval: adminSettings.proximityDetectionInterval || 500,
    onAmbientDetected: handleAmbientDetected,
    onAmbientCleared: handleAmbientCleared,
    onWalkupDetected: handleProximityApproach,
    onWalkupEnded: handleProximityLeave,
    onStareDetected: handleStareDetected,
    onStareEnded: handleStareEnded,
    onDisengagement: handleDisengagement,
    enableLearning: adminSettings.proximityLearningEnabled !== false,
    tenantId: adminSettings.tenantId || 'chicago-mikes',
  });

  // Compatibility: map new variables to old names for components that haven't been updated yet
  const isPersonDetected = isWalkupDetected;
  const proximityLevel = maxProximityLevel;
  const cameraError = trackingError;

  // Debug logging for Now Playing state
  useEffect(() => {
    console.log('App.jsx - currentTrack changed:', currentTrack);
    console.log('App.jsx - isPlaying:', isPlaying);
    console.log('App.jsx - lastPlayed:', lastPlayed);
    console.log('App.jsx - queue:', queue);
  }, [currentTrack, isPlaying, lastPlayed, queue]);

  // Helper function to validate pin coordinates
  function validatePinCoordinates(pin) {
    if (!pin) return false;
    return pin.lat !== null && pin.lat !== undefined && 
           pin.lng !== null && pin.lng !== undefined &&
           Number.isFinite(pin.lat) && Number.isFinite(pin.lng);
  }

  // Migrate localStorage to persistent storage on app load (runs once)
  useEffect(() => {
    const storage = getPersistentStorage();
    storage.migrateFromLocalStorage();
    console.log('[App] Persistent storage migration initiated');

    // Test coordinate validation (will trigger bug after 5 seconds)
    setTimeout(() => {
      validatePinCoordinates({ lat: 41.8781, lng: -87.6298 });
    }, 5000);
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

  // Modal management - centralized in useModalManager hook
  const {
    shareOpen,
    setShareOpen,
    pinShareOpen,
    setPinShareOpen,
    messageModalOpen,
    setMessageModalOpen,
    commentsOpen,
    setCommentsOpen,
    orderMenuOpen,
    setOrderMenuOpen,
    jukeboxOpen,
    setJukeboxOpen,
    gamesOpen,
    setGamesOpen,
    photoBoothOpen,
    setPhotoBoothOpen,
    thenAndNowOpen,
    setThenAndNowOpen,
    adminOpen,
    setAdminOpen,
    closeAllModals,
  } = useModalManager();

  // Share modal specific state
  const [shareToFb, setShareToFb] = useState(false);

  // Pin share modal specific state
  const [pinToShare, setPinToShare] = useState(null);

  // Anonymous message modal specific state
  const [pinToMessage, setPinToMessage] = useState(null);

  // Popular spot modal state
  const [selectedPopularSpot, setSelectedPopularSpot] = useState(null);

  // voice assistant visibility
  const [voiceAssistantVisible, setVoiceAssistantVisible] = useState(true);

  // downloading bar visibility (for footer margin adjustment)
  const [downloadingBarVisible, setDownloadingBarVisible] = useState(false);

  // layer toggles (initialized from admin settings)
  const [showPopularSpots, setShowPopularSpots] = useState(adminSettings.showPopularSpots || false);
  const [showCommunityPins, setShowCommunityPins] = useState(adminSettings.showCommunityPins !== false);
  const [showMobileList, setShowMobileList] = useState(false);

  // highlight
  const [highlightSlug, setHighlightSlug] = useState(null);
  const { trigger: triggerHighlight, clear: clearHighlight } = useHighlightPin(setHighlightSlug);

  // Pin placement effect trigger
  const [pinPlacementEffect, setPinPlacementEffect] = useState({ lat: null, lng: null, trigger: 0 });

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

  // Calculate if Now Playing banner is actually showing (matches NowPlayingBanner.jsx logic)
  // Must be after isMobile is defined
  const nowPlayingActuallyVisible = !isMobile && (currentTrack || queue[0]);
  console.log('[App] nowPlayingActuallyVisible:', JSON.stringify({
    nowPlayingActuallyVisible,
    isMobile,
    hasCurrentTrack: !!currentTrack,
    hasQueueItem: !!queue[0]
  }));

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Initialize remote logger for debugging (once on mount)
    initRemoteLogger();

    // Start background sync service for SQLite cache
    const syncService = getSyncService();
    syncService.start(adminSettings.databaseSyncMinutes).catch(err => {
      console.error('[App] Failed to start sync service:', err);
    });

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

  // Separate useEffect for console webhook initialization that re-runs when settings change
  useEffect(() => {
    console.log('[App] Webhook settings changed:', {
      enabled: adminSettings.consoleWebhookEnabled,
      url: adminSettings.consoleWebhookUrl,
      levels: adminSettings.consoleWebhookLevels
    });

    // Initialize or re-initialize console webhook when settings change
    if (adminSettings.consoleWebhookEnabled && adminSettings.consoleWebhookUrl) {
      initConsoleWebhook(adminSettings.consoleWebhookUrl, adminSettings.consoleWebhookEnabled, {
        includeTimestamps: true,
        includeLocation: true,
        maxMessageLength: 1000,
        levels: adminSettings.consoleWebhookLevels || ['log', 'error', 'warn', 'info'],
      });
      console.log('[App] ✅ Console webhook initialized:', adminSettings.consoleWebhookUrl);
    } else {
      console.log('[App] Console webhook disabled or no URL configured');
    }
  }, [adminSettings.consoleWebhookEnabled, adminSettings.consoleWebhookUrl, adminSettings.consoleWebhookLevels]);

  // Update sync interval when admin setting changes
  useEffect(() => {
    const syncService = getSyncService();
    if (syncService.syncTimer) {
      syncService.updateInterval(adminSettings.databaseSyncMinutes);
    }
  }, [adminSettings.databaseSyncMinutes]);

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

  // Touch sequence to refresh page (triple-tap center) - DISABLED to avoid conflict with admin panel trigger
  // Use double-tap opposite corners for kiosk mode instead
  // To refresh manually: open admin panel and use browser refresh, or use ?admin=1 URL parameter
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
    enabled: false // DISABLED - conflicts with admin panel triple-tap on pin count badge
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
    adminOpen, // Don't trigger idle reset when admin panel is open
    timeoutMs: 60 * 1000,
    confettiScreensaverEnabled: adminSettings.confettiScreensaverEnabled,
    onIdle: () => {
      // Record abandonment if there's an active learning session
      if (currentLearningSessionRef.current) {
        adaptiveLearning.endSession({
          outcome: 'abandoned',
          engagedDurationMs: 0,
          converted: false,
        });

        currentLearningSessionRef.current = null;
        sessionEngagementStartRef.current = null;
      }

      // Close all modals and reset to main map
      cancelEditing();
      setClearSearchToken((t) => t + 1);

      // Restore all overlay UI elements even if previously dismissed by user
      setVoiceAssistantVisible(true);
      setShowAttractor(true);
      setShowPopularSpots(adminSettings.showPopularSpots || false);

      // Dismiss keyboard by blurring any focused input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Close all modals using centralized function (except admin)
      closeAllModals();
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
      const fact = getRandomFact(funFacts, key);

      // Only show toast if we have an actual fun fact (don't show fallback messages)
      if (fact) {
        console.log('Showing toast with fact:', fact);
        setToast({ title: candidate, text: fact });
        const duration = (adminSettings.funFactDurationSeconds || 15) * 1000;
        setTimeout(() => setToast(null), duration);
      } else {
        console.log('No fun fact available for:', candidate);
      }
    } catch (err) {
      console.error('Failed to fetch fun fact:', err);
    }
  }

  // Check if coordinates are within Chicago city limits (not entire metro area)
  function isWithinChicagoCityLimits(lat, lng) {
    // Chicago city boundaries (approximate bounding box)
    // North: Rogers Park (~42.02), South: Hegewisch (~41.65)
    // West: O'Hare area (~-87.93), East: Lake Michigan (~-87.52)
    const CHICAGO_CITY_BOUNDS = {
      north: 42.02,
      south: 41.65,
      west: -87.93,
      east: -87.52
    };

    return lat >= CHICAGO_CITY_BOUNDS.south &&
           lat <= CHICAGO_CITY_BOUNDS.north &&
           lng >= CHICAGO_CITY_BOUNDS.west &&
           lng <= CHICAGO_CITY_BOUNDS.east;
  }

  // Handle any map click for fun facts (desktop only, within Chicago city limits)
  function handleMapClick(ll) {
    if (mapMode === 'chicago' && adminSettings.funFactsEnabled && !isMobile) {
      // Only show fun facts if click is within Chicago city limits AND not in Lake Michigan
      if (isWithinChicagoCityLimits(ll.lat, ll.lng) && !isInLakeMichigan(ll.lat, ll.lng)) {
        showNearestTownFact(ll.lat, ll.lng);
      }
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

      // Record successful pin placement as conversion in learning session
      if (currentLearningSessionRef.current) {
        const engagementDuration = sessionEngagementStartRef.current
          ? Date.now() - sessionEngagementStartRef.current
          : 0;

        adaptiveLearning.endSession({
          outcome: 'converted',
          engagedDurationMs: engagementDuration,
          converted: true,
        });

        currentLearningSessionRef.current = null;
        sessionEngagementStartRef.current = null;
      }

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

  // admin (hidden) - adminOpen and setAdminOpen come from useModalManager
  // Initialize admin state from URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1') {
      setAdminOpen(true);
    }
  }, [setAdminOpen]);
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

  // Admin panel is now opened via triple-tap on logo (no screen-wide listener for performance)
  const handleFooterTouch = (e) => {
    if (shouldCountTap(e)) registerTap();
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // Calculate if WalkupAttractor is currently active (for full-screen mode)
  const walkupAttractorActive = adminSettings.simulationMode
    ? !draft && !submapCenter && !exploring
    : adminSettings.walkupAttractorEnabled && showAttractor && !draft && !submapCenter && !exploring;

  return (
    <ErrorBoundary name="Main App">
      <LayoutStackProvider>
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
      {!walkupAttractorActive && <HeaderBar
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
        onAdminOpen={() => setAdminOpen(true)}
      >
        {headerRight}
      </HeaderBar>}

      {!walkupAttractorActive && isDemoMode && (
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

      {!walkupAttractorActive && <NewsTicker
        enabled={adminSettings.newsTickerEnabled}
        feedUrl={adminSettings.newsTickerRssUrl}
        scrollSpeed={isMobile ? adminSettings.newsTickerScrollSpeedMobile : adminSettings.newsTickerScrollSpeedKiosk}
        isMobile={isMobile}
      />}

      {!walkupAttractorActive && adminSettings.commentsBannerEnabled && (
        <CommentsBanner
          enabled={adminSettings.commentsBannerEnabled}
          customKeywords={adminSettings.commentsBannerProhibitedKeywords || []}
          scrollSpeed={adminSettings.commentsBannerScrollSpeed || 60}
          maxComments={adminSettings.commentsBannerMaxComments || 20}
          refreshInterval={adminSettings.commentsBannerRefreshInterval || 120000}
        />
      )}

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
          downloadingBarVisible={downloadingBarVisible}
          nowPlayingVisible={nowPlayingActuallyVisible}
          walkupAttractorActive={walkupAttractorActive}
        >
          {(() => {
            const shouldShow = !walkupAttractorActive && !isMobile && showPopularSpots && mapMode === 'chicago' && !draft && (!isDemoMode || industryConfig.enabledFeatures.popularSpots);
            console.log('PopularSpots check:', { walkupAttractorActive, isMobile, showPopularSpots, mapMode, hasDraft: !!draft, isDemoMode, popularSpotsEnabled: !isDemoMode || industryConfig.enabledFeatures.popularSpots, shouldShow });
            return shouldShow ? (
              <PopularSpotsOverlay
                labelsAbove
                showHotDog
                showItalianBeef
                labelStyle="pill"
                exploring={exploring}
                onSpotClick={setSelectedPopularSpot}
              />
            ) : null;
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

        {(() => {
          const shouldShowOverlay = !walkupAttractorActive && adminSettings.attractorHintEnabled && showAttractor && !draft && !submapCenter && !exploring;
          console.log('[App] AttractorOverlay conditions:', {
            walkupAttractorActive,
            attractorHintEnabled: adminSettings.attractorHintEnabled,
            showAttractor,
            hasDraft: !!draft,
            hasSubmapCenter: !!submapCenter,
            exploring,
            shouldShowOverlay
          });
          return shouldShowOverlay ? <AttractorOverlay onDismiss={() => setShowAttractor(false)} /> : null;
        })()}

        {/* Walkup Attractor - AI voice greeting when idle */}
        <WalkupAttractor
          active={
            // Simulation mode forces attractor to show immediately
            adminSettings.simulationMode
              ? !draft && !submapCenter && !exploring
              : adminSettings.walkupAttractorEnabled && showAttractor && !draft && !submapCenter && !exploring
          }
          onDismiss={() => setShowAttractor(false)}
          voiceEnabled={adminSettings.walkupAttractorVoiceEnabled ?? false}
          enabledFeatures={[
            navSettings.games_enabled && 'games',
            navSettings.jukebox_enabled && 'jukebox',
            navSettings.photobooth_enabled && 'photobooth',
            navSettings.order_enabled && 'order',
          ].filter(Boolean)}
          businessName={adminSettings.businessName || "Chicago Mike's"}
          rotationSeconds={adminSettings.walkupAttractorRotationSeconds || 4}
          customPrompts={adminSettings.walkupAttractorPrompts || []}
        />

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

      {!walkupAttractorActive && <Footer
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
        nowPlayingVisible={nowPlayingActuallyVisible}
      />}

      {!walkupAttractorActive && (!isMobile || adminSettings.showNowPlayingOnMobile) && (
        <NowPlayingBanner
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          lastPlayed={lastPlayed}
          nextInQueue={queue[0] || null}
          scrollSpeed={isMobile ? adminSettings.nowPlayingScrollSpeedMobile : adminSettings.nowPlayingScrollSpeedKiosk}
          isMobile={isMobile}
          downloadingBarVisible={downloadingBarVisible}
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
        loyaltyPhone={form?.loyaltyPhone}
        onUpdateLoyaltyPhone={(phone) => setForm(f => ({ ...f, loyaltyPhone: phone }))}
        loyaltyEnabled={adminSettings.loyaltyEnabled}
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

      {/* Employee Checkin Modal - Triggered by prolonged stare detection */}
      <EmployeeCheckinModal
        open={employeeCheckinOpen}
        onClose={() => {
          setEmployeeCheckinOpen(false);
          setStaringPerson(null);
        }}
        person={staringPerson}
        tenantId={adminSettings.tenantId || 'chicago-mikes'}
      />

      {adminOpen && (
        <AdminPanel
          open={adminOpen}
          onClose={() => setAdminOpen(false)}
          isLayoutEditMode={isEditMode}
          setLayoutEditMode={setIsEditMode}
          proximityDetection={{
            enabled: adminSettings.proximityDetectionEnabled,
            proximityLevel,
            isAmbientDetected,
            isPersonDetected,
            isStaring,
            stareDuration,
            cameraError,
          }}
        />
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
        <Suspense fallback={<div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff'}}>Loading...</div>}>
          <Jukebox onClose={() => {
            console.log('App.jsx - Jukebox onClose called, closing modal...');
            setJukeboxOpen(false);
          }} />
        </Suspense>
      )}

      {gamesOpen && (!isDemoMode || industryConfig.enabledFeatures.games) && (
        <GamesMenu onClose={() => setGamesOpen(false)} />
      )}

      {photoBoothOpen && (!isDemoMode || industryConfig.enabledFeatures.photoBooth) && (
        <Suspense fallback={<div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff'}}>Loading...</div>}>
          <EnhancedPhotoBooth onClose={() => setPhotoBoothOpen(false)} />
        </Suspense>
      )}

      {thenAndNowOpen && (!isDemoMode || industryConfig.enabledFeatures.thenAndNow) && (
        <ThenAndNow onClose={() => setThenAndNowOpen(false)} />
      )}

      {commentsOpen && (!isDemoMode || industryConfig.enabledFeatures.feedback) && (
        <CommentsModal onClose={() => setCommentsOpen(false)} />
      )}

      {!walkupAttractorActive && adminSettings.showWeatherWidget && (
        <DraggableEditWrapper
          elementId="weather-widget"
          isEditMode={isEditMode}
          savedPosition={getPosition('weather-widget')}
          onPositionChange={savePosition}
          defaultPosition={{ gridCell: 'top-right', offsetY: 0 }}
          getAllPositions={getAllPositions}
        >
          <WeatherWidget autoDismissOnEdit={draft !== null || exploring} isMobile={isMobile} />
        </DraggableEditWrapper>
      )}

      {/* QR Code Widget for mobile continuation - only show on kiosk/desktop */}
      {!walkupAttractorActive && !isMobile && adminSettings.qrCodeEnabled && (
        <DraggableEditWrapper
          elementId="qr-code"
          isEditMode={isEditMode}
          savedPosition={getPosition('qr-code')}
          onPositionChange={savePosition}
          defaultPosition={{ gridCell: 'bottom-right', offsetY: 0 }}
          getAllPositions={getAllPositions}
        >
          <QRCodeWidget
            url={window.location.origin}
            title="Continue Exploring on Your Phone"
            description="Scan this QR code to view the map on your mobile device"
            enabled={true}
            exploreButtonVisible={navSettings.explore_enabled && !adminOpen}
          />
        </DraggableEditWrapper>
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

      {/* Floating Explore Pins button (only show when enabled in nav settings) */}
      {!walkupAttractorActive && navSettings.explore_enabled && !adminOpen && (
        <DraggableEditWrapper
          elementId="explore-button"
          isEditMode={isEditMode}
          savedPosition={getPosition('explore-button')}
          onPositionChange={savePosition}
          defaultPosition={{ gridCell: 'bottom-right', offsetY: 100 }}
          getAllPositions={getAllPositions}
        >
          <FloatingExploreButton
            exploring={exploring}
            setExploring={setExploring}
            setShowAttractor={setShowAttractor}
            setVoiceAssistantVisible={setVoiceAssistantVisible}
            enabled={true}
            downloadingBarVisible={downloadingBarVisible}
            nowPlayingVisible={nowPlayingActuallyVisible}
            footerVisible={!isMobile && (navSettings.games_enabled || navSettings.jukebox_enabled || navSettings.order_enabled || navSettings.photobooth_enabled || navSettings.thenandnow_enabled || navSettings.comments_enabled || navSettings.recommendations_enabled)}
          />
        </DraggableEditWrapper>
      )}
      <HolidayTheme />
      <PWAInstallPrompt />
      <AchievementNotification />
      <DemoModeSwitcher />

      {/* Voice AI Agent - disabled by default for performance */}
      {!walkupAttractorActive && !adminOpen && adminSettings.voiceAssistantEnabled && (
        <VoiceAssistant
          locationId={isDemoMode ? `demo-${industryConfig.industry}` : 'default'}
          industry={isDemoMode ? industryConfig.industry : 'default'}
          enabled={true}
          language="en-US"
          enabledFeatures={isDemoMode ? industryConfig.enabledFeatures : {}}
          navSettings={navSettings}
          onPlacePin={handleVoicePlacePin}
          shouldShow={voiceAssistantVisible}
          downloadingBarVisible={downloadingBarVisible}
          nowPlayingVisible={nowPlayingActuallyVisible}
          customVoicePrompts={adminSettings.customVoicePrompts}
        />
      )}

      {/* Offline Map Downloader - Downloads map tiles for offline use */}
      {(adminSettings.showOfflineMapDownloader !== false) && (
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

      {/* Performance Diagnostics - Add ?diagnostics=true to URL */}
      {new URLSearchParams(window.location.search).get('diagnostics') === 'true' && (
        <PerformanceDiagnostics />
      )}

      {/* Popular Spot Modal - Shows details when clicking on popular spots in explore mode */}
      <PopularSpotModal
        spot={selectedPopularSpot}
        onClose={() => setSelectedPopularSpot(null)}
      />

      {/* Layout Edit Mode Overlay - Blocks interactions and shows grid during edit mode */}
      <LayoutEditModeOverlay
        isActive={isEditMode}
        onExit={() => setIsEditMode(false)}
      />

      {/* Business Hours Closed Overlay - Shows when outside business hours */}
      {businessHoursEnabled && !isBusinessHoursOpen && (
        <ClosedOverlay nextChange={nextChange} openTime={openTime} />
      )}

      {/* Motion Detection Visual Indicator - Shows green for ambient, orange for walkup, red for stare */}
      <MotionIndicator
        isAmbientDetected={isAmbientDetected}
        isPersonDetected={isPersonDetected}
        isStaring={isStaring}
        stareDuration={stareDuration}
        proximityLevel={proximityLevel}
      />

      {/* Twilio Call Border - Animated border shown when voice bot is on an active call */}
      <CallBorderIndicator enabled={true} />
    </div>
    </LayoutStackProvider>
  </ErrorBoundary>
  );
}