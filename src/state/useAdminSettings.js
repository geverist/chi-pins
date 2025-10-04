// src/state/useAdminSettings.js
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  attractorHintEnabled: true,

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

  // Security PINs
  adminPanelPin: '1111',      // 4-digit PIN for admin panel access
  kioskExitPin: '1111',       // 4-digit PIN for exiting kiosk mode

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
  showPinsSinceMonths: 24,
  showPopularSpots: true,
  showCommunityPins: true,
  enableGlobalBubbles: true,

  // Features
  loyaltyEnabled: true,
  vestaboardEnabled: false,
  facebookShareEnabled: false,
  photoBackgroundsEnabled: true,
  newsTickerEnabled: false,
  newsTickerRssUrl: 'https://news.google.com/rss/search?q=chicago&hl=en-US&gl=US&ceid=US:en',

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

  // Banner Scroll Speeds (seconds for full scroll)
  newsTickerScrollSpeedKiosk: 30,  // Seconds for news ticker in kiosk mode
  newsTickerScrollSpeedMobile: 20, // Seconds for news ticker in mobile mode
  nowPlayingScrollSpeedKiosk: 30,  // Seconds for now playing banner in kiosk mode
  nowPlayingScrollSpeedMobile: 20, // Seconds for now playing banner in mobile mode

  // Mobile UI Controls
  showNowPlayingOnMobile: true,    // Show "Now Playing" banner on mobile devices
  showNavMenuOnMobile: true,       // Show navigation menu (Games/Jukebox/Order) on mobile devices

  // Widget Controls
  showWeatherWidget: true,         // Show weather widget with hot dog recommendations
  weatherLocation: 'Chicago, IL',  // Display name for weather location
  weatherLat: 41.8781,             // Latitude for weather data
  weatherLng: -87.6298,            // Longitude for weather data
  weatherTimezone: 'America/Chicago', // Timezone for weather data

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
}

const LS_KEY = 'adminSettings_v1'

export function useAdminSettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Load from Supabase → fallback to LocalStorage → defaults
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'app')
          .maybeSingle()

        if (error) throw error
        if (mounted) {
          if (data?.value) {
            setSettings(s => ({ ...DEFAULTS, ...s, ...data.value }))
          } else {
            // Local fallback
            try {
              const raw = localStorage.getItem(LS_KEY)
              if (raw) setSettings(s => ({ ...DEFAULTS, ...s, ...JSON.parse(raw) }))
            } catch {}
          }
        }
      } catch (e) {
        // Fallback to LS if table missing / not provisioned
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (raw) setSettings(s => ({ ...DEFAULTS, ...s, ...JSON.parse(raw) }))
        } catch {}
        setError(e?.message || 'Failed to load settings')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const save = useCallback(async (next) => {
    setSaving(true)
    setError(null)
    const merged = { ...settings, ...next }
    setSettings(merged)
    // Always save to LocalStorage as well
    try { localStorage.setItem(LS_KEY, JSON.stringify(merged)) } catch {}

    // Try Supabase upsert
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'app', value: merged }, { onConflict: 'key' })
      if (error) throw error
    } catch (e) {
      setError(e?.message || 'Failed to save settings (using local fallback).')
    } finally {
      setSaving(false)
    }
  }, [settings])

  return useMemo(() => ({
    settings, setSettings, save, loading, saving, error, DEFAULTS
  }), [settings, save, loading, saving, error])
}
