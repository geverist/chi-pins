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

  // Audio Output Settings
  audioOutputType: 'local', // 'local' | 'bluetooth' | 'sonos'
  bluetoothDeviceName: '',
  bluetoothDeviceId: '',
  sonosRoomName: '',
  sonosIpAddress: '',

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
