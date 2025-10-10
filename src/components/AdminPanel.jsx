// src/components/AdminPanel.jsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBackgroundImages } from '../hooks/useBackgroundImages'
import { useNavigationSettings } from '../hooks/useNavigationSettings'
import { useLogo } from '../hooks/useLogo'
import { useAdminSettings } from '../state/useAdminSettings'
import { useMediaFiles } from '../hooks/useMediaFiles'
import { useThenAndNow } from '../hooks/useThenAndNow'
import { useNowPlaying } from '../state/useNowPlaying'
import PinCodeModal from './PinCodeModal'
import AnalyticsDashboard from './AnalyticsDashboard'
import VoiceAgentTab from './VoiceAgentTab'
import KioskVoiceTab from './KioskVoiceTab'
import MarketplaceAdmin from './MarketplaceAdmin'
import MarketplaceTab from './MarketplaceTab'
import ContentLayoutTab from './ContentLayoutTab'
import PerformanceTab from './PerformanceTab'
import VestaboardTab from './VestaboardTab'
import PreviewBanner from './PreviewBanner'
import { ProximityMonitor } from './ProximityMonitor'
import { auditDatabase, autoFixDatabase, syncMissingData } from '../lib/databaseAudit'
import { getOfflineTileStorage } from '../lib/offlineTileStorage'
import { getSpotifyClient } from '../lib/spotifyClient'
import { sendTestEvent, getWebhookStatus } from '../lib/consoleWebhook'

export default function AdminPanel({ open, onClose, isLayoutEditMode, setLayoutEditMode, proximityDetection }) {
  const [authenticated, setAuthenticated] = useState(true) // Skip PIN for now - keyboard dismissal issue
  const [tab, setTab] = useState('kiosk') // Default to new 'kiosk' tab
  const [systemSubtab, setSystemSubtab] = useState('database') // Subtabs for System tab
  const [toast, setToast] = useState(null) // Toast for webhook test feedback

  // Reset authentication and initial states when panel closes
  useEffect(() => {
    if (!open) {
      setAuthenticated(true) // Skip PIN for now - keyboard dismissal issue
      setInitialSettings(null)
      setInitialPopularSpots(null)
      setInitialNavSettings(null)
      setHasUnsavedChanges(false)
    }
  }, [open])

  // Admin settings hook (needed for idle timeout setting)
  const { settings: adminSettingsFromHook, save: saveAdminSettings, DEFAULTS } = useAdminSettings()

  // Idle timer for admin panel auto-close
  useEffect(() => {
    if (!open) return

    let idleTimer
    let hasHadInteraction = false

    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      hasHadInteraction = true
      const timeoutSeconds = adminSettingsFromHook?.adminPanelIdleTimeout || 60
      idleTimer = setTimeout(() => {
        console.log('[AdminPanel] Idle timeout - closing admin panel')
        onClose()
      }, timeoutSeconds * 1000)
    }

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true })
    })

    // Don't start timer until first interaction - prevents immediate dismissal
    // Timer will start on first touch/click inside the panel

    return () => {
      clearTimeout(idleTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer)
      })
    }
  }, [open, onClose, adminSettingsFromHook?.adminPanelIdleTimeout])

  // Background images hook
  const { backgrounds, loading: bgLoading, addBackground, deleteBackground } = useBackgroundImages()

  // Media files hook
  const { mediaFiles, loading: mediaLoading, uploading: mediaUploading, uploadMediaFile, deleteMediaFile, updateMediaFile } = useMediaFiles()

  // Then & Now hook
  const {
    comparisons: thenAndNowComparisonsFromHook,
    loading: thenAndNowLoadingFromHook,
    addComparison,
    uploadImage: uploadThenNowImage,
    deleteComparison,
    updateComparison
  } = useThenAndNow()

  // Now Playing hook
  const { stopAll, currentTrack, queue } = useNowPlaying()

  // Navigation settings hook
  const { settings: navSettingsFromHook, updateSettings: updateNavSettingsAPI, loading: navLoading } = useNavigationSettings()

  // Local navigation settings state (synced with hook but saved on "Save & Close")
  const [navSettings, setNavSettings] = useState(navSettingsFromHook)

  // Sync with hook when it loads
  useEffect(() => {
    console.log('[AdminPanel] navSettingsFromHook updated:', navSettingsFromHook);
    setNavSettings(navSettingsFromHook)
  }, [navSettingsFromHook])

  // Logo hook
  const { logoUrl, loading: logoLoading, uploadLogo, deleteLogo } = useLogo()

  // ---------- State ----------
  const [settings, setSettings] = useState(adminSettingsFromHook)

  // Sync settings with hook when it changes
  useEffect(() => {
    setSettings(adminSettingsFromHook)
  }, [adminSettingsFromHook])

  const [popularSpots, setPopularSpots] = useState(() => {
    try {
      const raw = localStorage.getItem('adminPopularSpots')
      return raw ? JSON.parse(raw) : [
        {
          label: 'Cloud Gate (The Bean)',
          category: 'attraction',
          description: 'Designed by artist Anish Kapoor and completed in 2006, this 110-ton stainless steel sculpture in Millennium Park reflects the city skyline. Made of 168 seamlessly welded plates, it cost $23 million and is power-washed daily!'
        },
        {
          label: 'Willis Tower',
          category: 'attraction',
          description: 'Opened in 1973 as Sears Tower, this 110-story, 1,451-foot skyscraper was the world\'s tallest building for 25 years. The Skydeck\'s glass Ledge extends 4.3 feet out from the 103rd floor - on a clear day, you can see four states!'
        },
        {
          label: 'Navy Pier',
          category: 'attraction',
          description: 'Built in 1916 as Municipal Pier, this lakefront landmark features the 196-foot Centennial Wheel (added in 2016 for the pier\'s 100th anniversary) with climate-controlled gondolas. It\'s Chicago\'s #1 tourist destination!'
        },
        {
          label: 'Wrigley Field',
          category: 'attraction',
          description: 'Built in 1914, it\'s the second-oldest ballpark in the majors. The iconic ivy covering the outfield walls was planted in 1937 by Bill Veeck. It\'s been home to the Chicago Cubs for over 100 years!'
        },
        {
          label: 'Art Institute of Chicago',
          category: 'attraction',
          description: 'Founded in 1879 and moved to its current home in 1893 after the World\'s Fair. The bronze lions guarding the entrance were sculpted by Edward Kemeys in 1894 and each weighs over 2 tons!'
        },
        {
          label: 'Portillo\'s - River North',
          category: 'hotdog',
          description: 'Founded by Dick Portillo in 1963 in a trailer with no restroom or running water! Now famous for Chicago-style hot dogs, Italian beef, and chocolate cake shakes. Still serves Vienna Beef products.'
        },
        {
          label: 'Lou Malnati\'s Pizzeria',
          category: 'pizza',
          description: 'Opened March 17, 1971 by Lou Malnati (whose father helped develop Chicago deep dish in the 1940s). Still family-owned and ranked America\'s top pizza chain by Yelp in 2025!'
        },
        {
          label: 'Giordano\'s Pizza',
          category: 'pizza',
          description: 'Founded in 1974 by brothers Efren and Joseph Boglio, who brought their mother\'s Italian Easter Pie recipe from Torino, Italy. Their stuffed pizza has an extra crust layer - that\'s what makes it different!'
        },
        {
          label: 'Al\'s #1 Italian Beef',
          category: 'beef',
          description: 'The original Al\'s has been serving authentic Chicago Italian beef since 1938, using the secret recipe passed down through generations. A Chicago tradition for over 85 years!'
        },
      ]
    } catch { return [] }
  })

  // Track initial state to detect changes
  const [initialSettings, setInitialSettings] = useState(null)
  const [initialPopularSpots, setInitialPopularSpots] = useState(null)
  const [initialNavSettings, setInitialNavSettings] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewSettings, setPreviewSettings] = useState(null)
  const [previewPopularSpots, setPreviewPopularSpots] = useState(null)
  const [previewNavSettings, setPreviewNavSettings] = useState(null)

  // Moderation – selected IDs for deletion
  const [pendingDeletes, setPendingDeletes] = useState(new Set())
  const [modLoading, setModLoading] = useState(false)
  const [modRows, setModRows] = useState([]) // live pins from supabase
  const [search, setSearch] = useState('')

  // Database audit state
  const [dbAudit, setDbAudit] = useState(null)
  const [dbAuditLoading, setDbAuditLoading] = useState(false)
  const [dbAutoFixing, setDbAutoFixing] = useState(false)
  const [dbAutoFixResult, setDbAutoFixResult] = useState(null)

  // Tile cache state
  const [tileStorage] = useState(() => getOfflineTileStorage())
  const [tileStats, setTileStats] = useState(null)
  const [tileStatsLoading, setTileStatsLoading] = useState(false)
  const [chicagoDownloadProgress, setChicagoDownloadProgress] = useState(null)
  const [globalDownloadProgress, setGlobalDownloadProgress] = useState(null)
  const [metroDownloadProgress, setMetroDownloadProgress] = useState(null)
  const [chicagoDownloading, setChicagoDownloading] = useState(false)
  const [globalDownloading, setGlobalDownloading] = useState(false)
  const [metroDownloading, setMetroDownloading] = useState(false)

  // Then & Now comparisons
  // Use hook data directly
  const thenAndNowComparisons = thenAndNowComparisonsFromHook
  const thenAndNowLoading = thenAndNowLoadingFromHook

  // Kiosk clusters
  const [kioskClusters, setKioskClusters] = useState([])
  const [kioskClustersLoading, setKioskClustersLoading] = useState(false)

  // ---------- Load from Supabase when panel opens ----------
  const loadFromSupabase = useCallback(async () => {
    if (!open) return
    try {
      // Settings are loaded by useAdminSettings hook, just set initial state
      setInitialSettings(adminSettingsFromHook)

      // POPULAR SPOTS: table "popular_spots" with columns {id, label, category, description}
      const { data: pData, error: pErr} = await supabase
        .from('popular_spots')
        .select('id,label,category,description')
        .order('id', { ascending: true })

      if (!pErr && Array.isArray(pData)) {
        const rows = pData.map(({ id, label, category, description }) => ({ id, label, category, description: description || '' }))
        setPopularSpots(rows)
        setInitialPopularSpots(rows)
        localStorage.setItem('adminPopularSpots', JSON.stringify(rows))
      } else {
        setInitialPopularSpots(popularSpots)
      }

      // Initialize navigation settings tracking (only if loaded)
      if (!navLoading && !initialNavSettings) {
        console.log('[AdminPanel] Setting initial nav settings:', navSettings);
        setInitialNavSettings(navSettings)
      }

      // Kiosk clusters with locations
      const { data: clustersData, error: clustersErr } = await supabase
        .from('kiosk_clusters')
        .select(`
          *,
          locations:kiosk_locations(*)
        `)
        .order('name', { ascending: true })

      if (!clustersErr && Array.isArray(clustersData)) {
        setKioskClusters(clustersData)
      }

      setHasUnsavedChanges(false)
    } catch {
      // ignore – fallback to localStorage is already set
      setInitialSettings(adminSettingsFromHook)
      setInitialPopularSpots(popularSpots)
      if (!navLoading && !initialNavSettings) {
        setInitialNavSettings(navSettings)
      }
    }
  }, [open, adminSettingsFromHook, navLoading])

  useEffect(() => { if (open) loadFromSupabase() }, [open, loadFromSupabase])

  // Detect changes
  useEffect(() => {
    if (!initialSettings || !initialPopularSpots || !initialNavSettings) return

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings)
    const spotsChanged = JSON.stringify(popularSpots) !== JSON.stringify(initialPopularSpots)
    const navChanged = JSON.stringify(navSettings) !== JSON.stringify(initialNavSettings)

    setHasUnsavedChanges(settingsChanged || spotsChanged || navChanged)
  }, [settings, popularSpots, navSettings, initialSettings, initialPopularSpots, initialNavSettings])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // ---------- Performance Defaults ----------
  const applyPerformanceDefaults = useCallback(async () => {
    if (!confirm('Apply performance-optimized defaults? This will disable all navigation items and heavy features, but keep text overlays enabled.')) {
      return
    }

    const performanceSettings = {
      // Disable heavy features
      voiceAssistantEnabled: false,
      attractorHintEnabled: true, // Keep text overlays enabled for kiosk mode
      showPopularSpots: false,
      showWeatherWidget: false,
      commentsBannerEnabled: false,
      showNowPlayingOnMobile: false,
      showNavMenuOnMobile: false,
      showOfflineMapDownloader: false,
      enableGlobalBubbles: false,
      loyaltyEnabled: false,
      newsTickerEnabled: false,

      // Optimize settings
      showPinsSinceMonths: 6,
    }

    // Disable all navigation items except explore
    const performanceNavSettings = {
      explore_enabled: true, // Keep explore enabled
      games_enabled: false,
      jukebox_enabled: false,
      order_enabled: false,
      photobooth_enabled: false,
      thenandnow_enabled: false,
      comments_enabled: false,
      recommendations_enabled: false,
      default_navigation_app: 'map', // Keep default navigation app
    }

    // Update state
    const updatedSettings = { ...settings, ...performanceSettings }
    const updatedNavSettings = { ...navSettings, ...performanceNavSettings }

    setSettings(updatedSettings)
    setNavSettings(updatedNavSettings)

    // Save immediately
    try {
      console.log('[AdminPanel] Saving admin settings...', updatedSettings)
      await saveAdminSettings(updatedSettings)
      console.log('[AdminPanel] Admin settings saved successfully')

      console.log('[AdminPanel] Saving navigation settings...', updatedNavSettings)
      await updateNavSettingsAPI(updatedNavSettings)
      console.log('[AdminPanel] Navigation settings saved successfully')

      console.log('[AdminPanel] Performance mode saved successfully - use Reload App button to apply')

      // Don't auto-reload - let user click Reload App button
      alert('Performance mode settings saved! Click "Reload App" to apply changes.')
    } catch (error) {
      console.error('[AdminPanel] Failed to save performance mode:', error)
      alert(`Failed to save performance settings: ${error.message}. Please check the console for details.`)
    }
  }, [settings, navSettings, saveAdminSettings, updateNavSettingsAPI])

  // ---------- Persist helpers ----------
  const saveSupabase = useCallback(async () => {
    console.log('[AdminPanel] ========== SAVE PROCESS START ==========')

    // PRIORITY 1: Save to local storage first (always succeeds, offline-first)
    try {
      console.log('[AdminPanel] Step 1: Saving to LOCAL storage (priority)...')

      // Save admin settings to local storage via hook (which saves to Capacitor Preferences)
      await saveAdminSettings(settings)
      console.log('[AdminPanel] ✓ Admin settings saved to local storage')

      // Save popular spots to localStorage
      localStorage.setItem('adminPopularSpots', JSON.stringify(popularSpots))
      console.log('[AdminPanel] ✓ Popular spots saved to localStorage')

      // Save navigation settings locally
      const completeNavSettings = {
        games_enabled: Boolean(navSettings.games_enabled),
        jukebox_enabled: Boolean(navSettings.jukebox_enabled),
        order_enabled: Boolean(navSettings.order_enabled),
        explore_enabled: Boolean(navSettings.explore_enabled),
        photobooth_enabled: Boolean(navSettings.photobooth_enabled),
        thenandnow_enabled: Boolean(navSettings.thenandnow_enabled),
        comments_enabled: Boolean(navSettings.comments_enabled),
        recommendations_enabled: Boolean(navSettings.recommendations_enabled || false),
        default_navigation_app: navSettings.default_navigation_app || 'map',
      }
      await updateNavSettingsAPI(completeNavSettings)
      console.log('[AdminPanel] ✓ Navigation settings saved to local storage')

    } catch (localErr) {
      console.error('[AdminPanel] ✗ LOCAL SAVE FAILED (critical):', localErr)
      return false
    }

    // PRIORITY 2: Sync to Supabase (best effort, can fail gracefully)
    try {
      console.log('[AdminPanel] Step 2: Syncing to Supabase (background)...')

      // Sync popular_spots to Supabase
      console.log('[AdminPanel] Deleting old popular spots from Supabase...')
      const { error: delErr } = await supabase.from('popular_spots').delete().neq('id', -1)
      if (delErr) {
        console.warn('[AdminPanel] Supabase delete warning:', delErr)
        // Don't fail - local save succeeded
      }

      if (popularSpots.length) {
        console.log('[AdminPanel] Inserting new popular spots to Supabase...', popularSpots.length)
        const payload = popularSpots.map((r) => ({
          label: r.label || '',
          category: r.category || 'other',
          description: r.description || '',
        }))
        const { error: insErr } = await supabase.from('popular_spots').insert(payload)
        if (insErr) {
          console.warn('[AdminPanel] Supabase insert warning:', insErr)
          // Don't fail - local save succeeded
        }
      }

      console.log('[AdminPanel] ✓ Supabase sync complete')
    } catch (supabaseErr) {
      console.warn('[AdminPanel] Supabase sync failed (non-critical):', supabaseErr)
      // Don't return false - local save succeeded
    }

    console.log('[AdminPanel] ========== SAVE PROCESS SUCCESS (local + cloud sync) ==========')
    return true
  }, [settings, popularSpots, navSettings, saveAdminSettings, updateNavSettingsAPI])

  const pushToKiosk = async () => {
    try {
      // Trigger push notification to all connected kiosks
      const { error } = await supabase
        .from('settings_updates')
        .insert({
          updated_by: 'admin',
          trigger_reload: true
        })

      if (error) {
        // Table might not exist yet - that's ok, just log it
        console.warn('[AdminPanel] Push to kiosk skipped (settings_updates table not found):', error.message)
        return
      }

      console.log('[AdminPanel] Push notification sent to kiosks')
    } catch (err) {
      // Don't block save if push fails
      console.warn('[AdminPanel] Push to kiosk failed (non-critical):', err)
    }
  }

  const saveAndClose = async () => {
    console.log('[AdminPanel] ========== SAVE AND CLOSE CLICKED ==========')

    // Validate PINs before saving
    const adminPin = String(settings.adminPanelPin || '1111').replace(/\D/g, '').slice(0, 4)
    const kioskPin = String(settings.kioskExitPin || '1111').replace(/\D/g, '').slice(0, 4)

    console.log('[AdminPanel] Validating PINs...', { adminPin, kioskPin })

    if (adminPin.length !== 4 || kioskPin.length !== 4) {
      console.error('[AdminPanel] PIN validation failed')
      alert('PINs must be exactly 4 digits')
      return
    }

    // Ensure PINs are saved as 4-digit strings
    const validatedSettings = {
      ...settings,
      adminPanelPin: adminPin.padStart(4, '0'),
      kioskExitPin: kioskPin.padStart(4, '0'),
    }

    console.log('[AdminPanel] PINs validated, updating settings state...')
    setSettings(validatedSettings)

    console.log('[AdminPanel] Calling saveSupabase()...')
    const saved = await saveSupabase()
    console.log('[AdminPanel] saveSupabase() returned:', saved)

    if (saved) {
      console.log('[AdminPanel] Save successful, updating state...')
      setInitialSettings(validatedSettings)
      setInitialPopularSpots(popularSpots)
      setInitialNavSettings(navSettings)
      setHasUnsavedChanges(false)

      // Trigger push notification to kiosks
      console.log('[AdminPanel] Triggering push to kiosk...')
      await pushToKiosk()

      // Reload the webview to apply changes
      console.log('[AdminPanel] Reloading app in 500ms...')
      setTimeout(() => {
        window.location.href = window.location.origin
      }, 500)
    } else {
      console.error('[AdminPanel] Save failed!')
      alert('Failed to save settings. Please check the console for details.')
    }
  }

  // Preview mode handlers
  const handlePreviewChanges = () => {
    console.log('[AdminPanel] Entering preview mode')

    // Store current state as preview
    setPreviewSettings({ ...settings })
    setPreviewPopularSpots([...popularSpots])
    setPreviewNavSettings({ ...navSettings })

    // Enter preview mode
    setIsPreviewMode(true)
  }

  const handleCommitChanges = async () => {
    console.log('[AdminPanel] Committing preview changes')

    // Exit preview mode and save
    setIsPreviewMode(false)
    setPreviewSettings(null)
    setPreviewPopularSpots(null)
    setPreviewNavSettings(null)

    // Save changes permanently
    await saveAndClose()
  }

  const handleDiscardChanges = () => {
    console.log('[AdminPanel] Discarding preview changes')

    // Restore to saved state
    if (initialSettings) setSettings(initialSettings)
    if (initialPopularSpots) setPopularSpots(initialPopularSpots)
    if (initialNavSettings) setNavSettings(initialNavSettings)

    // Exit preview mode
    setIsPreviewMode(false)
    setPreviewSettings(null)
    setPreviewPopularSpots(null)
    setPreviewNavSettings(null)
    setHasUnsavedChanges(false)
  }

  // Popular spots CRUD
  const addSpot = () => setPopularSpots((s) => [...s, { label: '', category: 'hotdog', description: '' }])
  const updateSpot = (idx, patch) =>
    setPopularSpots((s) => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  const removeSpot = (idx) => setPopularSpots((s) => s.filter((_, i) => i !== idx))

  // ---------- Moderation: load live pins ----------
  const refreshModeration = useCallback(async () => {
    setModLoading(true)
    try {
      const months = Number(settings.showPinsSinceMonths || 24)
      const since = new Date()
      since.setMonth(since.getMonth() - months)
      let q = supabase
        .from('pins')
        .select('id,slug,note,created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (search && search.trim()) {
        const sTerm = `%${search.trim()}%`
        q = q.or(`slug.ilike.${sTerm},note.ilike.${sTerm}`)
      }

      const { data, error } = await q
      if (!error && Array.isArray(data)) {
        setModRows(data)
      }
    } catch {
      // ignore; keep whatever was shown
    } finally {
      setModLoading(false)
    }
  }, [settings.showPinsSinceMonths, search])

  useEffect(() => { if (open && tab === 'moderate') refreshModeration() }, [open, tab, refreshModeration])

  const togglePendingDelete = (id) => {
    setPendingDeletes((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deleteSelected = async () => {
    if (!pendingDeletes.size) return
    try {
      const ids = Array.from(pendingDeletes)
      const { error } = await supabase.from('pins').delete().in('id', ids)
      if (error) throw error
      setPendingDeletes(new Set())
      await refreshModeration()
      alert('Deleted selected pins.')
    } catch (e) {
      alert('Failed to delete selected pins. Check console for details.')
      console.warn(e)
    }
  }

  // ---------- Database Audit Functions ----------
  const runDatabaseAudit = async () => {
    setDbAuditLoading(true)
    setDbAutoFixResult(null)
    try {
      const audit = await auditDatabase()
      setDbAudit(audit)
      console.log('[AdminPanel] Database audit complete:', audit)
    } catch (err) {
      console.error('[AdminPanel] Database audit failed:', err)
      alert(`Database audit failed: ${err.message}`)
    } finally {
      setDbAuditLoading(false)
    }
  }

  const runAutoFix = async () => {
    if (!confirm('This will automatically fix schema issues and sync missing data. Continue?')) {
      return
    }

    setDbAutoFixing(true)
    try {
      const result = await autoFixDatabase()
      setDbAutoFixResult(result)
      setDbAudit(result.afterAudit)
      console.log('[AdminPanel] Auto-fix complete:', result)
      alert(`Auto-fix complete! Applied ${result.schemaFixes?.appliedFixes?.length || 0} schema fixes.`)
    } catch (err) {
      console.error('[AdminPanel] Auto-fix failed:', err)
      alert(`Auto-fix failed: ${err.message}`)
    } finally {
      setDbAutoFixing(false)
    }
  }

  const syncTableData = async (tableName) => {
    try {
      const result = await syncMissingData(tableName, 1000)
      console.log(`[AdminPanel] Synced ${tableName}:`, result)
      alert(`Synced ${result.synced || 0} records to ${tableName}`)
      // Re-audit to see updated status
      await runDatabaseAudit()
    } catch (err) {
      console.error(`[AdminPanel] Sync ${tableName} failed:`, err)
      alert(`Sync failed: ${err.message}`)
    }
  }

  // ---------- Tile Cache Functions ----------
  const loadTileStats = async () => {
    setTileStatsLoading(true)
    try {
      await tileStorage.init()
      const stats = await tileStorage.getStats()

      // Check download completion status
      const [chicagoStatus, globalStatus, metroStatus] = await Promise.all([
        tileStorage.isChicagoDownloadComplete(),
        tileStorage.isGlobalDownloadComplete(),
        tileStorage.isMetroDownloadComplete(),
      ])

      setTileStats({
        ...stats,
        chicago: chicagoStatus,
        global: globalStatus,
        metro: metroStatus,
      })
    } catch (err) {
      console.error('[AdminPanel] Failed to load tile stats:', err)
    } finally {
      setTileStatsLoading(false)
    }
  }

  const downloadChicagoTiles = async () => {
    setChicagoDownloading(true)
    setChicagoDownloadProgress({ completed: 0, total: 0, cached: 0, failed: 0, skipped: 0 })

    try {
      await tileStorage.downloadChicagoTiles({
        onProgress: (completed, total, { cached, failed, skipped }) => {
          setChicagoDownloadProgress({ completed, total, cached, failed, skipped })
        },
        onComplete: (stats) => {
          console.log('[AdminPanel] Chicago tiles download complete:', stats)
          alert(`Chicago tiles downloaded!\n${stats.cached} new, ${stats.skipped} already cached`)
          loadTileStats()
        },
      })
    } catch (err) {
      console.error('[AdminPanel] Chicago download failed:', err)
      alert(`Download failed: ${err.message}`)
    } finally {
      setChicagoDownloading(false)
    }
  }

  const downloadGlobalTiles = async () => {
    setGlobalDownloading(true)
    setGlobalDownloadProgress({ completed: 0, total: 0, cached: 0, failed: 0, skipped: 0 })

    try {
      await tileStorage.downloadGlobalTiles({
        onProgress: (completed, total, { cached, failed, skipped }) => {
          setGlobalDownloadProgress({ completed, total, cached, failed, skipped })
        },
        onComplete: (stats) => {
          console.log('[AdminPanel] Global tiles download complete:', stats)
          alert(`Global tiles downloaded!\n${stats.cached} new, ${stats.skipped} already cached`)
          loadTileStats()
        },
      })
    } catch (err) {
      console.error('[AdminPanel] Global download failed:', err)
      alert(`Download failed: ${err.message}`)
    } finally {
      setGlobalDownloading(false)
    }
  }

  const downloadMetroTiles = async () => {
    setMetroDownloading(true)
    setMetroDownloadProgress({ completed: 0, total: 0, cached: 0, failed: 0, skipped: 0 })

    try {
      await tileStorage.downloadMetroTiles({
        onProgress: (completed, total, { cached, failed, skipped }) => {
          setMetroDownloadProgress({ completed, total, cached, failed, skipped })
        },
        onComplete: (stats) => {
          console.log('[AdminPanel] Metro tiles download complete:', stats)
          alert(`Metro tiles downloaded!\n${stats.cached} new, ${stats.skipped} already cached, ${stats.cities} cities`)
          loadTileStats()
        },
      })
    } catch (err) {
      console.error('[AdminPanel] Metro download failed:', err)
      alert(`Download failed: ${err.message}`)
    } finally {
      setMetroDownloading(false)
    }
  }

  const clearTileCache = async () => {
    if (!confirm('This will delete all cached map tiles. They will need to be re-downloaded. Continue?')) {
      return
    }

    try {
      await tileStorage.clearAll()
      alert('Tile cache cleared successfully!')
      loadTileStats()
    } catch (err) {
      console.error('[AdminPanel] Failed to clear tile cache:', err)
      alert(`Failed to clear cache: ${err.message}`)
    }
  }

  if (!open) return null

  return (
    <>
      <PinCodeModal
        open={open && !authenticated}
        onSuccess={() => setAuthenticated(true)}
        onCancel={onClose}
        title="Admin Panel Access"
        expectedPin={adminSettingsFromHook.adminPanelPin}
      />

      {authenticated && (
        <div style={s.overlay}>
          <div style={s.backdrop} onClick={onClose} />

          {/* Preview mode banner */}
          {isPreviewMode && (
            <PreviewBanner
              onCommit={handleCommitChanges}
              onDiscard={handleDiscardChanges}
            />
          )}

          <div style={s.panel}>
        {/* Fixed header */}
        <div style={s.header}>
          <div style={s.titleWrap}>
            <span style={s.badge}>Admin</span>
            <h3 style={s.title}>Control Panel</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...btn.secondary, fontSize: 13, padding: '8px 12px' }}
              onClick={applyPerformanceDefaults}
              title="Apply optimized settings for better performance"
            >
              ⚡ Performance Mode
            </button>
            <button
              style={{ ...btn.secondary, fontSize: 13, padding: '8px 12px' }}
              onClick={() => {
                // Force hard reload with cache busting
                window.location.href = window.location.origin + '?reload=' + Date.now();
              }}
              title="Reload app to apply changes"
            >
              🔄 Reload App
            </button>
            <button
              style={{ ...btn.secondary, fontSize: 13, padding: '8px 12px' }}
              onClick={pushToKiosk}
              title="Push current Supabase settings to all kiosks immediately"
            >
              📤 Push to Kiosk
            </button>
            {!isPreviewMode && (
              <button
                style={{
                  ...btn.secondary,
                  opacity: hasUnsavedChanges ? 1 : 0.5,
                  borderColor: '#f59e0b',
                  color: hasUnsavedChanges ? '#f59e0b' : '#9ca3af'
                }}
                onClick={handlePreviewChanges}
                disabled={!hasUnsavedChanges}
                title={hasUnsavedChanges ? "Preview changes without saving" : "No changes to preview"}
              >
                👁️ Preview
              </button>
            )}
            {!isPreviewMode && (
              <button
                style={{ ...btn.primary, opacity: hasUnsavedChanges ? 1 : 0.5 }}
                onClick={saveAndClose}
                disabled={!hasUnsavedChanges}
                title={hasUnsavedChanges ? "Save changes and close" : "No changes to save"}
              >
                {hasUnsavedChanges ? '💾 Save & Close' : '✓ Saved'}
              </button>
            )}
            <button style={btn.ghost} onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Fixed tabs bar - 8 main tabs with subtabs for System */}
        <div style={s.tabs}>
          <TabBtn active={tab === 'kiosk'} onClick={() => setTab('kiosk')}>⚙️ Kiosk</TabBtn>
          <TabBtn active={tab === 'appearance'} onClick={() => setTab('appearance')}>🎨 Appearance</TabBtn>
          <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>📍 Content</TabBtn>
          <TabBtn active={tab === 'marketplace'} onClick={() => setTab('marketplace')}>🏪 Marketplace</TabBtn>
          <TabBtn active={tab === 'features'} onClick={() => setTab('features')}>🎮 Features</TabBtn>
          <TabBtn active={tab === 'media'} onClick={() => setTab('media')}>🔊 Media</TabBtn>
          <TabBtn active={tab === 'system'} onClick={() => setTab('system')}>🔧 System</TabBtn>
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')}>📊 Analytics</TabBtn>
        </div>

        {/* Subtabs for System tab */}
        {tab === 'system' && (
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid #2a2f37',
          }}>
            <button
              onClick={() => setSystemSubtab('database')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: systemSubtab === 'database' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: systemSubtab === 'database' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
                color: systemSubtab === 'database' ? '#60a5fa' : '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              💾 Database
            </button>
            <button
              onClick={() => setSystemSubtab('tiles')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: systemSubtab === 'tiles' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: systemSubtab === 'tiles' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
                color: systemSubtab === 'tiles' ? '#60a5fa' : '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🗺️ Tiles
            </button>
            <button
              onClick={() => setSystemSubtab('multiLocation')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: systemSubtab === 'multiLocation' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: systemSubtab === 'multiLocation' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
                color: systemSubtab === 'multiLocation' ? '#60a5fa' : '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🏢 Multi-Location
            </button>
            <button
              onClick={() => setSystemSubtab('webhook')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                background: systemSubtab === 'webhook' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: systemSubtab === 'webhook' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid #2a2f37',
                color: systemSubtab === 'webhook' ? '#60a5fa' : '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📡 Webhook
            </button>
          </div>
        )}

        {/* Scrollable body (consistent size across tabs) */}
        <div style={s.body}>
          {tab === 'kiosk' && (
            <SectionGrid>
              <Card title="Idle / Kiosk">
                <FieldRow label="Idle attractor (seconds)">
                  <NumberInput
                    value={settings.idleAttractorSeconds}
                    min={10}
                    max={600}
                    onChange={(v) => setSettings(s => ({ ...s, idleAttractorSeconds: v }))}
                  />
                </FieldRow>
                <FieldRow label="Auto-start kiosk on load">
                  <Toggle
                    checked={settings.kioskAutoStart}
                    onChange={(v) => setSettings(s => ({ ...s, kioskAutoStart: v }))}
                  />
                </FieldRow>
                <FieldRow label="Show 'pinch to zoom' hint">
                  <Toggle
                    checked={settings.attractorHintEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, attractorHintEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Enable confetti screensaver">
                  <Toggle
                    checked={settings.confettiScreensaverEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, confettiScreensaverEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Database sync interval (minutes)">
                  <NumberInput
                    value={settings.databaseSyncMinutes}
                    min={5}
                    max={1440}
                    onChange={(v) => setSettings(s => ({ ...s, databaseSyncMinutes: v }))}
                  />
                </FieldRow>
              </Card>

              <Card title="Business Hours">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Automatically show a "Closed" overlay outside business hours. Helps save battery and manage customer expectations.
                </p>
                <FieldRow label="Enable business hours">
                  <Toggle
                    checked={settings.businessHoursEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, businessHoursEnabled: v }))}
                  />
                </FieldRow>

                {settings.businessHoursEnabled && (
                  <>
                    <FieldRow label="Opening time">
                      <input
                        type="time"
                        value={settings.businessHoursOpen || '09:00'}
                        onChange={(e) => setSettings(s => ({ ...s, businessHoursOpen: e.target.value }))}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          color: 'white',
                          fontSize: 14,
                          width: '100%',
                        }}
                      />
                    </FieldRow>

                    <FieldRow label="Closing time">
                      <input
                        type="time"
                        value={settings.businessHoursClose || '21:00'}
                        onChange={(e) => setSettings(s => ({ ...s, businessHoursClose: e.target.value }))}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          color: 'white',
                          fontSize: 14,
                          width: '100%',
                        }}
                      />
                    </FieldRow>

                    <FieldRow label="Days open">
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                          const isSelected = (settings.businessHoursDays || [1, 2, 3, 4, 5]).includes(idx);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const current = settings.businessHoursDays || [1, 2, 3, 4, 5];
                                const updated = isSelected
                                  ? current.filter(d => d !== idx)
                                  : [...current, idx].sort();
                                setSettings(s => ({ ...s, businessHoursDays: updated }));
                              }}
                              style={{
                                padding: '8px 16px',
                                background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: 6,
                                color: 'white',
                                fontSize: 13,
                                fontWeight: isSelected ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </FieldRow>

                    <FieldRow label="Closed message">
                      <textarea
                        value={settings.businessHoursClosedMessage || "We're currently closed. Please come back during business hours!"}
                        onChange={(e) => setSettings(s => ({ ...s, businessHoursClosedMessage: e.target.value }))}
                        rows={3}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          color: 'white',
                          fontSize: 14,
                          width: '100%',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    </FieldRow>

                    <p style={{ ...s.muted, margin: '16px 0 0', fontSize: 11 }}>
                      💡 <strong>Hardware Wake-Up:</strong> This feature can't physically turn on a sleeping device.
                      For automatic screen on/off, use <strong>Fully Kiosk Browser</strong> which has built-in scheduling,
                      or enable "Stay Awake" in Android Developer Options.
                    </p>
                  </>
                )}
              </Card>

              <Card title="Feature Idle Timeouts">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Automatically close features after inactivity and return to map view
                </p>
                <FieldRow label="Games timeout (seconds)">
                  <NumberInput
                    value={settings.gamesIdleTimeout}
                    min={30}
                    max={600}
                    onChange={(v) => setSettings(s => ({ ...s, gamesIdleTimeout: v }))}
                  />
                </FieldRow>
                <FieldRow label="Jukebox timeout (seconds)">
                  <NumberInput
                    value={settings.jukeboxIdleTimeout}
                    min={30}
                    max={600}
                    onChange={(v) => setSettings(s => ({ ...s, jukeboxIdleTimeout: v }))}
                  />
                </FieldRow>
                <FieldRow label="Ordering timeout (seconds)">
                  <NumberInput
                    value={settings.orderingIdleTimeout}
                    min={60}
                    max={900}
                    onChange={(v) => setSettings(s => ({ ...s, orderingIdleTimeout: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Set to 0 to disable timeout for a feature
                </p>
              </Card>

              <Card title="Security PIN Codes">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Set 4-digit PIN codes for admin panel access and kiosk exit
                </p>
                <FieldRow label="Admin Panel PIN">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={settings.adminPanelPin || '1111'}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSettings(s => ({ ...s, adminPanelPin: value }));
                    }}
                    placeholder="1111"
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      background: '#0f1115',
                      border: '1px solid #2a2f37',
                      borderRadius: 6,
                      color: '#f3f5f7',
                      fontSize: 16,
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      textAlign: 'center',
                    }}
                  />
                </FieldRow>
                <FieldRow label="Kiosk Exit PIN">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={settings.kioskExitPin || '1111'}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setSettings(s => ({ ...s, kioskExitPin: value }));
                    }}
                    placeholder="1111"
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      background: '#0f1115',
                      border: '1px solid #2a2f37',
                      borderRadius: 6,
                      color: '#f3f5f7',
                      fontSize: 16,
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      textAlign: 'center',
                    }}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  ⚠️ Must be exactly 4 digits. Press 'k' 3x to trigger kiosk exit prompt.
                </p>

                <FieldRow label="Admin panel idle timeout (seconds)">
                  <input
                    type="number"
                    min={10}
                    max={600}
                    value={settings.adminPanelIdleTimeout || 60}
                    onChange={(e) => {
                      const value = Math.max(10, Math.min(600, parseInt(e.target.value) || 60));
                      setSettings(s => ({ ...s, adminPanelIdleTimeout: value }));
                    }}
                    style={{
                      width: 100,
                      padding: '8px 12px',
                      background: '#0f1115',
                      border: '1px solid #2a2f37',
                      borderRadius: 6,
                      color: '#f3f5f7',
                      fontSize: 16,
                    }}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Auto-closes admin panel after inactivity. Default: 60 seconds.
                </p>
              </Card>

              <Card title="Layout Edit Mode">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Reposition widgets (QR Code, Weather, Explore button) by dragging them to snap positions
                </p>
                <button
                  onClick={() => {
                    setLayoutEditMode(!isLayoutEditMode);
                    onClose(); // Close admin panel so user can see and edit the widgets
                  }}
                  style={{
                    padding: '12px 20px',
                    background: isLayoutEditMode ? '#f59e0b' : '#3b82f6',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {isLayoutEditMode ? '✅ Exit Layout Edit Mode' : '🎨 Enter Layout Edit Mode'}
                </button>

                {/* Grid Configuration */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <FieldRow label="Grid Layout Type">
                    <select
                      value={settings.layoutGridType || '2x3'}
                      onChange={(e) => setSettings(s => ({ ...s, layoutGridType: e.target.value }))}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 14,
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="2x2">2×2 Grid (4 Quadrants)</option>
                      <option value="2x3">2×3 Grid (6 Sections)</option>
                      <option value="3-2-3">3-2-3 Grid (8 Sections)</option>
                    </select>
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
                    {settings.layoutGridType === '2x2' && '4 equal quadrants'}
                    {settings.layoutGridType === '2x3' && '2 rows × 3 columns'}
                    {settings.layoutGridType === '3-2-3' && '3 left, 2 center, 3 right sections'}
                  </p>

                  <FieldRow label="Vertical Snap Increment (px)">
                    <NumberInput
                      value={settings.layoutVerticalIncrement || 10}
                      min={5}
                      max={50}
                      onChange={(v) => setSettings(s => ({ ...s, layoutVerticalIncrement: v }))}
                    />
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                    Widgets snap to this pixel increment when dragging vertically
                  </p>
                </div>

                <p style={{ ...s.muted, margin: '16px 0 0', fontSize: 11 }}>
                  • Drag widgets to grid cells, they snap automatically<br />
                  • Collision detection prevents overlapping widgets<br />
                  • Changes save automatically when you release
                </p>
              </Card>

              <Card title="Data window">
                <FieldRow label="Show pins from last (months)">
                  <NumberInput
                    value={settings.showPinsSinceMonths}
                    min={1}
                    max={999}
                    onChange={(v) => setSettings(s => ({ ...s, showPinsSinceMonths: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: 0, fontSize: 12 }}>
                  Set to 999 to show all pins regardless of age
                </p>
              </Card>

              <Card title="Features">
                <FieldRow label="Loyalty phone in editor">
                  <Toggle
                    checked={settings.loyaltyEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, loyaltyEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Photo backgrounds">
                  <Toggle
                    checked={settings.photoBackgroundsEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, photoBackgroundsEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Facebook share option">
                  <Toggle
                    checked={settings.facebookShareEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, facebookShareEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="News ticker">
                  <Toggle
                    checked={settings.newsTickerEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, newsTickerEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Fun facts on map click">
                  <Toggle
                    checked={settings.funFactsEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, funFactsEnabled: v }))}
                  />
                </FieldRow>
                <FieldRow label="Pin placement notifications">
                  <Toggle
                    checked={settings.notificationsEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, notificationsEnabled: v }))}
                  />
                </FieldRow>
              </Card>

              {settings.funFactsEnabled && (
                <Card title="Fun Facts Settings">
                  <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                    Configure how long fun facts display when clicking on the Chicago map
                  </p>
                  <FieldRow label="Display duration (seconds)">
                    <NumberInput
                      value={settings.funFactDurationSeconds}
                      min={5}
                      max={60}
                      step={5}
                      onChange={(v) => setSettings(s => ({ ...s, funFactDurationSeconds: v }))}
                    />
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                    Fun facts appear as a toast notification when users click on locations in Chicago
                  </p>
                </Card>
              )}


              {settings.newsTickerEnabled && (
                <Card title="News Ticker Settings">
                  <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                    Configure the RSS feed URL and scroll speeds for the news ticker
                  </p>
                  <FieldRow label="RSS Feed URL">
                    <input
                      type="url"
                      value={settings.newsTickerRssUrl || ''}
                      onChange={(e) => setSettings(s => ({ ...s, newsTickerRssUrl: e.target.value }))}
                      placeholder="https://news.google.com/rss/search?q=chicago"
                      style={{
                        ...s.input,
                        width: '100%',
                      }}
                    />
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '8px 0 0 0', fontSize: 11 }}>
                    Only Chicago news sources and major outlets are permitted
                  </p>

                  <FieldRow label="Scroll Speed (Kiosk)" style={{ marginTop: 16 }}>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.newsTickerScrollSpeedKiosk || 30}
                      onChange={(e) => setSettings(s => ({ ...s, newsTickerScrollSpeedKiosk: parseInt(e.target.value) || 30 }))}
                      style={{ ...s.input, width: '80px' }}
                    />
                    <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                  </FieldRow>

                  <FieldRow label="Scroll Speed (Mobile)">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={settings.newsTickerScrollSpeedMobile || 20}
                      onChange={(e) => setSettings(s => ({ ...s, newsTickerScrollSpeedMobile: parseInt(e.target.value) || 20 }))}
                      style={{ ...s.input, width: '80px' }}
                    />
                    <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                    Time for banner to complete one full scroll
                  </p>
                </Card>
              )}

              <FieldRow label="Enable Comments Banner">
                <Toggle
                  checked={settings.commentsBannerEnabled}
                  onChange={(v) => setSettings(s => ({ ...s, commentsBannerEnabled: v }))}
                />
              </FieldRow>

              {settings.commentsBannerEnabled && (
                <Card title="Comments Banner Settings">
                  <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                    Display random comments from pins in a scrolling banner. Configure moderation keywords.
                  </p>

                  <FieldRow label="Max Comments">
                    <input
                      type="number"
                      min="10"
                      max="50"
                      value={settings.commentsBannerMaxComments || 20}
                      onChange={(e) => setSettings(s => ({ ...s, commentsBannerMaxComments: parseInt(e.target.value) || 20 }))}
                      style={{ ...s.input, width: '80px' }}
                    />
                    <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>comments</span>
                  </FieldRow>

                  <FieldRow label="Scroll Speed">
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={settings.commentsBannerScrollSpeed || 60}
                      onChange={(e) => setSettings(s => ({ ...s, commentsBannerScrollSpeed: parseInt(e.target.value) || 60 }))}
                      style={{ ...s.input, width: '80px' }}
                    />
                    <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                  </FieldRow>

                  <FieldRow label="Refresh Interval">
                    <input
                      type="number"
                      min="30"
                      max="600"
                      value={Math.round((settings.commentsBannerRefreshInterval || 120000) / 1000)}
                      onChange={(e) => setSettings(s => ({ ...s, commentsBannerRefreshInterval: (parseInt(e.target.value) || 120) * 1000 }))}
                      style={{ ...s.input, width: '80px' }}
                    />
                    <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                  </FieldRow>

                  <FieldRow label="Prohibited Keywords" style={{ marginTop: 16, alignItems: 'flex-start' }}>
                    <textarea
                      value={(settings.commentsBannerProhibitedKeywords || []).join(', ')}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                        setSettings(s => ({ ...s, commentsBannerProhibitedKeywords: keywords }));
                      }}
                      placeholder="spam, inappropriate, offensive"
                      style={{
                        ...s.input,
                        width: '100%',
                        minHeight: '60px',
                        resize: 'vertical',
                      }}
                    />
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                    Comma-separated list. Comments containing these words will be filtered out.
                  </p>
                </Card>
              )}

              <Card title="Map constants">
                <FieldRow label="Initial radius (miles)">
                  <NumberInput
                    value={settings.initialRadiusMiles}
                    min={0.1}
                    max={10}
                    onChange={(v) => setSettings(s => ({ ...s, initialRadiusMiles: v }))}
                  />
                </FieldRow>
                <FieldRow label="Chicago min zoom">
                  <NumberInput
                    value={settings.chiMinZoom}
                    min={2}
                    max={15}
                    onChange={(v) => setSettings(s => ({ ...s, chiMinZoom: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: 0, fontSize: 12 }}>
                  Advanced: These control map behavior constants
                </p>
              </Card>
            </SectionGrid>
          )}

          {tab === 'games' && (
            <SectionGrid>
              <Card title="🎮 Deep Dish Toss">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Configure difficulty settings for the Deep Dish pizza catching game
                </p>
                <FieldRow label="Start speed">
                  <NumberInput
                    value={settings.deepDishStartSpeed}
                    min={1}
                    max={10}
                    step={0.5}
                    onChange={(v) => setSettings(s => ({ ...s, deepDishStartSpeed: v }))}
                  />
                </FieldRow>
                <FieldRow label="End speed (max)">
                  <NumberInput
                    value={settings.deepDishEndSpeed}
                    min={2}
                    max={15}
                    step={0.5}
                    onChange={(v) => setSettings(s => ({ ...s, deepDishEndSpeed: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Speed progressively increases from start to end during game
                </p>
              </Card>

              <Card title="🌬️ Windy City Popcorn Challenge">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Configure difficulty settings for the wind-dodging popcorn game
                </p>
                <FieldRow label="Starting popcorn pieces">
                  <NumberInput
                    value={settings.popcornStartingPieces}
                    min={5}
                    max={50}
                    step={1}
                    onChange={(v) => setSettings(s => ({ ...s, popcornStartingPieces: v }))}
                  />
                </FieldRow>
                <FieldRow label="Game duration (seconds)">
                  <NumberInput
                    value={settings.popcornGameDuration}
                    min={30}
                    max={180}
                    step={10}
                    onChange={(v) => setSettings(s => ({ ...s, popcornGameDuration: v }))}
                  />
                </FieldRow>
                <FieldRow label="Wind start interval (sec)">
                  <NumberInput
                    value={settings.popcornWindStartInterval}
                    min={2}
                    max={10}
                    step={0.5}
                    onChange={(v) => setSettings(s => ({ ...s, popcornWindStartInterval: v }))}
                  />
                </FieldRow>
                <FieldRow label="Wind min interval (sec)">
                  <NumberInput
                    value={settings.popcornWindMinInterval}
                    min={1}
                    max={5}
                    step={0.5}
                    onChange={(v) => setSettings(s => ({ ...s, popcornWindMinInterval: v }))}
                  />
                </FieldRow>
                <FieldRow label="Wind start speed">
                  <NumberInput
                    value={settings.popcornWindStartSpeed}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onChange={(v) => setSettings(s => ({ ...s, popcornWindStartSpeed: v }))}
                  />
                </FieldRow>
                <FieldRow label="Wind max speed">
                  <NumberInput
                    value={settings.popcornWindMaxSpeed}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(v) => setSettings(s => ({ ...s, popcornWindMaxSpeed: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Wind gust speed and frequency increase during the game
                </p>
              </Card>

              <Card title="🧠 Chicago Trivia Challenge">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Configure settings for the Chicago trivia quiz game
                </p>
                <FieldRow label="Time per question (seconds)">
                  <NumberInput
                    value={settings.triviaQuestionTimeLimit}
                    min={5}
                    max={30}
                    step={1}
                    onChange={(v) => setSettings(s => ({ ...s, triviaQuestionTimeLimit: v }))}
                  />
                </FieldRow>
                <FieldRow label="Total questions">
                  <NumberInput
                    value={settings.triviaTotalQuestions}
                    min={5}
                    max={20}
                    step={1}
                    onChange={(v) => setSettings(s => ({ ...s, triviaTotalQuestions: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Total game time = questions × time per question
                </p>
              </Card>

              <Card title="🌭 Hotdog Assembly Challenge">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Configure settings for the Chicago-style hot dog assembly game
                </p>
                <FieldRow label="Time limit (seconds)">
                  <NumberInput
                    value={settings.hotdogTimeLimit}
                    min={30}
                    max={180}
                    step={10}
                    onChange={(v) => setSettings(s => ({ ...s, hotdogTimeLimit: v }))}
                  />
                </FieldRow>
                <FieldRow label="Perfect order bonus">
                  <NumberInput
                    value={settings.hotdogPerfectOrderBonus}
                    min={0}
                    max={5000}
                    step={100}
                    onChange={(v) => setSettings(s => ({ ...s, hotdogPerfectOrderBonus: v }))}
                  />
                </FieldRow>
                <FieldRow label="Ketchup penalty">
                  <NumberInput
                    value={settings.hotdogKetchupPenalty}
                    min={-2000}
                    max={0}
                    step={100}
                    onChange={(v) => setSettings(s => ({ ...s, hotdogKetchupPenalty: v }))}
                  />
                </FieldRow>
                <FieldRow label="Ingredient reposition speed (seconds)">
                  <NumberInput
                    value={settings.hotdogRepositionSpeed}
                    min={2}
                    max={30}
                    step={1}
                    onChange={(v) => setSettings(s => ({ ...s, hotdogRepositionSpeed: v }))}
                  />
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Never put ketchup on a Chicago dog! 🚫 | Ingredients shuffle every X seconds
                </p>
              </Card>
            </SectionGrid>
          )}

          {tab === 'appearance' && (
            <>
              <SectionGrid>
                <Card title="Zoom thresholds">
                <FieldRow label="Min zoom to show real pins">
                  <NumberInput
                    value={settings.minZoomForPins}
                    min={2}
                    max={20}
                    onChange={(v) => setSettings(s => ({ ...s, minZoomForPins: v }))}
                  />
                </FieldRow>
                <FieldRow label="Cluster → Pins (zoom)">
                  <NumberInput
                    value={settings.clusterBubbleThreshold}
                    min={2}
                    max={20}
                    onChange={(v) => setSettings(s => ({ ...s, clusterBubbleThreshold: v }))}
                  />
                </FieldRow>
                <FieldRow label="Show labels at zoom ≥">
                  <NumberInput
                    value={settings.showLabelsZoom}
                    min={2}
                    max={20}
                    onChange={(v) => setSettings(s => ({ ...s, showLabelsZoom: v }))}
                  />
                </FieldRow>
                <FieldRow label="Max zoom">
                  <NumberInput
                    value={settings.maxZoom}
                    min={2}
                    max={20}
                    onChange={(v) => setSettings(s => ({ ...s, maxZoom: v }))}
                  />
                </FieldRow>
              </Card>

              <Card title="Layers & style">
                <FieldRow label="Popular spots">
                  <Toggle
                    checked={settings.showPopularSpots}
                    onChange={(v) => setSettings(s => ({ ...s, showPopularSpots: v }))}
                  />
                </FieldRow>
                <FieldRow label="Community pins">
                  <Toggle
                    checked={settings.showCommunityPins}
                    onChange={(v) => setSettings(s => ({ ...s, showCommunityPins: v }))}
                  />
                </FieldRow>
                <FieldRow label="Global view uses bubbles">
                  <Toggle
                    checked={settings.enableGlobalBubbles}
                    onChange={(v) => setSettings(s => ({ ...s, enableGlobalBubbles: v }))}
                  />
                </FieldRow>
                <FieldRow label="Low zoom visualization">
                  <select
                    value={settings.lowZoomVisualization || 'bubbles'}
                    onChange={(e) => setSettings(s => ({ ...s, lowZoomVisualization: e.target.value }))}
                    style={inp.select}
                  >
                    <option value="bubbles">Bubbles</option>
                    <option value="heatmap">Heatmap</option>
                  </select>
                </FieldRow>

                {settings.lowZoomVisualization === 'heatmap' && (
                  <>
                    <FieldRow label={`Heatmap Radius: ${settings.heatmapRadius || 25}`}>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="1"
                        value={settings.heatmapRadius || 25}
                        onChange={(e) => setSettings(s => ({ ...s, heatmapRadius: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                        Size of heat points (10-50)
                      </span>
                    </FieldRow>
                    <FieldRow label={`Heatmap Blur: ${settings.heatmapBlur || 15}`}>
                      <input
                        type="range"
                        min="5"
                        max="35"
                        step="1"
                        value={settings.heatmapBlur || 15}
                        onChange={(e) => setSettings(s => ({ ...s, heatmapBlur: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                        Blur amount (5-35)
                      </span>
                    </FieldRow>
                    <FieldRow label={`Heatmap Intensity: ${settings.heatmapIntensity?.toFixed(1) || 0.8}`}>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={settings.heatmapIntensity || 0.8}
                        onChange={(e) => setSettings(s => ({ ...s, heatmapIntensity: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                        Point brightness (0.1-2.0)
                      </span>
                    </FieldRow>
                    <FieldRow label={`Heatmap Max: ${settings.heatmapMax?.toFixed(1) || 2.0}`}>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={settings.heatmapMax || 2.0}
                        onChange={(e) => setSettings(s => ({ ...s, heatmapMax: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'block' }}>
                        Color scaling (0.5-5.0, lower = more vibrant)
                      </span>
                    </FieldRow>
                  </>
                )}

                <FieldRow label="Label style">
                  <select
                    value={settings.labelStyle}
                    onChange={(e) => setSettings(s => ({ ...s, labelStyle: e.target.value }))}
                    style={inp.select}
                  >
                    <option value="pill">Pill</option>
                    <option value="clean">Clean</option>
                  </select>
                </FieldRow>
              </Card>
              </SectionGrid>

              <ContentLayoutTab />
            </>
          )}

          {tab === 'branding' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Restaurant Information">
                <p style={s.muted}>
                  Configure restaurant details shown in the pin share modal. Add links to your Yelp, Google, and website.
                </p>
                <FieldRow label="Restaurant Name">
                  <input
                    type="text"
                    value={settings.restaurantName || ''}
                    onChange={(e) => setSettings(s => ({ ...s, restaurantName: e.target.value }))}
                    placeholder="Chicago Mike's"
                    style={{
                      ...s.input,
                      width: '100%',
                    }}
                  />
                </FieldRow>
                <FieldRow label="Yelp URL">
                  <input
                    type="url"
                    value={settings.restaurantYelpUrl || ''}
                    onChange={(e) => setSettings(s => ({ ...s, restaurantYelpUrl: e.target.value }))}
                    placeholder="https://www.yelp.com/biz/..."
                    style={{
                      ...s.input,
                      width: '100%',
                    }}
                  />
                </FieldRow>
                <FieldRow label="Google URL">
                  <input
                    type="url"
                    value={settings.restaurantGoogleUrl || ''}
                    onChange={(e) => setSettings(s => ({ ...s, restaurantGoogleUrl: e.target.value }))}
                    placeholder="https://maps.google.com/?cid=..."
                    style={{
                      ...s.input,
                      width: '100%',
                    }}
                  />
                </FieldRow>
                <FieldRow label="Website URL">
                  <input
                    type="url"
                    value={settings.restaurantWebsiteUrl || ''}
                    onChange={(e) => setSettings(s => ({ ...s, restaurantWebsiteUrl: e.target.value }))}
                    placeholder="https://chicagomikes.com"
                    style={{
                      ...s.input,
                      width: '100%',
                    }}
                  />
                </FieldRow>
              </Card>

              <Card title="App Logo">
                <p style={s.muted}>
                  Upload a custom logo to replace the default. The logo will appear in the header bar.
                </p>

                {/* Current Logo Preview */}
                {logoUrl && !logoLoading && (
                  <div style={{
                    marginTop: 16,
                    padding: 16,
                    background: '#0f1115',
                    borderRadius: 8,
                    border: '1px solid #2a2f37',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 12,
                      color: '#a7b0b8',
                      marginBottom: 8,
                      fontWeight: '600'
                    }}>
                      Current Logo:
                    </div>
                    <img
                      src={logoUrl}
                      alt="Current logo"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 120,
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (confirm('Delete current logo and revert to default?')) {
                          try {
                            await deleteLogo();
                          } catch (err) {
                            alert(`Failed to delete logo: ${err.message}`);
                          }
                        }
                      }}
                      style={{
                        ...btn.danger,
                        marginTop: 12,
                        fontSize: 12,
                        padding: '6px 12px',
                      }}
                    >
                      Delete Logo
                    </button>
                  </div>
                )}

                {/* Upload Section */}
                <div style={{ marginTop: 16 }}>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        alert('Please select an image file');
                        return;
                      }

                      // Validate file size (max 2MB)
                      if (file.size > 2 * 1024 * 1024) {
                        alert('Logo must be smaller than 2MB');
                        return;
                      }

                      try {
                        await uploadLogo(file);
                        e.target.value = ''; // Reset input
                      } catch (err) {
                        alert(`Failed to upload logo: ${err.message}`);
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('logo-upload').click()}
                    style={{
                      ...btn.primary,
                      width: '100%',
                    }}
                    disabled={logoLoading}
                  >
                    {logoLoading ? 'Uploading...' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </button>
                  <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 12 }}>
                    Recommended: PNG with transparent background, max 2MB
                  </p>
                </div>

                {/* Loading State */}
                {logoLoading && (
                  <p style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>
                    Processing logo...
                  </p>
                )}
              </Card>
            </div>
          )}

          {tab === 'marketplace' && (
            <div style={{ padding: 20 }}>
              <MarketplaceTab settings={adminSettingsFromHook} onSave={saveAdminSettings} />
            </div>
          )}

          {tab === 'features' && (
            <SectionGrid>
              <Card title="Footer Navigation Items">
                <p style={s.muted}>
                  Control which navigation items appear in the footer. If only one item is enabled, the footer will hide icons.
                </p>

                <FieldRow label="🎮 Games">
                  <Toggle
                    checked={navSettings.games_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        games_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🎵 Jukebox">
                  <Toggle
                    checked={navSettings.jukebox_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        jukebox_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🍕 Order Now">
                  <Toggle
                    checked={navSettings.order_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        order_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🔎 Explore">
                  <Toggle
                    checked={navSettings.explore_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        explore_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="📸 Photo Booth">
                  <Toggle
                    checked={navSettings.photobooth_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        photobooth_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🏛️ Then & Now">
                  <Toggle
                    checked={navSettings.thenandnow_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        thenandnow_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="💬 Leave Feedback">
                  <Toggle
                    checked={navSettings.comments_enabled}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        comments_enabled: v,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🗺️ Local Recommendations">
                  <Toggle
                    checked={navSettings.recommendations_enabled || false}
                    onChange={async (v) => {
                      const updated = {
                        ...navSettings,
                        recommendations_enabled: v,
                        default_navigation_app: navSettings.default_navigation_app || 'map',
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

              </Card>

              <Card title="Default Navigation App">
                <p style={s.muted}>
                  Choose which app should be displayed when the kiosk first loads. The map is shown by default.
                </p>

                <FieldRow label="Initial App">
                  <select
                    value={navSettings.default_navigation_app || 'map'}
                    onChange={async (e) => {
                      const updated = {
                        ...navSettings,
                        default_navigation_app: e.target.value,
                        recommendations_enabled: navSettings.recommendations_enabled || false,
                      };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2a2f37',
                      background: '#16181d',
                      color: '#e9eef3',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="map">📍 Map & Pin Placer</option>
                    {navSettings.games_enabled && <option value="games">🎮 Games</option>}
                    {navSettings.jukebox_enabled && <option value="jukebox">🎵 Jukebox</option>}
                    {navSettings.order_enabled && <option value="order">🍕 Order Now</option>}
                    {navSettings.photobooth_enabled && <option value="photobooth">📸 Photo Booth</option>}
                    {navSettings.thenandnow_enabled && <option value="thenandnow">🏛️ Then & Now</option>}
                    {navSettings.recommendations_enabled && <option value="recommendations">🗺️ Local Recommendations</option>}
                  </select>
                </FieldRow>
              </Card>

              <Card title="Mobile Device Controls">
                <p style={s.muted}>
                  Configure which features are visible on mobile devices
                </p>

                <FieldRow label="Show navigation menu">
                  <Toggle
                    checked={settings.showNavMenuOnMobile}
                    onChange={(v) => setSettings(s => ({ ...s, showNavMenuOnMobile: v }))}
                  />
                </FieldRow>

                <FieldRow label="Show 'Now Playing' banner">
                  <Toggle
                    checked={settings.showNowPlayingOnMobile}
                    onChange={(v) => setSettings(s => ({ ...s, showNowPlayingOnMobile: v }))}
                  />
                </FieldRow>

                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  These settings only affect mobile devices. Kiosk mode always shows all enabled features.
                </p>
              </Card>

              <Card title="Widgets">
                <p style={s.muted}>
                  Enable or disable informational widgets
                </p>

                <FieldRow label="Weather Widget">
                  <Toggle
                    checked={settings.showWeatherWidget}
                    onChange={(v) => setSettings(s => ({ ...s, showWeatherWidget: v }))}
                  />
                </FieldRow>

                {settings.showWeatherWidget && (
                  <>
                    <FieldRow label="Location Name">
                      <input
                        type="text"
                        value={settings.weatherLocation}
                        onChange={(e) => setSettings(s => ({ ...s, weatherLocation: e.target.value }))}
                        placeholder="Chicago, IL"
                        style={s.input}
                      />
                    </FieldRow>

                    <FieldRow label="Latitude">
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.weatherLat}
                        onChange={(e) => setSettings(s => ({ ...s, weatherLat: parseFloat(e.target.value) || 0 }))}
                        placeholder="41.8781"
                        style={s.input}
                      />
                    </FieldRow>

                    <FieldRow label="Longitude">
                      <input
                        type="number"
                        step="0.0001"
                        value={settings.weatherLng}
                        onChange={(e) => setSettings(s => ({ ...s, weatherLng: parseFloat(e.target.value) || 0 }))}
                        placeholder="-87.6298"
                        style={s.input}
                      />
                    </FieldRow>

                    <FieldRow label="Timezone">
                      <input
                        type="text"
                        value={settings.weatherTimezone}
                        onChange={(e) => setSettings(s => ({ ...s, weatherTimezone: e.target.value }))}
                        placeholder="America/Chicago"
                        style={s.input}
                      />
                    </FieldRow>
                  </>
                )}

                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Weather widget shows current weather with hot dog recommendations. Configure location coordinates for accurate weather data.
                </p>
              </Card>

              <Card title="QR Code Widget">
                <FieldRow label="Show QR Code">
                  <Toggle
                    checked={settings.qrCodeEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, qrCodeEnabled: v }))}
                  />
                </FieldRow>

                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Display a QR code that patrons can scan to continue exploring on their mobile device. Only shown on kiosk/desktop view.
                </p>
              </Card>

              <Card title="🤖 Walkup Attractor (AI Voice Greeting)">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Greet customers approaching an idle kiosk with animated prompts and optional AI voice.
                </p>

                <FieldRow label="Enable Walkup Greeting">
                  <Toggle
                    checked={settings.walkupAttractorEnabled ?? true}
                    onChange={(v) => setSettings(s => ({ ...s, walkupAttractorEnabled: v }))}
                  />
                </FieldRow>

                {settings.walkupAttractorEnabled && (
                  <>
                    <FieldRow label="Voice Prompts">
                      <Toggle
                        checked={settings.walkupAttractorVoiceEnabled ?? false}
                        onChange={(v) => setSettings(s => ({ ...s, walkupAttractorVoiceEnabled: v }))}
                      />
                    </FieldRow>

                    <FieldRow label="Rotation Speed">
                      <input
                        type="number"
                        min="2"
                        max="10"
                        value={settings.walkupAttractorRotationSeconds || 4}
                        onChange={(e) => setSettings(s => ({ ...s, walkupAttractorRotationSeconds: parseInt(e.target.value) || 4 }))}
                        style={{ ...s.input, width: '80px' }}
                      />
                      <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                    </FieldRow>

                    <FieldRow label="Simulation Mode">
                      <Toggle
                        checked={settings.simulationMode ?? false}
                        onChange={(v) => setSettings(s => ({ ...s, simulationMode: v }))}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                      Simulation mode forces the attractor to show immediately for browser demos (ignores idle timeout)
                    </p>

                    <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                        Custom Call-to-Action Prompts (Max 3)
                      </h4>
                      <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 11 }}>
                        Create up to 3 custom prompts. Leave empty to use default context-aware prompts based on enabled features.
                      </p>

                      {((settings.walkupAttractorPrompts || []).length < 3) && (
                        <button
                          type="button"
                          onClick={() => {
                            const prompts = settings.walkupAttractorPrompts || [];
                            setSettings(s => ({
                              ...s,
                              walkupAttractorPrompts: [
                                ...prompts,
                                { emoji: '👋', text: 'Welcome!', subtext: 'Tap to get started', voiceText: 'Welcome! Tap the screen to begin.' }
                              ]
                            }));
                          }}
                          style={{
                            ...s.button,
                            padding: '8px 16px',
                            fontSize: 13,
                            marginBottom: 12,
                          }}
                        >
                          + Add Custom Prompt
                        </button>
                      )}

                      {(settings.walkupAttractorPrompts || []).map((prompt, index) => (
                        <div key={index} style={{
                          background: 'rgba(255,255,255,0.05)',
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 12,
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Prompt {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const prompts = [...(settings.walkupAttractorPrompts || [])];
                                prompts.splice(index, 1);
                                setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                              }}
                              style={{
                                ...s.button,
                                padding: '4px 12px',
                                fontSize: 11,
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              Remove
                            </button>
                          </div>

                          <FieldRow label="Emoji">
                            <input
                              type="text"
                              maxLength={2}
                              value={prompt.emoji || ''}
                              onChange={(e) => {
                                const prompts = [...(settings.walkupAttractorPrompts || [])];
                                prompts[index] = { ...prompts[index], emoji: e.target.value };
                                setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                              }}
                              placeholder="📍"
                              style={{ ...s.input, width: '60px', textAlign: 'center' }}
                            />
                          </FieldRow>

                          <FieldRow label="Main Text">
                            <input
                              type="text"
                              value={prompt.text || ''}
                              onChange={(e) => {
                                const prompts = [...(settings.walkupAttractorPrompts || [])];
                                prompts[index] = { ...prompts[index], text: e.target.value };
                                setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                              }}
                              placeholder="Leave Your Pin!"
                              style={s.input}
                            />
                          </FieldRow>

                          <FieldRow label="Subtext">
                            <input
                              type="text"
                              value={prompt.subtext || ''}
                              onChange={(e) => {
                                const prompts = [...(settings.walkupAttractorPrompts || [])];
                                prompts[index] = { ...prompts[index], subtext: e.target.value };
                                setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                              }}
                              placeholder="Mark your spot on our map"
                              style={s.input}
                            />
                          </FieldRow>

                          <FieldRow label="Voice Text">
                            <input
                              type="text"
                              value={prompt.voiceText || ''}
                              onChange={(e) => {
                                const prompts = [...(settings.walkupAttractorPrompts || [])];
                                prompts[index] = { ...prompts[index], voiceText: e.target.value };
                                setSettings(s => ({ ...s, walkupAttractorPrompts: prompts }));
                              }}
                              placeholder="Have you already placed a pin on our map?"
                              style={s.input}
                            />
                          </FieldRow>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
                  The walkup attractor appears after {settings.idleAttractorSeconds || 60} seconds of inactivity and shows contextual prompts based on enabled features. Voice prompts use the browser's built-in speech synthesis.
                </p>
              </Card>

              <Card title="📷 Proximity Detection (Camera-Based Approach)">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Automatically detect when someone approaches the kiosk using the front-facing camera. Triggers walkup greeting when motion is detected.
                </p>

                <FieldRow label="Enable Proximity Detection">
                  <Toggle
                    checked={settings.proximityDetectionEnabled ?? false}
                    onChange={(v) => setSettings(s => ({ ...s, proximityDetectionEnabled: v }))}
                  />
                </FieldRow>

                {settings.proximityDetectionEnabled && (
                  <>
                    <FieldRow label="Motion Sensitivity">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          value={settings.proximitySensitivity || 15}
                          onChange={(e) => setSettings(s => ({ ...s, proximitySensitivity: parseInt(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                          {settings.proximitySensitivity || 15} (lower = more sensitive)
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Proximity Threshold (Walkup)">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={settings.proximityThreshold || 30}
                          onChange={(e) => setSettings(s => ({ ...s, proximityThreshold: parseInt(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                          {settings.proximityThreshold || 30} (higher = closer)
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Stare Threshold (Very Close)">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <input
                          type="range"
                          min="20"
                          max="90"
                          value={settings.stareThreshold || 40}
                          onChange={(e) => setSettings(s => ({ ...s, stareThreshold: parseInt(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ ...s.muted, fontSize: 12, minWidth: '60px' }}>
                          {settings.stareThreshold || 40} (for employee clock-in)
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Stare Duration">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="number"
                          min="1000"
                          max="10000"
                          step="500"
                          value={settings.stareDurationMs || 3000}
                          onChange={(e) => setSettings(s => ({ ...s, stareDurationMs: parseInt(e.target.value) || 3000 }))}
                          style={{ ...s.input, width: '100px' }}
                        />
                        <span style={{ ...s.muted, fontSize: 12 }}>ms (how long to trigger)</span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Detection Interval">
                      <input
                        type="number"
                        min="100"
                        max="2000"
                        step="100"
                        value={settings.proximityDetectionInterval || 500}
                        onChange={(e) => setSettings(s => ({ ...s, proximityDetectionInterval: parseInt(e.target.value) || 500 }))}
                        style={{ ...s.input, width: '100px' }}
                      />
                      <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>ms</span>
                    </FieldRow>

                    <FieldRow label="Trigger Voice Greeting">
                      <Toggle
                        checked={settings.proximityTriggerVoice ?? true}
                        onChange={(v) => setSettings(s => ({ ...s, proximityTriggerVoice: v }))}
                      />
                    </FieldRow>

                    <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
                      ⚠️ Requires camera permission. Three detection tiers: <strong>Motion sensitivity</strong> (how much pixel change), <strong>Walkup</strong> (for greetings), <strong>Stare</strong> (very close + prolonged for employee features). Lower detection interval = faster response but more CPU usage.
                    </p>
                  </>
                )}

                <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
                  Uses front-facing camera to detect when customers approach. Runs continuously during business hours when enabled. All processing happens locally in the browser - no external services required.
                </p>
              </Card>

              {/* Proximity Detection Visual Monitor */}
              {settings.proximityDetectionEnabled && proximityDetection && (
                <Card title="📊 Proximity Detection Monitor">
                  <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                    Real-time visual monitoring of camera feed and motion detection events. Use this to verify proximity detection is working correctly.
                  </p>
                  <ProximityMonitor
                    enabled={proximityDetection.enabled}
                    proximityLevel={proximityDetection.proximityLevel}
                    isAmbientDetected={proximityDetection.isAmbientDetected}
                    isPersonDetected={proximityDetection.isPersonDetected}
                    isStaring={proximityDetection.isStaring}
                    stareDuration={proximityDetection.stareDuration}
                    cameraError={proximityDetection.cameraError}
                  />
                </Card>
              )}

              <Card title="🎵 Ambient Music Auto-Play">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Automatically play ambient music when motion is detected in the area (triggered at farther range than walkup greeting).
                </p>

                <FieldRow label="Enable Ambient Music">
                  <Toggle
                    checked={settings.ambientMusicEnabled ?? false}
                    onChange={(v) => setSettings(s => ({ ...s, ambientMusicEnabled: v }))}
                  />
                </FieldRow>

                {settings.ambientMusicEnabled && (
                  <>
                    <FieldRow label="Detection Threshold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <input
                          type="range"
                          min="5"
                          max="25"
                          value={settings.ambientMusicThreshold || 15}
                          onChange={(e) => setSettings(s => ({ ...s, ambientMusicThreshold: parseInt(e.target.value) }))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ ...s.muted, fontSize: 12, minWidth: '80px' }}>
                          {settings.ambientMusicThreshold || 15} (lower = farther)
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Volume">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(settings.ambientMusicVolume || 0.5) * 100}
                          onChange={(e) => setSettings(s => ({ ...s, ambientMusicVolume: parseInt(e.target.value) / 100 }))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ ...s.muted, fontSize: 12, minWidth: '40px' }}>
                          {Math.round((settings.ambientMusicVolume || 0.5) * 100)}%
                        </span>
                      </div>
                    </FieldRow>

                    <FieldRow label="Fade In">
                      <Toggle
                        checked={settings.ambientMusicFadeIn ?? true}
                        onChange={(v) => setSettings(s => ({ ...s, ambientMusicFadeIn: v }))}
                      />
                    </FieldRow>

                    <FieldRow label="Fade Out">
                      <Toggle
                        checked={settings.ambientMusicFadeOut ?? true}
                        onChange={(v) => setSettings(s => ({ ...s, ambientMusicFadeOut: v }))}
                      />
                    </FieldRow>

                    <FieldRow label="Idle Timeout">
                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={settings.ambientMusicIdleTimeout || 30}
                        onChange={(e) => setSettings(s => ({ ...s, ambientMusicIdleTimeout: parseInt(e.target.value) || 30 }))}
                        style={{ ...s.input, width: '80px' }}
                      />
                      <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                    </FieldRow>

                    <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
                        Music Playlist
                      </h4>
                      <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 11 }}>
                        Add local music files for ambient playback. Upload audio files to your server and provide the URLs here.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          const playlist = settings.ambientMusicPlaylist || [];
                          setSettings(s => ({
                            ...s,
                            ambientMusicPlaylist: [
                              ...playlist,
                              { name: 'Track ' + (playlist.length + 1), url: '' }
                            ]
                          }));
                        }}
                        style={{
                          ...s.button,
                          padding: '8px 16px',
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                      >
                        + Add Track
                      </button>

                      {(settings.ambientMusicPlaylist || []).map((track, index) => (
                        <div key={index} style={{
                          background: 'rgba(255,255,255,0.05)',
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 12,
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Track {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const playlist = [...(settings.ambientMusicPlaylist || [])];
                                playlist.splice(index, 1);
                                setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                              }}
                              style={{
                                ...s.button,
                                padding: '4px 12px',
                                fontSize: 11,
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              Remove
                            </button>
                          </div>

                          <FieldRow label="Name">
                            <input
                              type="text"
                              value={track.name || ''}
                              onChange={(e) => {
                                const playlist = [...(settings.ambientMusicPlaylist || [])];
                                playlist[index] = { ...playlist[index], name: e.target.value };
                                setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                              }}
                              placeholder="Track name"
                              style={s.input}
                            />
                          </FieldRow>

                          <FieldRow label="URL">
                            <input
                              type="text"
                              value={track.url || ''}
                              onChange={(e) => {
                                const playlist = [...(settings.ambientMusicPlaylist || [])];
                                playlist[index] = { ...playlist[index], url: e.target.value };
                                setSettings(s => ({ ...s, ambientMusicPlaylist: playlist }));
                              }}
                              placeholder="/audio/track.mp3 or https://..."
                              style={s.input}
                            />
                          </FieldRow>
                        </div>
                      ))}
                    </div>

                    <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
                      💡 Tip: Ambient music threshold should be lower (farther range) than walkup greeting threshold for best experience. Music starts playing when people enter the area, then greeting appears when they get closer.
                    </p>
                  </>
                )}
              </Card>
            </SectionGrid>
          )}

          {tab === 'content' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Popular spots (shown on Chicago map)">
                <div style={{ display: 'grid', gap: 12, maxHeight: 500, overflow: 'auto', paddingRight: 2 }}>
                  {popularSpots.map((row, i) => (
                    <div key={row.id ?? i} style={{ ...s.row, flexDirection: 'column', gap: 8, alignItems: 'stretch', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={row.category}
                          onChange={(e) => updateSpot(i, { category: e.target.value })}
                          style={{ ...inp.select, flex: '0 0 140px' }}
                        >
                          <option value="hotdog">🌭 Hot Dog</option>
                          <option value="beef">🥩 Italian Beef</option>
                          <option value="pizza">🍕 Pizza</option>
                          <option value="attraction">🏛️ Attraction</option>
                          <option value="other">📍 Other</option>
                        </select>
                        <input
                          style={{ ...inp.text, flex: 1 }}
                          value={row.label}
                          placeholder="Display label (e.g., Willis Tower)"
                          onChange={(e) => updateSpot(i, { label: e.target.value })}
                        />
                        <button style={btn.dangerMini} onClick={() => removeSpot(i)}>Remove</button>
                      </div>
                      <textarea
                        style={{ ...inp.text, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                        value={row.description || ''}
                        placeholder="Description / fun fact / history (e.g., Built in 1973 as Sears Tower...)"
                        onChange={(e) => updateSpot(i, { description: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <button style={btn.secondary} onClick={addSpot}>+ Add spot</button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'moderate' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Moderate pins">
                <p style={s.muted}>
                  Select pins to delete. This is wired to Supabase: filters respect your “Data window” months.
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    style={{ ...inp.text, maxWidth: 320 }}
                    placeholder="Search slug or note…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') refreshModeration() }}
                  />
                  <button style={btn.secondary} onClick={refreshModeration} disabled={modLoading}>
                    {modLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                <ModerationTable
                  rows={modRows}
                  selected={pendingDeletes}
                  onToggle={togglePendingDelete}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={btn.danger} onClick={deleteSelected} disabled={!pendingDeletes.size}>
                    Delete selected
                  </button>
                </div>
              </Card>
            </div>
          )}

          {tab === 'thenandnow' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Add New Then & Now Comparison">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);

                  try {
                    const thenFile = formData.get('then_image');
                    const nowFile = formData.get('now_image');

                    if (!thenFile || !nowFile) {
                      alert('Please select both Then and Now images');
                      return;
                    }

                    // Upload images
                    const thenUrl = await uploadThenNowImage(thenFile, 'then');
                    const nowUrl = await uploadThenNowImage(nowFile, 'now');

                    // Add comparison
                    await addComparison({
                      location: formData.get('location'),
                      thenYear: formData.get('then_year'),
                      thenDescription: formData.get('then_description'),
                      thenImageUrl: thenUrl,
                      nowYear: formData.get('now_year') || '2024',
                      nowDescription: formData.get('now_description'),
                      nowImageUrl: nowUrl
                    });

                    // Reset form
                    e.target.reset();
                    alert('Comparison added successfully!');
                  } catch (err) {
                    console.error('Failed to add comparison:', err);
                    alert('Failed to add comparison: ' + err.message);
                  }
                }}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    {/* Location */}
                    <FieldRow label="Location Name">
                      <input
                        type="text"
                        name="location"
                        required
                        placeholder="e.g., Willis Tower"
                        style={{ ...s.input, width: '100%' }}
                      />
                    </FieldRow>

                    {/* Then Section */}
                    <div style={{
                      padding: 12,
                      background: 'rgba(196, 181, 253, 0.1)',
                      border: '1px solid rgba(196, 181, 253, 0.3)',
                      borderRadius: 8
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#c4b5fd' }}>THEN (Historical Photo)</h4>

                      <FieldRow label="Year">
                        <input
                          type="text"
                          name="then_year"
                          required
                          placeholder="e.g., 1974"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <FieldRow label="Description">
                        <input
                          type="text"
                          name="then_description"
                          required
                          placeholder="e.g., Tower just completed"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <FieldRow label="Image">
                        <input
                          type="file"
                          name="then_image"
                          accept="image/*"
                          required
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>
                    </div>

                    {/* Now Section */}
                    <div style={{
                      padding: 12,
                      background: 'rgba(147, 197, 253, 0.1)',
                      border: '1px solid rgba(147, 197, 253, 0.3)',
                      borderRadius: 8
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#93c5fd' }}>NOW (Modern Photo)</h4>

                      <FieldRow label="Year">
                        <input
                          type="text"
                          name="now_year"
                          placeholder="e.g., 2024"
                          defaultValue="2024"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <FieldRow label="Description">
                        <input
                          type="text"
                          name="now_description"
                          required
                          placeholder="e.g., Modern skyline"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <FieldRow label="Image">
                        <input
                          type="file"
                          name="now_image"
                          accept="image/*"
                          required
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>
                    </div>

                    <button type="submit" style={btn.primary}>
                      📸 Add Comparison
                    </button>
                  </div>
                </form>
              </Card>

              <Card title="Then & Now Historical Photos">
                <p style={s.muted}>
                  Manage historical photo comparisons showing Chicago's transformation over time. Each comparison shows a "then" and "now" photo of the same location.
                </p>

                {thenAndNowLoading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
                    Loading comparisons...
                  </div>
                ) : thenAndNowComparisons.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 8,
                    marginTop: 16
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
                    <div style={{ color: '#93c5fd', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                      No comparisons yet
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 14 }}>
                      Run the SQL migration in Supabase to create the then_and_now table, then add your first historical photo comparison.
                    </div>
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#d1d5db',
                      textAlign: 'left'
                    }}>
                      File: create-then-and-now-table.sql
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <div style={{
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
                    }}>
                      {thenAndNowComparisons.map((comparison) => (
                        <div
                          key={comparison.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          <div style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: '#f3f4f6',
                            marginBottom: 4
                          }}>
                            {comparison.location}
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: 11,
                                color: '#c4b5fd',
                                fontWeight: 600,
                                marginBottom: 4
                              }}>
                                THEN ({comparison.then_year})
                              </div>
                              {comparison.then_image_url && (
                                <img
                                  src={comparison.then_image_url}
                                  alt={`${comparison.location} in ${comparison.then_year}`}
                                  style={{
                                    width: '100%',
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    marginBottom: 4
                                  }}
                                />
                              )}
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {comparison.then_description}
                              </div>
                            </div>

                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: 11,
                                color: '#93c5fd',
                                fontWeight: 600,
                                marginBottom: 4
                              }}>
                                NOW ({comparison.now_year})
                              </div>
                              {comparison.now_image_url && (
                                <img
                                  src={comparison.now_image_url}
                                  alt={`${comparison.location} in ${comparison.now_year}`}
                                  style={{
                                    width: '100%',
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    marginBottom: 4
                                  }}
                                />
                              )}
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {comparison.now_description}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: 8,
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            alignItems: 'center'
                          }}>
                            <div style={{
                              fontSize: 11,
                              color: '#9ca3af',
                              flex: 1
                            }}>
                              Order: {comparison.display_order}
                            </div>
                            <div style={{
                              fontSize: 11,
                              color: comparison.active ? '#10b981' : '#ef4444'
                            }}>
                              {comparison.active ? '✓ Active' : '✕ Inactive'}
                            </div>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete "${comparison.location}"?`)) {
                                  try {
                                    await deleteComparison(
                                      comparison.id,
                                      comparison.then_image_url,
                                      comparison.now_image_url
                                    );
                                  } catch (err) {
                                    alert('Failed to delete: ' + err.message);
                                  }
                                }
                              }}
                              style={{
                                ...btn.danger,
                                padding: '4px 8px',
                                fontSize: 11
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: 20,
                      padding: 16,
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 8
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#93c5fd' }}>
                        📝 Manage via Supabase
                      </div>
                      <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                        To add, edit, or delete historical photo comparisons, use the Supabase dashboard to modify the <code style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontFamily: 'monospace'
                        }}>then_and_now</code> table directly. Changes will appear here and on the kiosk in real-time.
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'system' && systemSubtab === 'multiLocation' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Kiosk Clusters & Multi-Location Management">
                <p style={s.muted}>
                  Manage multi-location kiosk deployments. Group locations under a single restaurant/owner to share branding, settings, and allow customers to find other locations.
                </p>

                {kioskClustersLoading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
                    Loading clusters...
                  </div>
                ) : kioskClusters.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 8,
                    marginTop: 16
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
                    <div style={{ color: '#c4b5fd', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                      No clusters configured
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 14, marginBottom: 12 }}>
                      Create your first kiosk cluster to manage multiple locations.
                    </div>
                    <div style={{
                      marginTop: 16,
                      padding: 12,
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      color: '#d1d5db',
                      textAlign: 'left'
                    }}>
                      <div>1. Run SQL migration: create-kiosk-clusters-table.sql</div>
                      <div>2. Add cluster via Supabase dashboard</div>
                      <div>3. Add locations to cluster</div>
                      <div>4. Use ?location=[ID] in kiosk URL</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    {kioskClusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 16
                        }}
                      >
                        {/* Cluster Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 16,
                          marginBottom: 16,
                          paddingBottom: 16,
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {cluster.logo_url && (
                            <img
                              src={cluster.logo_url}
                              alt={cluster.name}
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: 'contain',
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.1)'
                              }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 18,
                              fontWeight: 600,
                              color: '#f3f4f6',
                              marginBottom: 4
                            }}>
                              {cluster.name}
                            </div>
                            {cluster.description && (
                              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
                                {cluster.description}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af' }}>
                              {cluster.owner_name && (
                                <div>👤 {cluster.owner_name}</div>
                              )}
                              {cluster.owner_email && (
                                <div>✉️ {cluster.owner_email}</div>
                              )}
                              <div style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: cluster.primary_color || '#3b82f6',
                                color: '#fff',
                                fontSize: 11
                              }}>
                                {cluster.locations?.length || 0} location{cluster.locations?.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: cluster.active ? '#10b981' : '#ef4444',
                            fontWeight: 600
                          }}>
                            {cluster.active ? '✓ Active' : '✕ Inactive'}
                          </div>
                        </div>

                        {/* Locations List */}
                        {cluster.locations && cluster.locations.length > 0 && (
                          <div style={{ display: 'grid', gap: 8 }}>
                            <div style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#9ca3af',
                              marginBottom: 4
                            }}>
                              LOCATIONS
                            </div>
                            {cluster.locations
                              .sort((a, b) => a.display_order - b.display_order)
                              .map((location) => (
                                <div
                                  key={location.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: 12,
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: 8,
                                    border: location.is_primary ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent'
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div style={{
                                      fontSize: 14,
                                      fontWeight: 500,
                                      color: '#f3f4f6',
                                      marginBottom: 2
                                    }}>
                                      {location.location_name}
                                      {location.is_primary && (
                                        <span style={{
                                          marginLeft: 8,
                                          fontSize: 11,
                                          padding: '2px 6px',
                                          borderRadius: 3,
                                          background: 'rgba(139, 92, 246, 0.3)',
                                          color: '#c4b5fd'
                                        }}>
                                          PRIMARY
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                                      {location.address}
                                      {location.phone && ` • ${location.phone}`}
                                    </div>
                                  </div>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    gap: 4
                                  }}>
                                    <div style={{
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                      color: '#6b7280',
                                      background: 'rgba(0, 0, 0, 0.3)',
                                      padding: '2px 6px',
                                      borderRadius: 3
                                    }}>
                                      ?location={location.id.slice(0, 8)}...
                                    </div>
                                    <div style={{
                                      fontSize: 11,
                                      color: location.active ? '#10b981' : '#ef4444'
                                    }}>
                                      {location.active ? '●' : '○'} {location.active ? 'Active' : 'Inactive'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div style={{
                          marginTop: 16,
                          padding: 12,
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#93c5fd'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            🔗 How to use this cluster:
                          </div>
                          <div style={{ color: '#9ca3af', lineHeight: 1.5 }}>
                            Add <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
                              ?location=[location-id]
                            </code> to your kiosk URL to activate cluster mode with location switching.
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{
                      marginTop: 20,
                      padding: 16,
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: 8
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#c4b5fd' }}>
                        📝 Manage Clusters
                      </div>
                      <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
                        Use the Supabase dashboard to manage clusters, locations, and settings:
                        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
                          • <code>kiosk_clusters</code> - Business/restaurant info<br />
                          • <code>kiosk_locations</code> - Individual locations<br />
                          • <code>kiosk_location_settings</code> - Per-location config
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'system' && systemSubtab === 'database' && (
            <div>
              <SectionGrid>
                <Card title="💾 Database Sync Status">
                  <p style={{...s.muted, marginBottom: 16}}>
                    Monitor and manage synchronization between local SQLite database and Supabase cloud database.
                  </p>

                  <div style={{display: 'flex', gap: 12, marginBottom: 20}}>
                    <button
                      style={{...btn.primary, flex: 1}}
                      onClick={runDatabaseAudit}
                      disabled={dbAuditLoading}
                    >
                      {dbAuditLoading ? '⏳ Auditing...' : '🔍 Run Audit'}
                    </button>
                    <button
                      style={{...btn.secondary, flex: 1}}
                      onClick={runAutoFix}
                      disabled={dbAutoFixing || !dbAudit}
                    >
                      {dbAutoFixing ? '⏳ Fixing...' : '🔧 Auto-Fix All'}
                    </button>
                  </div>

                  {!dbAudit && !dbAuditLoading && (
                    <div style={{padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14}}>
                      Click "Run Audit" to check database synchronization status
                    </div>
                  )}

                  {dbAudit && (
                    <div style={{marginTop: 20}}>
                      {/* Summary Card */}
                      <div style={{
                        background: dbAudit.summary.totalIssues === 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${dbAudit.summary.totalIssues === 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20,
                      }}>
                        <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>
                          {dbAudit.summary.totalIssues === 0 ? '✅ All Systems Synced' : `⚠️ ${dbAudit.summary.totalIssues} Issues Found`}
                        </div>
                        {dbAudit.summary.totalIssues > 0 && (
                          <div style={{fontSize: 13, color: '#9ca3af'}}>
                            Critical: {dbAudit.summary.critical} • High: {dbAudit.summary.high} • Low: {dbAudit.summary.low}
                          </div>
                        )}
                        <div style={{fontSize: 11, color: '#6b7280', marginTop: 8}}>
                          Last audit: {new Date(dbAudit.timestamp).toLocaleString()}
                        </div>
                      </div>

                      {/* Table Status Cards */}
                      {Object.entries(dbAudit.tables).map(([tableName, tableAudit]) => (
                        <div key={tableName} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid #2a2f37',
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 12,
                        }}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                            <div>
                              <div style={{fontSize: 16, fontWeight: 600}}>{tableName}</div>
                              <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                                {!tableAudit.exists && '❌ Table missing'}
                                {tableAudit.exists && tableAudit.dataSyncStatus === 'synced' && '✅ Fully synced'}
                                {tableAudit.dataSyncStatus === 'local_behind' && `⚠️ Local behind by ${tableAudit.missingCount} records`}
                                {tableAudit.dataSyncStatus === 'local_ahead' && `⚠️ Local ahead by ${tableAudit.extraCount} records`}
                                {tableAudit.dataSyncStatus === 'supabase_error' && '❌ Supabase connection error'}
                              </div>
                            </div>
                            {tableAudit.dataSyncStatus === 'local_behind' && (
                              <button
                                style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                                onClick={() => syncTableData(tableName)}
                              >
                                Sync Now
                              </button>
                            )}
                          </div>

                          {/* Row Counts */}
                          {tableAudit.exists && tableAudit.rowCounts && (
                            <div style={{display: 'flex', gap: 16, marginTop: 12, fontSize: 13}}>
                              <div>
                                <span style={{color: '#9ca3af'}}>Local:</span>{' '}
                                <span style={{fontWeight: 600}}>{tableAudit.rowCounts.localCount}</span>
                              </div>
                              <div>
                                <span style={{color: '#9ca3af'}}>Cloud:</span>{' '}
                                <span style={{fontWeight: 600}}>{tableAudit.rowCounts.supabaseCount ?? 'N/A'}</span>
                              </div>
                              {tableAudit.rowCounts.diff !== 0 && (
                                <div>
                                  <span style={{color: '#9ca3af'}}>Diff:</span>{' '}
                                  <span style={{fontWeight: 600, color: tableAudit.rowCounts.diff < 0 ? '#ef4444' : '#f59e0b'}}>
                                    {tableAudit.rowCounts.diff > 0 ? '+' : ''}{tableAudit.rowCounts.diff}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Schema Issues */}
                          {tableAudit.schemaIssues && tableAudit.schemaIssues.length > 0 && (
                            <div style={{marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2f37'}}>
                              <div style={{fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f59e0b'}}>
                                Schema Issues ({tableAudit.schemaIssues.length})
                              </div>
                              {tableAudit.schemaIssues.slice(0, 5).map((issue, idx) => (
                                <div key={idx} style={{fontSize: 12, color: '#9ca3af', marginBottom: 4}}>
                                  • {issue.type}: {issue.column || 'Table'}
                                  {issue.severity && ` (${issue.severity})`}
                                </div>
                              ))}
                              {tableAudit.schemaIssues.length > 5 && (
                                <div style={{fontSize: 12, color: '#6b7280', marginTop: 4}}>
                                  ... and {tableAudit.schemaIssues.length - 5} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Auto-Fix Result */}
                      {dbAutoFixResult && (
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 8,
                          padding: 16,
                          marginTop: 20,
                        }}>
                          <div style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
                            ✅ Auto-Fix Complete
                          </div>
                          <div style={{fontSize: 13, color: '#9ca3af'}}>
                            Applied {dbAutoFixResult.schemaFixes?.appliedFixes?.length || 0} schema fixes
                          </div>
                          {Object.entries(dbAutoFixResult.dataSyncs || {}).map(([table, result]) => (
                            <div key={table} style={{fontSize: 13, color: '#9ca3af', marginTop: 4}}>
                              • {table}: Synced {result.synced || 0}/{result.total || 0} records
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </SectionGrid>
            </div>
          )}

          {tab === 'system' && systemSubtab === 'tiles' && (
            <div>
              <SectionGrid>
                <Card title="🗺️ Map Tile Cache">
                  <p style={{...s.muted, marginBottom: 16}}>
                    Manage offline map tiles. Tiles are stored in <strong>native filesystem</strong> on Android (persists across reinstalls) or IndexedDB on web (cleared on uninstall).
                  </p>

                  <div style={{display: 'flex', gap: 12, marginBottom: 20}}>
                    <button
                      style={{...btn.primary, flex: 1}}
                      onClick={loadTileStats}
                      disabled={tileStatsLoading}
                    >
                      {tileStatsLoading ? '⏳ Loading...' : '📊 Check Status'}
                    </button>
                    <button
                      style={{...btn.danger, flex: 1}}
                      onClick={clearTileCache}
                    >
                      🗑️ Clear Cache
                    </button>
                  </div>

                  {!tileStats && !tileStatsLoading && (
                    <div style={{padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14}}>
                      Click "Check Status" to see tile cache statistics
                    </div>
                  )}

                  {tileStats && (
                    <div>
                      {/* Storage Backend Info */}
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20,
                      }}>
                        <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>
                          📦 Storage: {tileStats.storage}
                        </div>
                        <div style={{fontSize: 13, color: '#9ca3af'}}>
                          {tileStats.storage === 'Native Filesystem' && '✅ Tiles persist across app reinstalls'}
                          {tileStats.storage === 'IndexedDB' && '⚠️ Tiles are cleared when app is uninstalled (browser mode)'}
                        </div>
                        {tileStats.tileCount && tileStats.tileCount !== 'N/A' && (
                          <div style={{fontSize: 13, color: '#9ca3af', marginTop: 4}}>
                            Total cached tiles: {tileStats.tileCount}
                          </div>
                        )}
                      </div>

                      {/* Chicago Tiles */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid #2a2f37',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                          <div>
                            <div style={{fontSize: 16, fontWeight: 600}}>🏙️ Chicago Area</div>
                            <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                              {tileStats.chicago.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.chicago.stats.percentCached}% complete`}
                            </div>
                            <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                              Zoom 10-17 • ~{tileStats.chicago.stats.total} tiles
                            </div>
                          </div>
                          {!tileStats.chicago.isComplete && (
                            <button
                              style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                              onClick={downloadChicagoTiles}
                              disabled={chicagoDownloading}
                            >
                              {chicagoDownloading ? '⏳ Downloading...' : 'Download'}
                            </button>
                          )}
                        </div>
                        {chicagoDownloadProgress && chicagoDownloadProgress.total > 0 && (
                          <div style={{marginTop: 12}}>
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              height: 8,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                background: '#3b82f6',
                                height: '100%',
                                width: `${(chicagoDownloadProgress.completed / chicagoDownloadProgress.total) * 100}%`,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                              {chicagoDownloadProgress.completed} / {chicagoDownloadProgress.total} tiles
                              ({chicagoDownloadProgress.cached} new, {chicagoDownloadProgress.skipped} cached)
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Global Tiles */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid #2a2f37',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                          <div>
                            <div style={{fontSize: 16, fontWeight: 600}}>🌍 Global Overview</div>
                            <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                              {tileStats.global.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.global.stats.percentCached}% complete`}
                            </div>
                            <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                              Zoom 3-5 • {tileStats.global.stats.total} tiles • ~2MB
                            </div>
                          </div>
                          {!tileStats.global.isComplete && (
                            <button
                              style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                              onClick={downloadGlobalTiles}
                              disabled={globalDownloading}
                            >
                              {globalDownloading ? '⏳ Downloading...' : 'Download'}
                            </button>
                          )}
                        </div>
                        {globalDownloadProgress && globalDownloadProgress.total > 0 && (
                          <div style={{marginTop: 12}}>
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              height: 8,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                background: '#10b981',
                                height: '100%',
                                width: `${(globalDownloadProgress.completed / globalDownloadProgress.total) * 100}%`,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                              {globalDownloadProgress.completed} / {globalDownloadProgress.total} tiles
                              ({globalDownloadProgress.cached} new, {globalDownloadProgress.skipped} cached)
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Major Metro Tiles */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid #2a2f37',
                        borderRadius: 8,
                        padding: 16,
                      }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                          <div>
                            <div style={{fontSize: 16, fontWeight: 600}}>🌆 Major Cities (20 metros)</div>
                            <div style={{fontSize: 12, color: '#9ca3af', marginTop: 4}}>
                              {tileStats.metro.isComplete ? '✅ Fully cached' : `⏳ ${tileStats.metro.stats.percentCached}% complete`}
                            </div>
                            <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                              Zoom 10-12 • ~{tileStats.metro.stats.total} tiles • ~50MB
                            </div>
                            <div style={{fontSize: 11, color: '#6b7280', marginTop: 2}}>
                              NYC, LA, London, Paris, Tokyo, Beijing, Mumbai, Dubai, São Paulo, Sydney + 10 more
                            </div>
                          </div>
                          {!tileStats.metro.isComplete && (
                            <button
                              style={{...btn.secondary, padding: '6px 12px', fontSize: 13}}
                              onClick={downloadMetroTiles}
                              disabled={metroDownloading}
                            >
                              {metroDownloading ? '⏳ Downloading...' : 'Download'}
                            </button>
                          )}
                        </div>
                        {metroDownloadProgress && metroDownloadProgress.total > 0 && (
                          <div style={{marginTop: 12}}>
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              height: 8,
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                background: '#f59e0b',
                                height: '100%',
                                width: `${(metroDownloadProgress.completed / metroDownloadProgress.total) * 100}%`,
                                transition: 'width 0.3s ease',
                              }} />
                            </div>
                            <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                              {metroDownloadProgress.completed} / {metroDownloadProgress.total} tiles
                              ({metroDownloadProgress.cached} new, {metroDownloadProgress.skipped} cached)
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{marginTop: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 6, fontSize: 12, color: '#9ca3af'}}>
                        💡 <strong>Tip:</strong> Download tiles once, and they persist across app reinstalls (Android only). Downloads run in background and won't block map usage.
                      </div>
                    </div>
                  )}
                </Card>
              </SectionGrid>
            </div>
          )}

          {tab === 'system' && systemSubtab === 'webhook' && (
            <div>
              <SectionGrid>
                <Card title="📡 Console Webhook - Remote Monitoring">
                  <p style={{...s.muted, marginBottom: 16}}>
                    Send all console events (log, error, warn, info) to a webhook endpoint for remote monitoring.
                    Perfect for watching kiosk activity from anywhere!
                  </p>

                  <FieldRow label="Enable Webhook">
                    <Toggle
                      checked={settings.consoleWebhookEnabled || false}
                      onChange={(v) => setSettings(s => ({ ...s, consoleWebhookEnabled: v }))}
                    />
                  </FieldRow>

                  <FieldRow label="Webhook URL">
                    <TextInput
                      value={settings.consoleWebhookUrl || ''}
                      onChange={(v) => setSettings(s => ({ ...s, consoleWebhookUrl: v }))}
                      placeholder="https://webhook.site/your-unique-url"
                      style={{fontFamily: 'monospace', fontSize: 12}}
                    />
                  </FieldRow>

                  <div style={{marginTop: 20, display: 'flex', gap: 12}}>
                    <button
                      style={{...btn.primary, flex: 1}}
                      onClick={() => {
                        const sent = sendTestEvent();
                        if (sent) {
                          setToast({ title: '✅ Test Sent', text: 'Check your webhook endpoint for the test event!' });
                          setTimeout(() => setToast(null), 3000);
                        } else {
                          setToast({ title: '❌ No Webhook URL', text: 'Please set a webhook URL first' });
                          setTimeout(() => setToast(null), 3000);
                        }
                      }}
                      disabled={!settings.consoleWebhookUrl}
                    >
                      🧪 Send Test Event
                    </button>
                    <button
                      style={{...btn.secondary, flex: 1}}
                      onClick={() => {
                        const status = getWebhookStatus();
                        setToast({
                          title: status.enabled ? '✅ Webhook Active' : '❌ Webhook Disabled',
                          text: `Queue: ${status.queueSize} events • URL: ${status.url ? status.url.substring(0, 30) + '...' : 'Not set'}`
                        });
                        setTimeout(() => setToast(null), 5000);
                      }}
                    >
                      📊 Check Status
                    </button>
                  </div>

                  <div style={{marginTop: 20, padding: 16, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8}}>
                    <div style={{fontSize: 14, fontWeight: 600, marginBottom: 8}}>
                      📦 What Gets Monitored:
                    </div>
                    <ul style={{margin: 0, paddingLeft: 20, fontSize: 13, color: '#9ca3af'}}>
                      <li>Proximity detection events (approaching, ambient, stare)</li>
                      <li>Adaptive learning sessions (started, ended, outcomes)</li>
                      <li>Model training events (accuracy, session counts)</li>
                      <li>Threshold adjustments (auto-tuning)</li>
                      <li>Pin placements, errors, validations</li>
                      <li>Jukebox activity, voice commands</li>
                      <li>All console.log, console.error, console.warn, console.info</li>
                    </ul>
                  </div>

                  <div style={{marginTop: 16, padding: 16, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8}}>
                    <div style={{fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#10b981'}}>
                      💡 Quick Setup with Webhook.site:
                    </div>
                    <ol style={{margin: 0, paddingLeft: 20, fontSize: 13, color: '#9ca3af'}}>
                      <li>Go to <a href="https://webhook.site" target="_blank" rel="noopener noreferrer" style={{color: '#60a5fa'}}>webhook.site</a></li>
                      <li>Copy your unique URL</li>
                      <li>Paste it above and enable the webhook</li>
                      <li>Click "Send Test Event" to verify</li>
                      <li>Watch live events stream in!</li>
                    </ol>
                  </div>

                  {settings.consoleWebhookUrl && settings.consoleWebhookUrl.includes('webhook.site') && (
                    <div style={{marginTop: 16, padding: 16, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8}}>
                      <div style={{fontSize: 13, color: '#f59e0b'}}>
                        ⚠️ <strong>Remember:</strong> webhook.site URLs are temporary! For production, use a permanent webhook like Zapier, Discord, Slack, or your own server.
                      </div>
                    </div>
                  )}
                </Card>
              </SectionGrid>
            </div>
          )}

          {tab === 'analytics' && (
            <>
              <div style={{ padding: '0 4px' }}>
                <AnalyticsDashboard />
              </div>

              <div style={{ marginTop: 24 }}>
                <SectionGrid>
                  <Card title="📢 Notifications">
                    <FieldRow label="Enable Twilio SMS">
                      <Toggle
                        checked={settings.twilioEnabled}
                        onChange={(v) => setSettings(s => ({ ...s, twilioEnabled: v }))}
                      />
                    </FieldRow>

                    {settings.twilioEnabled && (
                      <>
                        <FieldRow label="Account SID">
                          <input
                            type="text"
                            value={settings.twilioAccountSid || ''}
                            onChange={(e) => setSettings(s => ({ ...s, twilioAccountSid: e.target.value }))}
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            style={{ ...s.input, width: '100%', fontFamily: 'monospace' }}
                          />
                        </FieldRow>

                        <FieldRow label="Auth Token">
                          <input
                            type="password"
                            value={settings.twilioAuthToken || ''}
                            onChange={(e) => setSettings(s => ({ ...s, twilioAuthToken: e.target.value }))}
                            placeholder="********************************"
                            style={{ ...s.input, width: '100%', fontFamily: 'monospace' }}
                          />
                        </FieldRow>

                        <FieldRow label="Phone Number">
                          <input
                            type="tel"
                            value={settings.twilioPhoneNumber || ''}
                            onChange={(e) => setSettings(s => ({ ...s, twilioPhoneNumber: e.target.value }))}
                            placeholder="+15551234567"
                            style={{ ...s.input, width: '100%' }}
                          />
                        </FieldRow>

                        <FieldRow label="SMS Recipients">
                          <input
                            type="text"
                            value={settings.notificationRecipients || ''}
                            onChange={(e) => setSettings(s => ({ ...s, notificationRecipients: e.target.value }))}
                            placeholder="+1234567890, +0987654321"
                            style={{ ...s.input, width: '100%' }}
                          />
                        </FieldRow>
                      </>
                    )}
                  </Card>
                </SectionGrid>
              </div>
            </>
          )}

          {tab === 'backgrounds' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Photo Capture Backgrounds">
                <p style={s.muted}>
                  Upload background images that users can select when taking photos. Images will appear in a carousel.
                </p>

                {/* Upload Section */}
                <div style={{ marginTop: 16 }}>
                  <input
                    type="file"
                    id="bg-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const name = prompt('Enter a name for this background:', file.name);
                        if (!name) return;

                        await addBackground(file, name);
                        e.target.value = ''; // Reset input
                      } catch (err) {
                        alert(`Failed to upload: ${err.message}`);
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('bg-upload').click()}
                    style={{
                      ...btn.primary,
                      width: '100%',
                      marginBottom: 16,
                    }}
                  >
                    + Upload Background Image
                  </button>
                </div>

                {/* Loading State */}
                {bgLoading && (
                  <p style={{ textAlign: 'center', color: '#888' }}>Loading backgrounds...</p>
                )}

                {/* Background Grid */}
                {!bgLoading && backgrounds.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                    No backgrounds yet. Upload your first one!
                  </p>
                )}

                {!bgLoading && backgrounds.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}>
                    {backgrounds.map((bg) => (
                      <div
                        key={bg.id}
                        style={{
                          position: 'relative',
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #2a2f37',
                          background: '#0f1115',
                        }}
                      >
                        <img
                          src={bg.url}
                          alt={bg.name}
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div style={{
                          padding: 8,
                          fontSize: 12,
                          color: '#fff',
                          background: '#1a1d23',
                        }}>
                          <div style={{
                            fontWeight: '600',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {bg.name}
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete "${bg.name}"?`)) {
                                try {
                                  await deleteBackground(bg.id, bg.url);
                                } catch (err) {
                                  alert(`Failed to delete: ${err.message}`);
                                }
                              }
                            }}
                            style={{
                              ...btn.danger,
                              width: '100%',
                              padding: '4px 8px',
                              fontSize: 11,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'media' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Playback Control">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Control currently playing media and queue
                </p>
                <div style={{
                  padding: '16px',
                  background: currentTrack || queue.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  border: currentTrack || queue.length > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: 8
                }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {currentTrack ? '🎵 Now Playing' : queue.length > 0 ? '⏸️ Queue Ready' : '✓ No Active Media'}
                    </div>
                    <div style={{ fontSize: 13, color: '#9ca3af' }}>
                      {currentTrack ? (
                        <>
                          <div style={{ fontWeight: 500, color: '#f3f4f6', marginBottom: 2 }}>
                            {currentTrack.title}
                            {currentTrack.artist && ` • ${currentTrack.artist}`}
                          </div>
                          {queue.length > 0 && <div>+{queue.length} track{queue.length !== 1 ? 's' : ''} in queue</div>}
                        </>
                      ) : queue.length > 0 ? (
                        `${queue.length} track${queue.length !== 1 ? 's' : ''} queued`
                      ) : (
                        'No tracks playing or queued'
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Stop all playback and clear the entire queue?')) {
                        stopAll();
                      }
                    }}
                    disabled={!currentTrack && queue.length === 0}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: (!currentTrack && queue.length === 0) ? '#4b5563' : '#ef4444',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: (!currentTrack && queue.length === 0) ? 'not-allowed' : 'pointer',
                      opacity: (!currentTrack && queue.length === 0) ? 0.5 : 1,
                    }}
                  >
                    ⏹️ Stop All Media & Clear Queue
                  </button>
                </div>
              </Card>

              <Card title="Spotify Integration">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Connect your Spotify account to display currently playing music in the Now Playing banner
                </p>
                <div style={{
                  padding: '12px',
                  background: 'rgba(30, 215, 96, 0.1)',
                  border: '1px solid rgba(30, 215, 96, 0.3)',
                  borderRadius: 8,
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>🎧</span>
                    <span style={{ fontWeight: 600, color: '#1ed760' }}>Spotify API Connected</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Spotify credentials are configured via environment variables:
                    <br/>
                    <code style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      marginTop: 4,
                      display: 'inline-block'
                    }}>
                      VITE_SPOTIFY_CLIENT_ID
                    </code>
                    {' and '}
                    <code style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11
                    }}>
                      VITE_SPOTIFY_CLIENT_SECRET
                    </code>
                  </div>
                </div>

                <FieldRow label="🎵 Now Playing Sync">
                  <button
                    onClick={() => {
                      const client = getSpotifyClient();

                      if (client.isAuthenticated()) {
                        if (confirm('Disconnect Spotify account?')) {
                          client.logout();
                          alert('Spotify account disconnected');
                        }
                      } else {
                        // Open OAuth flow in popup window
                        const authUrl = client.getAuthUrl();
                        const popup = window.open(authUrl, 'Spotify Authorization', 'width=500,height=700');

                        // Listen for OAuth callback
                        window.addEventListener('message', async (event) => {
                          if (event.data.type === 'spotify-auth-code') {
                            try {
                              await client.authorize(event.data.code);
                              alert('Spotify account connected! Now playing music will appear in the banner.');
                              popup?.close();
                            } catch (err) {
                              alert('Failed to connect Spotify: ' + err.message);
                            }
                          }
                        });
                      }
                    }}
                    style={{
                      ...s.button,
                      width: '100%',
                      background: getSpotifyClient().isAuthenticated() ? '#ef4444' : '#1ed760',
                      color: '#fff',
                    }}
                  >
                    {getSpotifyClient().isAuthenticated()
                      ? '🔌 Disconnect Spotify Account'
                      : '🔗 Connect Spotify Account'}
                  </button>
                </FieldRow>

                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Once connected, your currently playing Spotify track will automatically sync to the Now Playing banner.
                  The banner polls every 5 seconds for updates.
                </p>

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                <p style={{ ...s.muted, margin: '0', fontSize: 11 }}>
                  💡 The Spotify tab in the Jukebox allows searching millions of songs.
                  Preview clips (30 seconds) will be saved to your Media Library for playback.
                </p>
              </Card>

              <Card title="Audio Output Settings">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Configure how audio plays from the Jukebox
                </p>
                <FieldRow label="Audio Output">
                  <select
                    value={settings.audioOutputType || 'local'}
                    onChange={(e) => setSettings(s => ({ ...s, audioOutputType: e.target.value }))}
                    style={{
                      ...s.input,
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="local">Local Device (Browser)</option>
                    <option value="bluetooth">Bluetooth Device</option>
                    <option value="sonos">Sonos Speaker</option>
                    <option value="heos">HEOS Speaker</option>
                  </select>
                </FieldRow>

                {settings.audioOutputType === 'bluetooth' && (
                  <>
                    <FieldRow label="Bluetooth Discovery">
                      <button
                        onClick={async () => {
                          // Discover Bluetooth audio devices
                          try {
                            if (!navigator.bluetooth) {
                              alert('Bluetooth is not supported in this browser. Please pair via system settings.');
                              return;
                            }

                            const device = await navigator.bluetooth.requestDevice({
                              filters: [{ services: ['audio_sink'] }],
                              optionalServices: ['battery_service']
                            });

                            if (device) {
                              setSettings(s => ({
                                ...s,
                                bluetoothDeviceName: device.name,
                                bluetoothDeviceId: device.id,
                              }));
                              alert(`Found Bluetooth device: ${device.name}`);
                            }
                          } catch (err) {
                            console.error('Bluetooth discovery failed:', err);
                            if (err.name === 'NotFoundError') {
                              alert('No Bluetooth devices found. Make sure your speaker is in pairing mode.');
                            } else {
                              alert('Bluetooth discovery failed. You can still enter the device name manually.');
                            }
                          }
                        }}
                        style={{
                          ...s.button,
                          width: '100%',
                          background: '#8b5cf6',
                          color: '#fff',
                        }}
                      >
                        🔍 Discover Bluetooth Devices
                      </button>
                    </FieldRow>
                    <FieldRow label="Device Name">
                      <input
                        type="text"
                        value={settings.bluetoothDeviceName || ''}
                        onChange={(e) => setSettings(s => ({ ...s, bluetoothDeviceName: e.target.value }))}
                        placeholder="My Bluetooth Speaker"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                      Click "Discover Bluetooth Devices" to scan for available audio devices, or pair via system settings and enter name manually.
                    </p>
                  </>
                )}

                {settings.audioOutputType === 'sonos' && (
                  <>
                    <FieldRow label="Sonos Network Discovery">
                      <button
                        onClick={async () => {
                          // Discover Sonos devices on network
                          try {
                            const { getSonosClient } = await import('../lib/sonosClient');
                            const client = getSonosClient();
                            const devices = await client.discover();
                            if (devices.length > 0) {
                              setSettings(s => ({
                                ...s,
                                sonosIpAddress: devices[0].ip,
                                sonosRoomName: devices[0].name,
                              }));
                              alert(`Found Sonos device: ${devices[0].name} (${devices[0].ip})`);
                            } else {
                              alert('No Sonos devices found on network');
                            }
                          } catch (err) {
                            console.error('Sonos discovery failed:', err);
                            alert('Sonos discovery failed. Enter IP manually.');
                          }
                        }}
                        style={{
                          ...s.button,
                          width: '100%',
                          background: '#10b981',
                          color: '#fff',
                        }}
                      >
                        🔍 Discover Sonos Devices
                      </button>
                    </FieldRow>
                    <FieldRow label="IP Address">
                      <input
                        type="text"
                        value={settings.sonosIpAddress || ''}
                        onChange={(e) => setSettings(s => ({ ...s, sonosIpAddress: e.target.value }))}
                        placeholder="192.168.1.100"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Room Name">
                      <input
                        type="text"
                        value={settings.sonosRoomName || ''}
                        onChange={(e) => setSettings(s => ({ ...s, sonosRoomName: e.target.value }))}
                        placeholder="Living Room"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                      Click "Discover Sonos Devices" to auto-detect speakers on your network, or enter IP manually.
                    </p>
                  </>
                )}

                {settings.audioOutputType === 'heos' && (
                  <>
                    <FieldRow label="HEOS Network Discovery">
                      <button
                        onClick={async () => {
                          // Discover HEOS devices on network
                          try {
                            const response = await fetch('/api/heos/discover');
                            const devices = await response.json();
                            if (devices.length > 0) {
                              setSettings(s => ({
                                ...s,
                                heosHost: devices[0].ip,
                                heosPlayerId: devices[0].pid,
                              }));
                              alert(`Found HEOS device: ${devices[0].name} (${devices[0].ip})`);
                            } else {
                              alert('No HEOS devices found on network');
                            }
                          } catch (err) {
                            console.error('HEOS discovery failed:', err);
                            alert('HEOS discovery failed. Enter IP manually.');
                          }
                        }}
                        style={{
                          ...s.button,
                          width: '100%',
                          background: '#3b82f6',
                          color: '#fff',
                        }}
                      >
                        🔍 Discover HEOS Devices
                      </button>
                    </FieldRow>
                    <FieldRow label="HEOS Host IP">
                      <input
                        type="text"
                        value={settings.heosHost || ''}
                        onChange={(e) => setSettings(s => ({ ...s, heosHost: e.target.value }))}
                        placeholder="192.168.1.100"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <FieldRow label="Player ID">
                      <input
                        type="text"
                        value={settings.heosPlayerId || ''}
                        onChange={(e) => setSettings(s => ({ ...s, heosPlayerId: e.target.value }))}
                        placeholder="Auto-filled from discovery"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                      Click "Discover HEOS Devices" to auto-detect speakers on your network, or enter IP manually.
                    </p>
                  </>
                )}

                <FieldRow label="Jukebox Behavior">
                  <select
                    value={settings.jukeboxAutoPlay ? 'play' : 'queue'}
                    onChange={(e) => setSettings(s => ({ ...s, jukeboxAutoPlay: e.target.value === 'play' }))}
                    style={{
                      ...s.input,
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="play">Play Immediately & Close</option>
                    <option value="queue">Add to Queue</option>
                  </select>
                </FieldRow>
                <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                  Controls what happens when you select a track in the Jukebox
                </p>

                <FieldRow label="Now Playing Scroll Speed (Kiosk)" style={{ marginTop: 16 }}>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.nowPlayingScrollSpeedKiosk || 30}
                    onChange={(e) => setSettings(s => ({ ...s, nowPlayingScrollSpeedKiosk: parseInt(e.target.value) || 30 }))}
                    style={{ ...s.input, width: '80px' }}
                  />
                  <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                </FieldRow>

                <FieldRow label="Now Playing Scroll Speed (Mobile)">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.nowPlayingScrollSpeedMobile || 20}
                    onChange={(e) => setSettings(s => ({ ...s, nowPlayingScrollSpeedMobile: parseInt(e.target.value) || 20 }))}
                    style={{ ...s.input, width: '80px' }}
                  />
                  <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>seconds</span>
                </FieldRow>
                <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                  Banner scroll speed for currently playing music
                </p>
              </Card>

              <Card title="Voice & TTS Settings">
                <p style={{ ...s.muted, margin: '0 0 12px', fontSize: 12 }}>
                  Configure text-to-speech for voice assistant and phone calls
                </p>

                <FieldRow label="TTS Provider">
                  <select
                    value={settings.ttsProvider || 'browser'}
                    onChange={(e) => setSettings(s => ({ ...s, ttsProvider: e.target.value }))}
                    style={{
                      ...s.input,
                      width: '100%',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="browser">Browser (Built-in)</option>
                    <option value="elevenlabs">ElevenLabs</option>
                  </select>
                </FieldRow>

                {settings.ttsProvider === 'elevenlabs' && (
                  <>
                    <FieldRow label="ElevenLabs API Key">
                      <input
                        type="password"
                        value={settings.elevenlabsApiKey || ''}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsApiKey: e.target.value }))}
                        placeholder="sk_..."
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
                      Get your API key from <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>elevenlabs.io</a>
                    </p>

                    <FieldRow label="Voice ID (Kiosk)">
                      <input
                        type="text"
                        value={settings.elevenlabsVoiceId || ''}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsVoiceId: e.target.value }))}
                        placeholder="21m00Tcm4TlvDq8ikWAM (Rachel)"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
                      Find voice IDs in your <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>ElevenLabs Voice Library</a>
                    </p>

                    <FieldRow label="Voice ID (Phone)">
                      <input
                        type="text"
                        value={settings.elevenlabsPhoneVoiceId || ''}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsPhoneVoiceId: e.target.value }))}
                        placeholder="21m00Tcm4TlvDq8ikWAM (same as kiosk or different)"
                        style={{
                          ...s.input,
                          width: '100%',
                        }}
                      />
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
                      Use a different voice for phone calls if desired
                    </p>

                    <FieldRow label="Model">
                      <select
                        value={settings.elevenlabsModel || 'eleven_turbo_v2_5'}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsModel: e.target.value }))}
                        style={{
                          ...s.input,
                          width: '100%',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="eleven_turbo_v2_5">Turbo v2.5 (Fastest, Lowest Latency)</option>
                        <option value="eleven_turbo_v2">Turbo v2 (Fast)</option>
                        <option value="eleven_multilingual_v2">Multilingual v2 (Best Quality)</option>
                        <option value="eleven_monolingual_v1">Monolingual v1 (English Only)</option>
                      </select>
                    </FieldRow>

                    <FieldRow label="Stability">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.elevenlabsStability || 0.5}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsStability: parseFloat(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>{settings.elevenlabsStability || 0.5}</span>
                    </FieldRow>

                    <FieldRow label="Similarity Boost">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.elevenlabsSimilarity || 0.75}
                        onChange={(e) => setSettings(s => ({ ...s, elevenlabsSimilarity: parseFloat(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                      <span style={{ ...s.muted, fontSize: 12, marginLeft: 8 }}>{settings.elevenlabsSimilarity || 0.75}</span>
                    </FieldRow>
                    <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                      Stability: Higher = more consistent. Similarity: Higher = closer to original voice.
                    </p>
                  </>
                )}
              </Card>

              <Card title="Media Library">
                <p style={s.muted}>
                  Upload MP3 audio files for the jukebox. Files are stored in Supabase and played locally.
                </p>

                {/* Upload Section */}
                <div style={{ marginTop: 16 }}>
                  <input
                    type="file"
                    id="media-upload"
                    accept="audio/mpeg,audio/mp3,audio/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file type
                      if (!file.type.startsWith('audio/')) {
                        alert('Please select an audio file (MP3)');
                        return;
                      }

                      // Validate file size (max 25MB)
                      if (file.size > 25 * 1024 * 1024) {
                        alert('Audio file must be smaller than 25MB');
                        return;
                      }

                      try {
                        const title = prompt('Enter a title for this track:', file.name.replace(/\.[^/.]+$/, ''));
                        if (!title) return;

                        const artist = prompt('Enter the artist name (optional):', '');

                        await uploadMediaFile(file, { title, artist: artist || null });
                        e.target.value = ''; // Reset input
                      } catch (err) {
                        alert(`Failed to upload: ${err.message}`);
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('media-upload').click()}
                    style={{
                      ...btn.primary,
                      width: '100%',
                      marginBottom: 16,
                    }}
                    disabled={mediaUploading}
                  >
                    {mediaUploading ? 'Uploading...' : '🎵 Upload Audio File'}
                  </button>
                </div>

                {/* Loading State */}
                {mediaLoading && (
                  <p style={{ textAlign: 'center', color: '#888' }}>Loading media files...</p>
                )}

                {/* Media Files List */}
                {!mediaLoading && mediaFiles.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                    No media files yet. Upload your first track!
                  </p>
                )}

                {!mediaLoading && mediaFiles.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gap: 12,
                    marginTop: 16,
                  }}>
                    {mediaFiles.map((media) => (
                      <div
                        key={media.id}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 12,
                          padding: 16,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#f4f6f8', fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                              {media.title}
                            </div>
                            {media.artist && (
                              <div style={{ color: '#a7b0b8', fontSize: 13, marginBottom: 4 }}>
                                {media.artist}
                              </div>
                            )}
                            <div style={{ color: '#6b7280', fontSize: 12 }}>
                              {media.duration_seconds ? `${Math.floor(media.duration_seconds / 60)}:${String(media.duration_seconds % 60).padStart(2, '0')}` : 'Unknown duration'}
                              {' • '}
                              {(media.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete "${media.title}"?`)) {
                                try {
                                  await deleteMediaFile(media.id, media.storage_path);
                                } catch (err) {
                                  alert(`Failed to delete: ${err.message}`);
                                }
                              }
                            }}
                            style={{
                              ...btn.danger,
                              padding: '6px 12px',
                              fontSize: 12,
                              marginLeft: 12,
                            }}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Audio preview */}
                        <audio
                          controls
                          style={{
                            width: '100%',
                            height: 32,
                            marginTop: 8,
                          }}
                          preload="metadata"
                        >
                          <source src={media.url} type={media.mime_type} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'voice' && (
            <>
              <VoiceAgentTab />
              <div style={{ marginTop: 24 }}>
                <KioskVoiceTab />
              </div>
            </>
          )}

          {tab === 'vestaboard' && (
            <VestaboardTab settings={settings} setSettings={setSettings} />
          )}

          {tab === 'performance' && (
            <PerformanceTab
              settings={settings}
              onSave={async (updates) => {
                for (const [key, value] of Object.entries(updates)) {
                  await saveAdminSettings(key, value);
                }
              }}
            />
          )}

          {tab === 'marketplace' && (
            <div style={{ margin: '-30px', minHeight: '100%' }}>
              <MarketplaceAdmin />
            </div>
          )}
        </div>
      </div>
    </div>
      )}

      {/* Toast notification for webhook testing */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 10000,
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          borderRadius: 12,
          padding: '16px 20px',
          maxWidth: 400,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{toast.title}</div>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>{toast.text}</div>
        </div>
      )}
    </>
  )
}

/* --------------------------- Subcomponents --------------------------- */

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...tabStyles.base,
        ...(active ? tabStyles.active : {})
      }}
    >
      {children}
    </button>
  )
}

function SectionGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gap: 12,
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'
    }}>
      {children}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <section style={card.wrap}>
      <header style={card.head}>
        <h4 style={card.title}>{title}</h4>
      </header>
      <div style={card.body}>
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, children }) {
  return (
    <label style={field.row}>
      <div style={field.label}>{label}</div>
      <div style={field.control}>{children}</div>
    </label>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        ...toggle.base,
        ...(checked ? toggle.on : toggle.off)
      }}
    >
      <span style={toggle.knob(checked)} />
    </button>
  )
}

function NumberInput({ value, min, max, onChange }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inp.number}
    />
  )
}

function TextInput({ value, onChange, placeholder, style }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{...inp.number, ...style}}
    />
  )
}

function ModerationTable({ rows = [], selected, onToggle }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 420, border: '1px solid #2b3037', borderRadius: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
            <th style={t.th}></th>
            <th style={t.th}>Slug</th>
            <th style={t.th}>Note</th>
            <th style={t.th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSel = selected.has(r.id)
            return (
              <tr key={r.id} style={{ background: isSel ? 'rgba(56,189,248,0.08)' : 'transparent' }}>
                <td style={t.td}>
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => onToggle(r.id)}
                  />
                </td>
                <td style={t.tdMono}>{r.slug}</td>
                <td style={t.td}>{r.note}</td>
                <td style={t.td}>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            )
          })}
          {!rows.length && (
            <tr>
              <td colSpan={4} style={{ ...t.td, color: '#98a4af' }}>
                No pins in range.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------ Styles ------------------------------ */

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 6000,
    display: 'grid', placeItems: 'center',
    pointerEvents: 'auto'
  },
  backdrop: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)'
  },
  panel: {
    position: 'relative',
    width: 'min(980px, 92vw)',
    height: 'min(720px, 92vh)',   // ← fixed visual size so tabs don’t jump
    overflow: 'hidden',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(21,27,35,0.85), rgba(17,22,29,0.92))',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    color: '#e9eef3',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    flex: '0 0 auto',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))'
  },
  titleWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  badge: {
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 12,
    background: 'rgba(56,189,248,0.15)',
    border: '1px solid rgba(56,189,248,0.35)',
    color: '#aee6ff'
  },
  title: { margin: 0, fontSize: 18, letterSpacing: 0.2 },
  tabs: {
    flex: '0 0 auto',
    display: 'flex',
    gap: 6,
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(255,255,255,0.2) transparent',
    WebkitOverflowScrolling: 'touch'
  },
  body: {
    flex: '1 1 auto',            // ← fixed outer; this scrolls
    padding: 12,
    overflow: 'auto'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr auto',
    gap: 8,
    alignItems: 'center'
  },
  input: {
    padding: '8px 12px',
    background: '#0f1115',
    border: '1px solid #2a2f37',
    borderRadius: 6,
    color: '#f3f5f7',
    fontSize: 14,
  },
  muted: { color: '#a7b0b8', fontSize: 13, marginTop: 4 }
}

const tabStyles = {
  base: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#dfe7ee',
    cursor: 'pointer'
  },
  active: {
    background: 'rgba(56,189,248,0.14)',
    borderColor: 'rgba(56,189,248,0.5)',
    color: '#cfefff'
  }
}

const card = {
  wrap: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    background: 'rgba(0,0,0,0.18)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
  },
  head: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  title: { margin: 0, fontSize: 14, letterSpacing: 0.2, color: '#cbd6e1' },
  body: { padding: 12, display: 'grid', gap: 10 }
}

const field = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    alignItems: 'center'
  },
  label: { color: '#cbd6e1', fontSize: 13 },
  control: { display: 'flex', justifyContent: 'flex-end' }
}

const btn = {
  primary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(56,189,248,0.6)',
    background: 'linear-gradient(180deg, rgba(56,189,248,0.25), rgba(56,189,248,0.18))',
    color: '#dff6ff', cursor: 'pointer'
  },
  secondary: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(148,163,184,0.4)',
    background: 'rgba(148,163,184,0.12)',
    color: '#e9eef3', cursor: 'pointer'
  },
  ghost: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'transparent',
    color: '#cbd6e1', cursor: 'pointer'
  },
  danger: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(244,63,94,0.5)',
    background: 'rgba(244,63,94,0.12)',
    color: '#ffd9df', cursor: 'pointer'
  },
  dangerMini: {
    padding: '6px 8px',
    borderRadius: 8,
    border: '1px solid rgba(244,63,94,0.5)',
    background: 'rgba(244,63,94,0.12)',
    color: '#ffd9df', cursor: 'pointer'
  }
}

const inp = {
  number: {
    width: 120,
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  },
  text: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  },
  select: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    color: '#e9eef3'
  }
}

const t = {
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontWeight: 600,
    color: '#cbd6e1',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    position: 'sticky', top: 0, background: 'rgba(21,27,35,0.9)'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#e9eef3'
  },
  tdMono: {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#e9eef3',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
  }
}

const toggle = {
  base: {
    position: 'relative',
    width: 54, height: 30,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    cursor: 'pointer'
  },
  on: {
    background: 'rgba(56,189,248,0.25)',
    borderColor: 'rgba(56,189,248,0.7)'
  },
  off: {},
  knob: (checked) => ({
    position: 'absolute',
    top: 3, left: checked ? 28 : 3,
    width: 24, height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(180deg, #ffffff, #dbeafe)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
    transition: 'left 160ms ease'
  })
}
