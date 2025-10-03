// src/components/AdminPanel.jsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useBackgroundImages } from '../hooks/useBackgroundImages'
import { useNavigationSettings } from '../hooks/useNavigationSettings'
import { useLogo } from '../hooks/useLogo'

export default function AdminPanel({ open, onClose }) {
  const [tab, setTab] = useState('general')

  // Background images hook
  const { backgrounds, loading: bgLoading, addBackground, deleteBackground } = useBackgroundImages()

  // Navigation settings hook
  const { settings: navSettings, updateSettings: updateNavSettings } = useNavigationSettings()

  // Logo hook
  const { logoUrl, loading: logoLoading, uploadLogo, deleteLogo } = useLogo()

  // ---------- Defaults (kept same) ----------
  const defaultSettings = {
    // Kiosk behavior
    idleAttractorSeconds: 60,
    kioskAutoStart: true,
    attractorHintEnabled: true,

    // Map display
    minZoomForPins: 13,
    maxZoom: 17,
    clusterBubbleThreshold: 13,
    showLabelsZoom: 13,
    lowZoomVisualization: 'bubbles', // 'bubbles' | 'heatmap'
    labelStyle: 'pill', // 'pill' | 'clean'

    // Feature idle timeouts (seconds)
    gamesIdleTimeout: 180,      // 3 minutes
    jukeboxIdleTimeout: 120,    // 2 minutes
    orderingIdleTimeout: 300,   // 5 minutes

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

    // Restaurant Info (for share modal)
    restaurantName: 'Chicago Mike\'s',
    restaurantYelpUrl: '',
    restaurantGoogleUrl: '',
    restaurantWebsiteUrl: '',

    // Map constants (rarely changed)
    initialRadiusMiles: 0.5,
    chiMinZoom: 10,
  }

  // ---------- State ----------
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('adminSettings')
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings
    } catch {
      return defaultSettings
    }
  })

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Moderation – selected IDs for deletion
  const [pendingDeletes, setPendingDeletes] = useState(new Set())
  const [modLoading, setModLoading] = useState(false)
  const [modRows, setModRows] = useState([]) // live pins from supabase
  const [search, setSearch] = useState('')

  // ---------- Load from Supabase when panel opens ----------
  const loadFromSupabase = useCallback(async () => {
    if (!open) return
    try {
      // SETTINGS: table "settings" with key='app', value=jsonb
      const { data: sData, error: sErr } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'app')
        .maybeSingle()

      if (!sErr && sData?.value) {
        // Merge unknown keys so we can roll forward/back
        const merged = { ...defaultSettings, ...sData.value }
        setSettings(merged)
        setInitialSettings(merged)
        localStorage.setItem('adminSettings', JSON.stringify(merged))
      } else {
        setInitialSettings(settings)
      }

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

      setHasUnsavedChanges(false)
    } catch {
      // ignore – fallback to localStorage is already set
      setInitialSettings(settings)
      setInitialPopularSpots(popularSpots)
    }
  }, [open])

  useEffect(() => { if (open) loadFromSupabase() }, [open, loadFromSupabase])

  // Detect changes
  useEffect(() => {
    if (!initialSettings || !initialPopularSpots) return

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings)
    const spotsChanged = JSON.stringify(popularSpots) !== JSON.stringify(initialPopularSpots)

    setHasUnsavedChanges(settingsChanged || spotsChanged)
  }, [settings, popularSpots, initialSettings, initialPopularSpots])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // ---------- Persist helpers ----------
  const saveLocal = () => {
    localStorage.setItem('adminSettings', JSON.stringify(settings))
    localStorage.setItem('adminPopularSpots', JSON.stringify(popularSpots))
  }

  const saveSupabase = useCallback(async () => {
    try {
      // Upsert settings table (key='app')
      await supabase
        .from('settings')
        .upsert({ key: 'app', value: settings }, { onConflict: 'key' })

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
    } catch (e) {
      // Let local save still happen; surface a gentle message
      console.warn('Supabase save failed; falling back to local only.', e)
      return false
    }
    return true
  }, [settings, popularSpots])

  const saveAndClose = async () => {
    saveLocal()
    await saveSupabase()
    setInitialSettings(settings)
    setInitialPopularSpots(popularSpots)
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
          <TabBtn active={tab === 'branding'} onClick={() => setTab('branding')}>Branding</TabBtn>
          <TabBtn active={tab === 'navigation'} onClick={() => setTab('navigation')}>Navigation</TabBtn>
          <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>Popular Spots</TabBtn>
          <TabBtn active={tab === 'backgrounds'} onClick={() => setTab('backgrounds')}>Backgrounds</TabBtn>
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
              </Card>

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
                      try {
                        await updateNavSettings({ ...navSettings, games_enabled: v });
                      } catch (err) {
                        alert('Failed to update navigation settings');
                      }
                    }}
                  />
                </FieldRow>

                <FieldRow label="🎵 Jukebox">
                  <Toggle
                    checked={navSettings.jukebox_enabled}
                    onChange={async (v) => {
                      try {
                        await updateNavSettings({ ...navSettings, jukebox_enabled: v });
                      } catch (err) {
                        alert('Failed to update navigation settings');
                      }
                    }}
                  />
                </FieldRow>

                <FieldRow label="🍕 Order Now">
                  <Toggle
                    checked={navSettings.order_enabled}
                    onChange={async (v) => {
                      try {
                        await updateNavSettings({ ...navSettings, order_enabled: v });
                      } catch (err) {
                        alert('Failed to update navigation settings');
                      }
                    }}
                  />
                </FieldRow>

                <FieldRow label="🔎 Explore">
                  <Toggle
                    checked={navSettings.explore_enabled}
                    onChange={async (v) => {
                      try {
                        await updateNavSettings({ ...navSettings, explore_enabled: v });
                      } catch (err) {
                        alert('Failed to update navigation settings');
                      }
                    }}
                  />
                </FieldRow>
              </Card>
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
        </div>
      </div>
    </div>
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
    display: 'flex', gap: 6, padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
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
