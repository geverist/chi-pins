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

export default function AdminPanel({ open, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [tab, setTab] = useState('general')

  // Reset authentication and initial states when panel closes
  useEffect(() => {
    if (!open) {
      setAuthenticated(false)
      setInitialSettings(null)
      setInitialPopularSpots(null)
      setInitialNavSettings(null)
      setHasUnsavedChanges(false)
    }
  }, [open])

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

  // Admin settings hook (replaces local state)
  const { settings: adminSettingsFromHook, save: saveAdminSettings, DEFAULTS } = useAdminSettings()

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
        { label: 'Portillo\'s - River North', category: 'hotdog' },
        { label: 'Al\'s #1 Italian Beef - Little Italy', category: 'beef' },
      ]
    } catch { return [] }
  })

  // Track initial state to detect changes
  const [initialSettings, setInitialSettings] = useState(null)
  const [initialPopularSpots, setInitialPopularSpots] = useState(null)
  const [initialNavSettings, setInitialNavSettings] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Moderation – selected IDs for deletion
  const [pendingDeletes, setPendingDeletes] = useState(new Set())
  const [modLoading, setModLoading] = useState(false)
  const [modRows, setModRows] = useState([]) // live pins from supabase
  const [search, setSearch] = useState('')

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

      // POPULAR SPOTS: table "popular_spots" with columns {id, label, category, city?}
      const { data: pData, error: pErr } = await supabase
        .from('popular_spots')
        .select('id,label,category')
        .order('id', { ascending: true })

      if (!pErr && Array.isArray(pData)) {
        const rows = pData.map(({ id, label, category }) => ({ id, label, category }))
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

  // ---------- Persist helpers ----------
  const saveSupabase = useCallback(async () => {
    try {
      // Save settings using the hook
      await saveAdminSettings(settings)

      // Sync popular_spots:
      // For simplicity, replace entire set: delete then insert (transactional-like pattern)
      const { error: delErr } = await supabase.from('popular_spots').delete().neq('id', -1)
      if (delErr) throw delErr

      if (popularSpots.length) {
        const payload = popularSpots.map((r) => ({
          label: r.label || '',
          category: r.category || 'other',
        }))
        const { error: insErr } = await supabase.from('popular_spots').insert(payload)
        if (insErr) throw insErr
      }

      // Save popular spots to localStorage
      localStorage.setItem('adminPopularSpots', JSON.stringify(popularSpots))

      // Save navigation settings - ensure all fields are present and boolean
      const completeNavSettings = {
        games_enabled: Boolean(navSettings.games_enabled),
        jukebox_enabled: Boolean(navSettings.jukebox_enabled),
        order_enabled: Boolean(navSettings.order_enabled),
        explore_enabled: Boolean(navSettings.explore_enabled),
        photobooth_enabled: Boolean(navSettings.photobooth_enabled),
        thenandnow_enabled: Boolean(navSettings.thenandnow_enabled),
        comments_enabled: Boolean(navSettings.comments_enabled),
      }
      console.log('[AdminPanel] Saving navigation settings:', completeNavSettings)
      await updateNavSettingsAPI(completeNavSettings)
    } catch (e) {
      // Let local save still happen; surface a gentle message
      console.warn('Supabase save failed; falling back to local only.', e)
      return false
    }
    return true
  }, [settings, popularSpots, navSettings, saveAdminSettings, updateNavSettingsAPI])

  const saveAndClose = async () => {
    // Validate PINs before saving
    const adminPin = String(settings.adminPanelPin || '1111').replace(/\D/g, '').slice(0, 4)
    const kioskPin = String(settings.kioskExitPin || '1111').replace(/\D/g, '').slice(0, 4)

    if (adminPin.length !== 4 || kioskPin.length !== 4) {
      alert('PINs must be exactly 4 digits')
      return
    }

    // Ensure PINs are saved as 4-digit strings
    const validatedSettings = {
      ...settings,
      adminPanelPin: adminPin.padStart(4, '0'),
      kioskExitPin: kioskPin.padStart(4, '0'),
    }

    setSettings(validatedSettings)
    await saveSupabase()
    setInitialSettings(validatedSettings)
    setInitialPopularSpots(popularSpots)
    setInitialNavSettings(navSettings)
    setHasUnsavedChanges(false)
    onClose?.()
  }

  // Popular spots CRUD
  const addSpot = () => setPopularSpots((s) => [...s, { label: '', category: 'hotdog' }])
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
          <div style={s.panel}>
        {/* Fixed header */}
        <div style={s.header}>
          <div style={s.titleWrap}>
            <span style={s.badge}>Admin</span>
            <h3 style={s.title}>Control Panel</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...btn.primary, opacity: hasUnsavedChanges ? 1 : 0.5 }}
              onClick={saveAndClose}
              disabled={!hasUnsavedChanges}
              title={hasUnsavedChanges ? "Save changes and close" : "No changes to save"}
            >
              {hasUnsavedChanges ? '💾 Save & Close' : '✓ Saved'}
            </button>
            <button style={btn.ghost} onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Fixed tabs bar */}
        <div style={s.tabs}>
          <TabBtn active={tab === 'general'} onClick={() => setTab('general')}>General</TabBtn>
          <TabBtn active={tab === 'display'} onClick={() => setTab('display')}>Display</TabBtn>
          <TabBtn active={tab === 'games'} onClick={() => setTab('games')}>Games</TabBtn>
          <TabBtn active={tab === 'branding'} onClick={() => setTab('branding')}>Branding</TabBtn>
          <TabBtn active={tab === 'navigation'} onClick={() => setTab('navigation')}>Navigation</TabBtn>
          <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>Popular Spots</TabBtn>
          <TabBtn active={tab === 'thenandnow'} onClick={() => setTab('thenandnow')}>Then & Now</TabBtn>
          <TabBtn active={tab === 'clusters'} onClick={() => setTab('clusters')}>Kiosk Clusters</TabBtn>
          <TabBtn active={tab === 'notifications'} onClick={() => setTab('notifications')}>Notifications</TabBtn>
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')}>Analytics</TabBtn>
          <TabBtn active={tab === 'backgrounds'} onClick={() => setTab('backgrounds')}>Backgrounds</TabBtn>
          <TabBtn active={tab === 'media'} onClick={() => setTab('media')}>Media</TabBtn>
          <TabBtn active={tab === 'voice'} onClick={() => setTab('voice')}>Voice Agent</TabBtn>
          <TabBtn active={tab === 'kioskvoice'} onClick={() => setTab('kioskvoice')}>Kiosk Voice</TabBtn>
          <TabBtn active={tab === 'moderate'} onClick={() => setTab('moderate')}>Moderation</TabBtn>
        </div>

        {/* Scrollable body (consistent size across tabs) */}
        <div style={s.body}>
          {tab === 'general' && (
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
                <FieldRow label="Vestaboard notifications">
                  <Toggle
                    checked={settings.vestaboardEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, vestaboardEnabled: v }))}
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

          {tab === 'display' && (
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

          {tab === 'navigation' && (
            <SectionGrid>
              <Card title="Footer Navigation Items">
                <p style={s.muted}>
                  Control which navigation items appear in the footer. If only one item is enabled, the footer will hide icons.
                </p>

                <FieldRow label="🎮 Games">
                  <Toggle
                    checked={navSettings.games_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, games_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🎵 Jukebox">
                  <Toggle
                    checked={navSettings.jukebox_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, jukebox_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🍕 Order Now">
                  <Toggle
                    checked={navSettings.order_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, order_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🔎 Explore">
                  <Toggle
                    checked={navSettings.explore_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, explore_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="📸 Photo Booth">
                  <Toggle
                    checked={navSettings.photobooth_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, photobooth_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🏛️ Then & Now">
                  <Toggle
                    checked={navSettings.thenandnow_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, thenandnow_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="💬 Leave Feedback">
                  <Toggle
                    checked={navSettings.comments_enabled}
                    onChange={async (v) => {
                      const updated = { ...navSettings, comments_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🗺️ Local Recommendations">
                  <Toggle
                    checked={navSettings.recommendations_enabled || false}
                    onChange={async (v) => {
                      const updated = { ...navSettings, recommendations_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="📋 Appointment Check-In">
                  <Toggle
                    checked={navSettings.appointment_checkin_enabled || false}
                    onChange={async (v) => {
                      const updated = { ...navSettings, appointment_checkin_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="🍽️ Reservation Check-In">
                  <Toggle
                    checked={navSettings.reservation_checkin_enabled || false}
                    onChange={async (v) => {
                      const updated = { ...navSettings, reservation_checkin_enabled: v };
                      setNavSettings(updated);
                      await updateNavSettingsAPI(updated);
                    }}
                  />
                </FieldRow>

                <FieldRow label="📖 Guest Book">
                  <Toggle
                    checked={navSettings.guestbook_enabled || false}
                    onChange={async (v) => {
                      const updated = { ...navSettings, guestbook_enabled: v };
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
                      const updated = { ...navSettings, default_navigation_app: e.target.value };
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
                    {navSettings.appointment_checkin_enabled && <option value="appointment">📋 Appointment Check-In</option>}
                    {navSettings.reservation_checkin_enabled && <option value="reservation">🍽️ Reservation Check-In</option>}
                    {navSettings.guestbook_enabled && <option value="guestbook">📖 Guest Book</option>}
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
            </SectionGrid>
          )}

          {tab === 'notifications' && (
            <SectionGrid>
              <Card title="Twilio Configuration">
                <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                  Configure Twilio for SMS notifications
                </p>

                <FieldRow label="Enable Twilio">
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

                    <p style={{ ...s.muted, margin: '12px 0 0', fontSize: 11 }}>
                      Get your Twilio credentials from <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>console.twilio.com</a>
                    </p>
                  </>
                )}
              </Card>

              {settings.notificationsEnabled && (
                <Card title="Notification Settings">
                  <p style={{ ...s.muted, margin: '0 0 16px', fontSize: 12 }}>
                    Get notified about activity on your kiosk
                  </p>

                  <FieldRow label="Notify Me About">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.notifyOnPinPlacement !== false}
                          onChange={(e) => setSettings(s => ({ ...s, notifyOnPinPlacement: e.target.checked }))}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, color: '#e2e8f0' }}>New pin placements</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.notifyOnFeedback !== false}
                          onChange={(e) => setSettings(s => ({ ...s, notifyOnFeedback: e.target.checked }))}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, color: '#e2e8f0' }}>Customer feedback</span>
                      </label>
                    </div>
                  </FieldRow>

                  <FieldRow label="Notification Method">
                    <select
                      value={settings.notificationType || 'sms'}
                      onChange={(e) => setSettings(s => ({ ...s, notificationType: e.target.value }))}
                      style={s.input}
                    >
                      <option value="sms">SMS Only</option>
                      <option value="email">Email Only</option>
                      <option value="both">Both SMS & Email</option>
                      <option value="webhook">Webhook Only</option>
                      <option value="all">All Methods</option>
                    </select>
                  </FieldRow>

                  {(settings.notificationType === 'webhook' || settings.notificationType === 'all') && (
                    <>
                      <FieldRow label="Webhook URL">
                        <input
                          type="url"
                          value={settings.webhookUrl || ''}
                          onChange={(e) => setSettings(s => ({ ...s, webhookUrl: e.target.value }))}
                          placeholder="https://hooks.zapier.com/hooks/catch/..."
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>
                      <p style={{ ...s.muted, margin: '4px 0 16px', fontSize: 11 }}>
                        Sends JSON POST with event details. Works with Zapier, Make.com, n8n, etc.
                      </p>
                    </>
                  )}

                  {(settings.notificationType === 'sms' || settings.notificationType === 'both' || settings.notificationType === 'all') && (
                    <>
                      <FieldRow label="SMS Recipients">
                        <input
                          type="text"
                          value={settings.notificationRecipients || ''}
                          onChange={(e) => setSettings(s => ({ ...s, notificationRecipients: e.target.value }))}
                          placeholder="+1234567890, +0987654321"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <p style={{ ...s.muted, margin: '4px 0 12px', fontSize: 11 }}>
                        Comma-separated phone numbers (include country code, e.g. +1)
                      </p>
                    </>
                  )}

                  {(settings.notificationType === 'email' || settings.notificationType === 'both' || settings.notificationType === 'all') && (
                    <>
                      <FieldRow label="Email Recipients">
                        <input
                          type="text"
                          value={settings.emailRecipients || ''}
                          onChange={(e) => setSettings(s => ({ ...s, emailRecipients: e.target.value }))}
                          placeholder="owner@business.com, manager@business.com"
                          style={{ ...s.input, width: '100%' }}
                        />
                      </FieldRow>

                      <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                        Comma-separated email addresses
                      </p>
                    </>
                  )}

                  <FieldRow label="Anonymous Message Rate Limit">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.maxAnonymousMessagesPerDay || 5}
                        onChange={(e) => setSettings(s => ({ ...s, maxAnonymousMessagesPerDay: parseInt(e.target.value) || 5 }))}
                        style={{ ...s.input, width: '80px' }}
                      />
                      <span style={{ fontSize: 13, color: '#a7b0b8' }}>messages per pin per day</span>
                    </div>
                  </FieldRow>
                  <p style={{ ...s.muted, margin: '4px 0 0', fontSize: 11 }}>
                    Limits how many anonymous messages a single pin can receive per day to prevent spam
                  </p>
                </Card>
              )}
            </SectionGrid>
          )}

          {tab === 'content' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Popular spots (shown on Chicago map)">
                <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto', paddingRight: 2 }}>
                  {popularSpots.map((row, i) => (
                    <div key={row.id ?? i} style={s.row}>
                      <select
                        value={row.category}
                        onChange={(e) => updateSpot(i, { category: e.target.value })}
                        style={inp.select}
                      >
                        <option value="hotdog">Hot Dog</option>
                        <option value="beef">Italian Beef</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        style={inp.text}
                        value={row.label}
                        placeholder="Display label"
                        onChange={(e) => updateSpot(i, { label: e.target.value })}
                      />
                      <button style={btn.dangerMini} onClick={() => removeSpot(i)}>Remove</button>
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

          {tab === 'clusters' && (
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

          {tab === 'analytics' && (
            <div style={{ padding: '0 4px' }}>
              <AnalyticsDashboard />
            </div>
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
                  Search and play music from Spotify's catalog
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
                    <span style={{ fontWeight: 600, color: '#1ed760' }}>Spotify Connected</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    Spotify credentials are configured via Vercel environment variables:
                    <br/>
                    <code style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      marginTop: 4,
                      display: 'inline-block'
                    }}>
                      SPOTIFY_CLIENT_ID
                    </code>
                    {' and '}
                    <code style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11
                    }}>
                      SPOTIFY_CLIENT_SECRET
                    </code>
                  </div>
                </div>
                <p style={{ ...s.muted, margin: '0', fontSize: 11 }}>
                  The Spotify tab in the Jukebox allows searching millions of songs.
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
                  </select>
                </FieldRow>

                {settings.audioOutputType === 'bluetooth' && (
                  <>
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
                      Note: Bluetooth pairing must be done through your device's system settings first
                    </p>
                  </>
                )}

                {settings.audioOutputType === 'sonos' && (
                  <>
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
                    <p style={{ ...s.muted, margin: '8px 0 0', fontSize: 11 }}>
                      Requires Sonos HTTP API running on the network
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

          {tab === 'voice' && <VoiceAgentTab />}

          {tab === 'kioskvoice' && <KioskVoiceTab />}
        </div>
      </div>
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
