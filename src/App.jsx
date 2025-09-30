// src/App.jsx
import { useMemo, useRef, useState, useEffect } from 'react'
import logoUrl from './assets/logo.png'
import { supabase } from './lib/supabase'

// hooks
import { usePins } from './hooks/usePins'
import { useIdleAttractor } from './hooks/useIdleAttractor'
import { useFunFacts } from './hooks/useFunFacts'
import { useHighlightPin } from './hooks/useHighlightPin'

// geo / map helpers
import { continentFor, countByContinent } from './lib/geo'
import {
  CHI,
  INITIAL_RADIUS_MILES,
  enableMainMapInteractions,
  disableMainMapInteractions
} from './lib/mapUtils'
import { focusDraft, goToChicago } from './lib/mapActions'

// pin helpers
import { ensureUniqueSlug, makeChiSlug } from './lib/pinsUtils'
import { postToFacebook } from './lib/facebookShare'

// components
import HeaderBar from './components/HeaderBar'
import TeamCount from './components/TeamCount'
import MapShell from './components/MapShell'
import SavedPins from './components/SavedPins'
import DraftMarker from './components/DraftMarker'
import SubMapModal from './components/SubMapModal'
import ShareConfirmModal from './components/ShareConfirmModal'
import PopularSpotsOverlay from './components/PopularSpotsOverlay'
import Editor from './components/Editor'
import Toast from './components/Toast'
import AttractorOverlay from './components/AttractorOverlay'
import GlobalCounters from './components/GlobalCounters'

// clustering helpers
import PinBubbles from './components/PinBubbles'
import ZoomGate from './components/ZoomGate'
import HeatmapOverlay from './components/HeatmapOverlay' // NEW

// Admin panel
import AdminPanel from './components/AdminPanel'

/* ---------------- KIOSK HELPERS ---------------- */
async function enterFullscreen(el) {
  const root = el || (typeof document !== 'undefined' ? document.documentElement : null)
  if (root && !document.fullscreenElement && root.requestFullscreen) {
    try { await root.requestFullscreen() } catch {}
  }
}
let wakeLockRef = null
async function ensureWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef) {
      wakeLockRef = await navigator.wakeLock.request('screen')
      wakeLockRef.addEventListener?.('release', () => { wakeLockRef = null })
    }
  } catch {/* ignore */}
}
async function exitFullscreenAndWake() {
  try { await document.exitFullscreen?.() } catch {}
  try { await wakeLockRef?.release?.() } catch {}
  wakeLockRef = null
}
function onFullscreenChange(cb) {
  const handler = () => cb?.(!!document.fullscreenElement)
  document.addEventListener('fullscreenchange', handler)
  return () => document.removeEventListener('fullscreenchange', handler)
}
function KioskStartOverlay({ visible, onStart }) {
  if (!visible) return null
  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:5000,
        display:'grid', placeItems:'center',
        background:'rgba(0,0,0,0.6)'
      }}
      className="kiosk-overlay"
    >
      <button onClick={onStart} className="btn-toggle" style={{ fontSize:18, padding:'16px 22px' }}>
        Start Kiosk
      </button>
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

function normalizePhoneToE164ish(raw) {
  if (!raw) return null
  const digits = String(raw).replace(/\D+/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  return null
}

/* ------------------------------------------------------------------------ */
const online = useOnline()

const DEFAULT_FUN_FACTS = {
  chicago: "Home of the first skyscraper (1885) and deep-dish pizza debates.",
  evanston: "Evanston once had over 100 churches—hence the old nickname “Heavenston.”",
  oakpark: "Frank Lloyd Wright designed dozens of buildings here.",
  cicero: "Once Al Capone’s base of operations in the 1920s.",
  skokie: "Hosts the Illinois Holocaust Museum & Education Center.",
  schaumburg: "Woodfield Mall was one of the largest in the U.S. for decades.",
  naperville: "Its Riverwalk was built to celebrate the city’s 150th anniversary.",
  aurora: "Second-largest city in Illinois and an early adopter of electric streetlights.",
  joliet: "Famous for the Old Joliet Prison (yes, the Blues Brothers one!).",
  waukegan: "Ray Bradbury’s hometown; see the annual Ray Bradbury Days."
}

export default function App() {
  const mainMapRef = useRef(null)

  // data
  const { pins, setPins, hotdogSuggestions } = usePins()

  // map mode
  const [mapMode, setMapMode] = useState('chicago') // 'chicago' | 'global'

  // fun facts (DB-backed with fallback)
  const funFacts = useFunFacts(DEFAULT_FUN_FACTS)

  // draft pin
  const [draft, setDraft] = useState(null) // {lat,lng}
  const [slug, setSlug] = useState(null)
  const [tipToken, setTipToken] = useState(0)

  // sub-map modal state
  const [submapCenter, setSubmapCenter] = useState(null)
  const [handoff, setHandoff] = useState(null)
  const [submapBaseZoom, setSubmapBaseZoom] = useState(null)

  // UI state
  const [toast, setToast] = useState(null)
  const [exploring, setExploring] = useState(false)

  // share modal
  const [shareOpen, setShareOpen] = useState(false)
  const [shareToFb, setShareToFb] = useState(false)

  // layer toggles
  const [showPopularSpots, setShowPopularSpots] = useState(true)
  const [showCommunityPins, setShowCommunityPins] = useState(true)

  // highlight
  const [highlightSlug, setHighlightSlug] = useState(null)
  const { trigger: triggerHighlight, clear: clearHighlight } = useHighlightPin(setHighlightSlug)

  // editor form
  const [form, setForm] = useState({
    team: 'cubs',
    name: '',
    neighborhood: '',
    hotdog: '',
    note: ''
  })

  // NEW: Admin settings watcher (for cluster mode + heatmap params)
  const [adminSettings, setAdminSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminSettings')) || {} } catch { return {} }
  })
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'adminSettings') {
        try { setAdminSettings(JSON.parse(e.newValue || '{}') || {}) } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const clusterMode = adminSettings?.clusterMode || 'bubbles'
  const heatCfg = adminSettings?.heatmap || {}

  /* ---------------- KIOSK STATE ---------------- */
  const [needsKioskStart, setNeedsKioskStart] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  )
  const autoKiosk = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('kiosk') === '1'
    : false

  useEffect(() => {
    if (typeof document === 'undefined') return
    const off = onFullscreenChange(setIsFullscreen)
    ;(async () => {
      if (autoKiosk) {
        await enterFullscreen()
        await ensureWakeLock()
        setNeedsKioskStart(!document.fullscreenElement)
      } else {
        setNeedsKioskStart(false)
      }
    })()
    return () => off?.()
  }, [autoKiosk])

  const startKioskNow = async () => {
    await enterFullscreen()
    await ensureWakeLock()
    setNeedsKioskStart(false)
  }
  const exitKioskNow = async () => {
    await exitFullscreenAndWake()
    setNeedsKioskStart(false)
  }
  /* ---------------------------------------------------------------------- */

  /* ------------------ DEDUPE PINS (avoid double render) ------------------ */
  const pinsDeduped = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const p of pins || []) {
      const k = p?.id ?? p?.slug ?? `${p?.lat},${p?.lng}`
      if (k && seen.has(k)) continue
      if (k) seen.add(k)
      out.push(p)
    }
    return out
  }, [pins])

  // continent counters for Global header chips (use deduped)
  const continentCounts = useMemo(() => countByContinent(pinsDeduped), [pinsDeduped])

  // Render-only mapping: color global pins by continent (use deduped)
  const pinsForRender = useMemo(() => {
    return (pinsDeduped || []).map(p => {
      if (p?.source === 'global') {
        const cont = p?.continent || (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)
          ? continentFor(p.lat, p.lng)
          : null)
        return { ...p, team: cont || p.team || 'other' }
      }
      return p
    })
  }, [pinsDeduped])

  // idle attractor
  const { showAttractor, setShowAttractor } = useIdleAttractor({
    deps: [mapMode],
    mainMapRef,
    draft,
    submapOpen: !!submapCenter,
    exploring,
    timeoutMs: 60 * 1000,
    onIdle: () => { cancelEditing() },
  })

  // cancel helper
  const cancelEditing = () => {
    enableMainMapInteractions(mainMapRef.current)
    setDraft(null)
    setSlug(null)
    setSubmapCenter(null)
    setHandoff(null)
    setSubmapBaseZoom(null)
    setShareOpen(false)
    setShareToFb(false)
    setExploring(false)
    clearHighlight()
    setMapMode('chicago')
    goToChicago(mainMapRef.current)
    setForm(f => ({ ...f, name:'', neighborhood:'', hotdog:'', note:'' }))
  }

  // fun-fact toast
  async function showNearestTownFact(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const json = await res.json()
      const addr = json?.address || {}
      const candidate =
        addr.city || addr.town || addr.village || addr.suburb || addr.locality || 'Chicago'
      const key = String(candidate).toLowerCase()
      const fact = funFacts[key] || `You’re near ${candidate}.`
      setToast({ title: candidate, text: fact })
      setTimeout(() => setToast(null), 10000)
    } catch {}
  }

  // map click
  const handlePick = async (ll) => {
    focusDraft(mainMapRef.current, ll, INITIAL_RADIUS_MILES)
    setDraft(ll)

    if (mapMode === 'chicago') {
      showNearestTownFact(ll.lat, ll.lng)
    }

    if (!slug) {
      const fresh = await ensureUniqueSlug(makeChiSlug())
      setSlug(fresh)
    }
    setExploring(false)
    setShowAttractor(false)
  }

  // save
  async function savePin() {
    if (!draft || !slug) return
    const isChicago = mapMode === 'chicago'
    const cont = continentFor(draft.lat, draft.lng)

    // loyalty derived from the phone itself (no checkbox)
    const loyaltyPhoneNormalized = normalizePhoneToE164ish(form?.loyaltyPhone)
    const loyaltyOptIn = !!loyaltyPhoneNormalized

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
      // NEW fields (nullable)
      loyalty_phone: loyaltyPhoneNormalized,
      loyalty_opt_in: loyaltyOptIn,
    }

    const { data, error } = await supabase.from('pins').insert([rec]).select()
    if (error) { alert('Could not save.'); return }
    const inserted = data?.[0] || rec

    setPins(p => [inserted, ...p])

    if (shareToFb && rec.note) {
      postToFacebook({
        lat: rec.lat,
        lng: rec.lng,
        note: rec.note,
        source: rec.source,
        slug: rec.slug
      })
    }

    setShowCommunityPins(true)
    cancelEditing()

    if (isChicago) {
      triggerHighlight(inserted.slug, 350) // temporary details popup behavior
    } else {
      clearHighlight()
    }

    setTipToken(t => t + 1)
  }

  /* ---------------- Fine-tune modal ---------------- */
  const openSubmap = (center, pointer) => {
    const live = mainMapRef.current?.getCenter?.()
    const safeCenter =
      (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) ? center :
      (live && Number.isFinite(live.lat) && Number.isFinite(live.lng)) ? { lat: live.lat, lng: live.lng } :
      CHI

    const z = mainMapRef.current?.getZoom?.() ?? null
    disableMainMapInteractions(mainMapRef.current)
    setSubmapBaseZoom(z)
    setSubmapCenter(safeCenter)
    setHandoff(pointer)
  }

  const closeSubmap = () => {
    enableMainMapInteractions(mainMapRef.current)
    setTimeout(() => mainMapRef.current?.invalidateSize(), 0)
    setSubmapCenter(null)
    setHandoff(null)
    setSubmapBaseZoom(null)
  }

  // mode switches
  const goGlobal = () => {
    setMapMode('global')
    setDraft(null); setSlug(null); setSubmapCenter(null); setHandoff(null)
    setSubmapBaseZoom(null)
    setShowAttractor(false); setExploring(false)
    setToast(null)
  }

  const goChicagoZoomedOut = () => {
    const needsReset = !!(draft || submapCenter || shareOpen)
    if (needsReset) {
      cancelEditing()
      setTimeout(() => {
        setShowAttractor(true)
        goToChicago(mainMapRef.current)
      }, 0)
      return
    }
    setMapMode('chicago')
    setShowAttractor(true)
    setExploring(false)
    goToChicago(mainMapRef.current)
  }

  // button style helper
  const btn3d = (pressed) => ({
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #2a2f37',
    background: pressed
      ? 'linear-gradient(#242a33, #1a1f26)'
      : 'linear-gradient(#1f242b, #171b20)',
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
  })

  const headerRight =
    mapMode === 'chicago'
      ? (
        <div style={{display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
          <TeamCount pins={pinsDeduped} />
          <button
            type="button"
            aria-pressed={showPopularSpots}
            onClick={() => setShowPopularSpots(v => !v)}
            style={btn3d(showPopularSpots)}
          >
            🌟 {showPopularSpots ? 'Popular spots ON' : 'Popular spots OFF'}
          </button>
          <button
            type="button"
            aria-pressed={showCommunityPins}
            onClick={() => setShowCommunityPins(v => !v)}
            style={btn3d(showCommunityPins)}
          >
            📍 {showCommunityPins ? 'Hide pins' : 'Show pins'}
          </button>

          {/* Kiosk toggle */}
          {!isFullscreen ? (
            <button
              type="button"
              onClick={startKioskNow}
              style={btn3d(false)}
              title="Enter fullscreen & keep screen awake"
            >
              🖥️ Enter Kiosk Mode
            </button>
          ) : (
            <button
              type="button"
              onClick={exitKioskNow}
              style={btn3d(true)}
              title="Exit fullscreen and release wake lock"
            >
              ⤴️ Exit Kiosk Mode
            </button>
          )}
        </div>
      )
      : (
        <GlobalCounters counts={continentCounts} />
      )

  /* ---------------- Admin (hidden) ---------------- */
  const [adminOpen, setAdminOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1'
  )
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)

  // Friendlier: count taps anywhere in the footer that's not an interactive element
  const shouldCountTap = (e) => {
    const target = e.target
    if (!target) return false
    if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-admin-tap]')) {
      return false
    }
    return true
  }

  const registerTap = () => {
    if (!tapTimerRef.current) {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
        tapTimerRef.current = null
      }, 5000)
    }
    tapCountRef.current += 1
    if (tapCountRef.current >= 3) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      tapCountRef.current = 0
      setAdminOpen(true)
    }
  }

  const handleFooterClick = (e) => { if (shouldCountTap(e)) registerTap() }
  const handleFooterTouch = (e) => { if (shouldCountTap(e)) registerTap() }

  useEffect(() => {
    return () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current) }
  }, [])
  /* ------------------------------------------------ */

  return (
    <div className="app">
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


      <div className="map-wrap" style={{ position:'relative', flex:1, minHeight:'60vh', borderTop:'1px solid #222', borderBottom:'1px solid #222' }}>
        <MapShell
          mapMode={mapMode}
          mainMapRef={mainMapRef}
          exploring={exploring}
          onPick={handlePick}
        >
          {/* Popular labels only when not placing a draft */}
          {showPopularSpots && mapMode === 'chicago' && !draft && (
            <PopularSpotsOverlay labelsAbove showHotDog showItalianBeef labelStyle="pill" />
          )}

          {/* Zoomed OUT: either Bubbles or Heatmap (configured in Admin) */}
          {showCommunityPins && !draft && clusterMode === 'bubbles' && (
            <PinBubbles
              pins={pinsDeduped}
              enabled={true}
              minZoomForPins={adminSettings?.minZoomForPins ?? 13}
              maxZoom={adminSettings?.maxZoom ?? 19}
            />
          )}
          {showCommunityPins && !draft && clusterMode === 'heatmap' && (
            <HeatmapOverlay
              pins={pinsDeduped}
              enabled={true}
              minZoomForHeatmap={heatCfg?.minZoom ?? 10}
              radius={heatCfg?.radius ?? 25}
              blur={heatCfg?.blur ?? 15}
              maxOpacity={heatCfg?.maxOpacity ?? 0.6}
            />
          )}

          {/* Zoomed IN (Chicago only): show real pins with explore-only interactivity & highlight-after-save */}
          {showCommunityPins && !draft && mapMode === 'chicago' && (
            <ZoomGate minZoom={13} forceOpen={!!highlightSlug}>
              <SavedPins
                key={`pins-${exploring ? 'on' : 'off'}`}
                pins={pinsForRender}
                exploring={exploring}
                highlightSlug={mapMode === 'chicago' ? highlightSlug : null}
                highlightMs={15000}
                onHighlightEnd={clearHighlight}
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

        {toast && (
          <Toast title={toast.title} text={toast.text} onClose={() => setToast(null)} />
        )}
      </div>

      {submapCenter && (
        <SubMapModal
          center={submapCenter}
          team={form.team}
          handoff={handoff}
          mainMapRef={mainMapRef}
          baseZoom={submapBaseZoom}
          onCommit={(ll) => {
            setDraft(ll)
            mainMapRef.current?.panTo([ll.lat, ll.lng], { animate: false })
            closeSubmap()
            setTipToken(t => t + 1)
          }}
        />
      )}

      {/* -------- RESTORED FOOTER (triple-tap area) -------- */}
      <footer
        style={{ padding:'10px 14px' }}
        onClick={handleFooterClick}
        onTouchStart={handleFooterTouch}
      >
        {!draft ? (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
            <div className="hint" style={{ color:'#a7b0b8', margin:'0 auto', textAlign:'center', flex:1 }}>
              {exploring
                ? 'Click any pin to see details.'
                : (mapMode === 'global'
                    ? 'Click the map to place your pin anywhere in the world.'
                    : 'Tap the map to place your pin, then start dragging the pin to fine-tune.'
                  )
              }
            </div>
            {!exploring && (
              <button data-no-admin-tap onClick={()=> { setExploring(true); setShowAttractor(false) }}>🔎 Explore pins</button>
            )}
            {exploring && (
              <button data-no-admin-tap onClick={()=> setExploring(false)}>✖ Close explore</button>
            )}
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
      {/* --------------------------------------------------- */}

      <ShareConfirmModal
        open={shareOpen}
        onCancel={() => { setShareOpen(false) }}
        onConfirm={savePin}
        shareToFb={shareToFb}
        setShareToFb={setShareToFb}
        draft={draft}
        form={form}
        mapMode={mapMode}
      />

      {/* Overlay only if launched with ?kiosk=1 and fullscreen was blocked */}
      <KioskStartOverlay visible={autoKiosk && needsKioskStart && !isFullscreen} onStart={startKioskNow} />

      {/* Hidden Admin (triple-tap footer background to open; also ?admin=1) */}
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  )
}
