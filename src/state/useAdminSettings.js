// src/state/useAdminSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getPersistentStorage } from '../lib/persistentStorage'

/**
 * Settings live under table "settings" with schema:
 *   id: uuid (default)
 *   key: text (unique)
 *   value: jsonb
 *
 * Row: { key: 'app', value: { ...settings } }
 */
const DEFAULTS = {
  // Kiosk behavior
  idleAttractorSeconds: 60,
  kioskAutoStart: true,
  attractorHintEnabled: false, // Disabled by default for performance
  confettiScreensaverEnabled: false, // Enable confetti screensaver after idle period
  databaseSyncMinutes: 30, // Database sync interval in minutes (pins, trivia, jukebox)

  // Timers (internal)
  idleTimeoutMs: 60_000,
  highlightMs: 30_000,
  exploreDismissMs: 12_000,

  // Feature idle timeouts (seconds)
  gamesIdleTimeout: 180,      // 3 minutes
  jukeboxIdleTimeout: 120,    // 2 minutes
  orderingIdleTimeout: 300,   // 5 minutes

  // Deep Dish Game settings
  deepDishStartSpeed: 2,      // Initial fall speed
  deepDishEndSpeed: 5,        // Maximum fall speed

  // Popcorn Wind Game settings
  popcornStartingPieces: 20,   // Number of popcorn pieces in box at start
  popcornGameDuration: 60,     // Game duration in seconds
  popcornWindStartInterval: 4, // Initial seconds between wind gusts
  popcornWindMinInterval: 2,   // Minimum seconds between wind gusts (speed increases over time)
  popcornWindStartSpeed: 0.3,  // Initial wind gust force
  popcornWindMaxSpeed: 1.2,    // Maximum wind gust force

  // Trivia Game settings
  triviaQuestionTimeLimit: 12, // Seconds per question
  triviaTotalQuestions: 8,     // Total number of questions (8 × 12s = 96s)

  // Hotdog Assembly Game settings
  hotdogTimeLimit: 90,         // Time limit in seconds to assemble the hot dog
  hotdogPerfectOrderBonus: 1000, // Bonus points for perfect order
  hotdogKetchupPenalty: -500,  // Penalty for using ketchup
  hotdogRepositionSpeed: 5,    // Seconds between ingredient repositioning

  // Security PINs
  adminPanelPin: '1111',      // 4-digit PIN for admin panel access
  kioskExitPin: '1111',       // 4-digit PIN for exiting kiosk mode
  adminPanelIdleTimeout: 60,  // Seconds before admin panel auto-closes due to inactivity

  // Map display
  minZoomForPins: 13,
  maxZoom: 17,
  clusterBubbleThreshold: 13,
  showLabelsZoom: 13,
  lowZoomVisualization: 'bubbles', // 'bubbles' | 'heatmap'
  labelStyle: 'pill', // 'pill' | 'clean'

  // Heatmap settings
  heatmapRadius: 25,        // Size of heat points (10-50)
  heatmapBlur: 15,          // Blur amount (5-35)
  heatmapIntensity: 0.8,    // Point intensity (0.1-2.0)
  heatmapMax: 2.0,          // Max heat value for color scaling (0.5-5.0)

  // Content layers
  showPinsSinceMonths: 6, // Reduced from 24 to 6 months for performance
  showPopularSpots: false, // Disabled by default for performance
  showCommunityPins: true,
  enableGlobalBubbles: false, // Disabled by default for performance

  // Features
  loyaltyEnabled: false, // Disabled by default for performance
  vestaboardEnabled: false,
  vestaboardNowPlaying: true, // Default to true when vestaboard is enabled
  vestaboardOrders: false, // Default to false (stubbed)
  facebookShareEnabled: false,
  photoBackgroundsEnabled: true,
  newsTickerEnabled: true, // Changed to true to enable RSS news feed by default
  newsTickerRssUrl: 'https://news.google.com/rss/search?q=chicago&hl=en-US&gl=US&ceid=US:en',
  showOfflineMapDownloader: true, // Enable map tile downloader

  // Comments Banner
  commentsBannerEnabled: false, // Enable scrolling comments banner at top (disabled by default for performance)
  commentsBannerScrollSpeed: 60, // Seconds for full scroll
  commentsBannerMaxComments: 20, // Max number of comments to display
  commentsBannerRefreshInterval: 120000, // 2 minutes - rotate comments
  commentsBannerProhibitedKeywords: [], // Custom prohibited keywords (admin configurable)

  // HEOS Integration
  heosEnabled: false,
  heosHost: '',
  heosPlayerId: '',

  // Performance
  voicePromptsScrollSpeed: 60, // Seconds for full scroll animation

  // Custom Voice Prompts (configurable in admin panel)
  customVoicePrompts: [], // Array of {id, text, aiInstruction, category, enabled}

  // Fun Facts
  funFactsEnabled: true,           // Show fun facts when clicking on Chicago map
  funFactDurationSeconds: 15,      // How long fun fact toast stays visible

  // Notifications
  notificationsEnabled: false,     // Enable notifications for new pin placements
  notificationType: 'webhook',     // 'webhook' | 'sms' | 'both'
  webhookUrl: '',                  // Generic webhook URL for pin notifications
  twilioEnabled: false,            // Enable Twilio SMS notifications
  twilioAccountSid: '',            // Twilio Account SID
  twilioAuthToken: '',             // Twilio Auth Token
  twilioPhoneNumber: '',           // Twilio phone number (from)
  notificationRecipients: '+17204507540', // Default notification destination phone number
  notifyOnFeedback: true,          // Send notifications for customer feedback/comments
  emailRecipients: '',             // Email addresses for notifications (comma-separated)

  // Banner Scroll Speeds (seconds for full scroll)
  newsTickerScrollSpeedKiosk: 30,  // Seconds for news ticker in kiosk mode
  newsTickerScrollSpeedMobile: 20, // Seconds for news ticker in mobile mode
  nowPlayingScrollSpeedKiosk: 30,  // Seconds for now playing banner in kiosk mode
  nowPlayingScrollSpeedMobile: 20, // Seconds for now playing banner in mobile mode

  // Mobile UI Controls
  showNowPlayingOnMobile: false,   // Show "Now Playing" banner on mobile devices (disabled by default for performance)
  showNavMenuOnMobile: false,      // Show navigation menu (Games/Jukebox/Order) on mobile devices (disabled by default for performance)

  // Widget Controls
  voiceAssistantEnabled: false,    // Enable voice assistant (disabled by default for performance)
  showWeatherWidget: false,        // Show weather widget with hot dog recommendations (disabled by default for performance)
  weatherLocation: 'Chicago, IL',  // Display name for weather location
  weatherLat: 41.8781,             // Latitude for weather data
  weatherLng: -87.6298,            // Longitude for weather data
  weatherTimezone: 'America/Chicago', // Timezone for weather data
  qrCodeEnabled: false,            // Show QR code widget for mobile continuation (kiosk only) (disabled by default for performance)

  // Walkup Attractor Configuration
  walkupAttractorEnabled: true,    // Enable walkup greeting screen after idle timeout
  walkupAttractorVoiceEnabled: true, // Enable voice prompts (requires voiceAssistantEnabled)
  walkupAttractorPrompts: [
    { emoji: '📍', text: 'Drop a Pin on Chicago', subtext: 'Tap to place your pin on the map', voiceText: 'Drop a pin on Chicago' }
  ],      // Custom prompts (falls back to default context-aware prompts)
  walkupAttractorRotationSeconds: 4, // Seconds between prompt rotation
  simulationMode: false,           // Enable simulation mode for browser demos (forces attractor to show)

  // Proximity Detection (Camera-based approach detection)
  proximityDetectionEnabled: true, // Enable camera-based proximity detection
  proximitySensitivity: 15,        // Motion sensitivity threshold (0-100, lower = more sensitive)
  proximityThreshold: 30,          // Distance threshold to trigger walkup greeting (0-100, higher = closer)
  proximityDetectionInterval: 500, // How often to check for motion (ms)
  proximityTriggerVoice: true,     // Trigger voice greeting when person approaches

  // Ambient Music Auto-Play (triggered at longer range than walkup greeting)
  ambientMusicEnabled: true,      // Enable ambient music when people detected in area
  ambientMusicThreshold: 25,       // Distance threshold for ambient music (lower = farther range, should be < proximityThreshold)
  ambientMusicPlaylist: [
    { name: 'Sample', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
  ],        // Array of {name, url} for ambient playlist
  ambientMusicVolume: 0.5,         // Volume for ambient music (0.0 - 1.0)
  ambientMusicFadeIn: true,        // Fade in music gradually
  ambientMusicFadeOut: true,       // Fade out when no motion detected
  ambientMusicIdleTimeout: 30,     // Seconds of no motion before fading out music

  // UI Layout Positions (drag-and-drop customization)
  uiPositions: {
    desktop: {
      // Default positions - overridden by admin layout editor
    },
    mobile: {
      // Default positions - overridden by admin layout editor
    },
  },
  layoutEditorEnabled: false, // Enable drag-and-drop layout editor in admin panel

  // Audio Output Settings
  audioOutputType: 'local', // 'local' | 'bluetooth' | 'sonos'
  bluetoothDeviceName: '',
  bluetoothDeviceId: '',
  sonosRoomName: '',
  sonosIpAddress: '',
  jukeboxAutoPlay: false, // If true, play immediately; if false, add to queue

  // Restaurant Info (for share modal)
  restaurantName: 'Chicago Mike\'s',
  restaurantYelpUrl: '',
  restaurantGoogleUrl: '',
  restaurantWebsiteUrl: '',

  // Map constants (rarely changed)
  initialRadiusMiles: 0.5,
  chiMinZoom: 10,

  // Business Hours
  businessHoursEnabled: false,               // Enable business hours restrictions
  businessHoursOpen: '09:00',                // Opening time (24-hour format HH:MM)
  businessHoursClose: '21:00',               // Closing time (24-hour format HH:MM)
  businessHoursDays: [1, 2, 3, 4, 5],       // Days open (0=Sun, 1=Mon, ..., 6=Sat)
  businessHoursClosedMessage: "We're currently closed. Please come back during business hours!",
  businessHoursSleepAction: 'overlay',       // 'overlay' | 'dimScreen' | 'none'

  // Kiosk defaults (legacy)
  autoKiosk: false,
  showPopularSpotsDefault: true,
  showCommunityPinsDefault: true,

  // Content filters
  allowedTeams: ['cubs', 'whitesox', 'other'],
  allowedSources: ['kiosk', 'global'],

  // Popular spots seed (editable)
  popularSpots: [
    { name: 'Portillo\'s (Clark & Ontario)', type: 'hotdog', lat: 41.8922, lng: -87.6305 },
    { name: 'Gene & Jude\'s', type: 'hotdog', lat: 41.9099, lng: -87.8847 },
  ],

  // Layout Configuration - Scroll bars and banners positioning
  layoutConfig: {
    commentsBanner: {
      position: 'top',           // 'top' | 'bottom'
      order: 1,                  // Stacking order (lower number = closer to edge)
      estimatedHeight: 60,       // Estimated height in pixels for space calculation
    },
    newsTicker: {
      position: 'top',
      order: 2,
      estimatedHeight: 60,
    },
    demoBanner: {
      position: 'top',
      order: 3,
      estimatedHeight: 50,
    },
    downloadingBar: {
      position: 'bottom',
      order: 1,
      estimatedHeight: 50,
    },
    nowPlaying: {
      position: 'bottom',
      order: 2,
      estimatedHeight: 60,
    },
  },

  // Navigation & Feature Limits
  maxNavigationItems: 5,          // Maximum number of navigation items allowed (prevent UI crowding)

  // Map Tile Cache Management
  globalTileCacheExpirationDays: 30,  // Delete global map tiles older than this (0 = never delete)
  chicagoTileCacheExpirationDays: 0,   // Delete Chicago tiles older than this (0 = never delete, Chicago tiles kept indefinitely by default)

  // Installed Features (from Marketplace)
  // Features must be "installed" from marketplace before appearing in Features tab
  installedFeatures: [
    'games',           // Gaming suite (Deep Dish, Popcorn, Trivia, Hotdog)
    'jukebox',         // Music player with Spotify/local integration
    'ordering',        // Food ordering system
    'photoBooth',      // Photo capture with backgrounds
    'thenAndNow',      // Historical comparison photos
    'comments',        // Customer feedback/comments scrolling banner
    'recommendations', // Local recommendations/popular spots
  ],

  // ElevenLabs TTS Settings
  ttsProvider: 'elevenlabs',                  // 'browser' | 'elevenlabs'
  elevenlabsApiKey: '3dc920776d9f94425a7ac398c897e0ad1156e4683579c3fcd2625e8e95be3c61',
  elevenlabsVoiceId: 'pNInz6obpgDQGcFmaJgB',  // Adam - deep, natural male voice
  elevenlabsPhoneVoiceId: 'pNInz6obpgDQGcFmaJgB', // Same voice for phone calls
  elevenlabsModel: 'eleven_turbo_v2_5',       // Fast, high-quality model
  elevenlabsStability: 0.5,                   // Voice stability (0-1)
  elevenlabsSimilarity: 0.75,                 // Similarity boost (0-1)

  // Console Webhook - Remote Monitoring
  consoleWebhookUrl: 'https://webhook.site/243517d3-3f78-4e4b-9188-9504cb7b5b55', // Webhook URL for remote console monitoring
  consoleWebhookEnabled: false,              // Enable/disable webhook
  consoleWebhookLevels: ['log', 'error', 'warn', 'info'], // Log levels to capture
  consoleWebhookBatchDelayMs: 2000,          // Batch delay (ms)
  consoleWebhookMaxBatchSize: 50,            // Max events per batch
}

const LS_KEY = 'adminSettings_v1'

export function useAdminSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Priority: Local Storage (SQL/Preferences) → Supabase → defaults
  // Sync from Supabase every 5 minutes
  useEffect(() => {
    let mounted = true
    const storage = getPersistentStorage()

    const loadSettings = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1. PRIORITY: Load from local storage first (survives APK updates)
        const localSettings = await storage.get(LS_KEY)

        if (localSettings) {
          console.log('[useAdminSettings] Loaded from local storage (priority)')
          if (mounted) {
            setSettings({ ...DEFAULTS, ...localSettings })
          }
        } else {
          // 2. FALLBACK: Load from Supabase if no local settings
          console.log('[useAdminSettings] No local settings, loading from Supabase')
          const { data, error: supabaseError } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'app')
            .maybeSingle()

          if (!supabaseError && data?.value) {
            const supabaseSettings = { ...DEFAULTS, ...data.value }
            if (mounted) {
              setSettings(supabaseSettings)
              // Save to local storage for next time
              await storage.set(LS_KEY, supabaseSettings)
              console.log('[useAdminSettings] Saved Supabase settings to local storage')
            }
          }
        }
      } catch (e) {
        console.error('[useAdminSettings] Error loading settings:', e)
        setError(e?.message || 'Failed to load settings')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Initial load
    loadSettings()

    // Function to sync from Supabase
    const syncFromSupabase = async () => {
      try {
        console.log('[useAdminSettings] Syncing from Supabase...')
        const { data, error: supabaseError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'app')
          .maybeSingle()

        if (!supabaseError && data?.value && mounted) {
          const supabaseSettings = { ...DEFAULTS, ...data.value }
          // Update local storage with Supabase data
          await storage.set(LS_KEY, supabaseSettings)
          setSettings(supabaseSettings)
          console.log('[useAdminSettings] Synced from Supabase to local storage')
        }
      } catch (e) {
        console.error('[useAdminSettings] Sync error:', e)
      }
    }

    // Sync from Supabase every 5 minutes
    const syncInterval = setInterval(syncFromSupabase, 5 * 60 * 1000)

    // Listen for push notifications from admin panel
    const channel = supabase
      .channel('settings-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'settings_updates',
        },
        (payload) => {
          console.log('[useAdminSettings] Push notification received:', payload)
          if (payload.new?.trigger_reload) {
            console.log('[useAdminSettings] Reloading settings immediately...')
            syncFromSupabase()
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(syncInterval)
      channel.unsubscribe()
    }
  }, [])

  const save = useCallback(async (next) => {
    const storage = getPersistentStorage()
    setSaving(true)
    setError(null)
    const merged = { ...settings, ...next }
    setSettings(merged)
    // Always save to persistent storage as well
    try { await storage.set(LS_KEY, merged) } catch {}

    // Try Supabase upsert
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'app', value: merged }, { onConflict: 'key' })
      if (error) throw error
    } catch (e) {
      setError(e?.message || 'Failed to save settings (using persistent fallback).')
    } finally {
      setSaving(false)
    }
  }, [settings])

  return useMemo(() => ({
    settings, setSettings, save, loading, saving, error, DEFAULTS
  }), [settings, save, loading, saving, error])
}
