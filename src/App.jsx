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
  CHI,                         // assumed center or helper constant from your mapUtils
  INITIAL_RADIUS_MILES,
  enableMainMapInteractions,
  disableMainMapInteractions
} from './lib/mapUtils'
import { focusDraft, goToChicago } from './lib/mapActions' // keeps your canonical Chicago view

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

// Admin panel
import AdminPanel from './components/AdminPanel'

// Mobile table view
import RecentPinsTable from './components/RecentPinsTable'

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
  } catch {}
}
async function exitFullscreenAndWake() {
  try { await document.exitFullscreen?.() } catch {}
  try { await wakeLockRef?.release?.() } catch {}
  wakeLockRef = null
}
function onFullscreenChange(cb) {
  const handler = () => cb?.(!!document.fullscreenElement)
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }
  return () => {}
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

// World view constants (pleasant framing)
const GLOBAL_CENTER = [20, 0]
const GLOBAL_ZOOM = 3
// Reasonable fallback Chicago zoom if your goToChicago doesn’t override zoom
const CHICAGO_ZOOM_OUT = 11

export default function App() {
  const mainMapRef = useRef(null)

  // data
  const { pins, setPins, hotdogSuggestions } = usePins()

  // map mode
  const [mapMode, setMapMode] = useState('chicago') // 'chicago' | 'global'

  // fun facts
  const funFacts = useFunFacts(DEFAULT_FUN_FACTS)

  // draft pin
  const [draft, setDraft] = useState(null)
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

  // ---------- Detect mobile ----------
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      const mq = typeof window !== 'undefined'
        ? window.matchMedia('(max-width: 768px)').matches
        : false
      const touch = typeof window !== 'undefined' && 'ontouchstart' in window
      setIsMobile(mq || (touch && window.innerWidth < 1024))
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Mobile: auto-explore & hide popular spots by default
  useEffect(() => {
    if (isMobile) {
      setExploring(true)
      setShowPopularSpots(false)
    }
  }, [isMobile])

  // Mobile View Mode: 'map' | 'table'
  const [mobileViewMode, setMobileViewMode] = useState('map')
  useEffect(() => {
    if (!isMobile) setMobileViewMode('map')
  }, [isMobile])

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
      if (autoKiosk && !isMobile) {
        await enterFullscreen()
        await ensureWakeLock()
        setNeedsKioskStart(!document.fullscreenElement)
      } else {
        setNeedsKioskStart(false)
      }
    })()
    return () => off?.()
  }, [autoKiosk, isMobile])

  // Hidden kiosk toggle (desktop/kiosk only)
  useEffect(() => {
    if (isMobile) return
    let count = 0
    let timer = null
    const onKey = async (e) => {
      if (!e.shiftKey) return
      if ((e.key || '').toLowerCase() !== 'k') return
      count += 1
      clearTimeout(timer)
      timer = setTimeout(() => { count = 0 }, 3000)
      if (count >= 3) {
        count = 0
        clearTimeout(timer)
        if (document.fullscreenElement) {
          await exitFullscreenAndWake()
        } else {
          await enterFullscreen()
          await ensureWakeLock()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer) }
  }, [isMobile])

  const startKioskNow = async () => {
    if (isMobile) return
    await enterFullscreen()
    await ensureWakeLock()
    setNeedsKioskStart(false)
  }
  const exitKioskNow = async () => {
    if (isMobile) return
    await exitFullscreenAndWake()
    setNeedsKioskStart(false)
  }

  /* ------------------ DEDUPE PINS ------------------ */
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

  const continentCounts = useMemo(() => countByContinent(pinsDeduped), [pinsDeduped])

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
    setExploring(isMobile ? true : false)
    clearHighlight()
    setMapMode('chicago')
    // snap map back
    const map = mainMapRef.current
    if (map) goToChicago(map)
    setForm(f => ({ ...f, name:'', neighborhood:'', hotdog:'', note:'' }))
  }

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

  // map click (disabled on mobile — read-only)
  const handlePick = async (ll) => {
    if (isMobile) return
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
      triggerHighlight(inserted.slug, 350)
    } else {
      clearHighlight()
    }
    setTipToken(t => t + 1)
  }

  /* ---------------- View helpers ---------------- */
  const applyConstraintsForMode = (map, mode, isMobileFlag) => {
    try {
      if (mode === 'global') {
        // global: allow wide zooming
        map.setMinZoom(2)
        map.setMaxBounds(null)
      } else {
        // chicago:
        if (isMobileFlag) {
          // per your earlier request: remove zoom-out restrictions on mobile
          map.setMinZoom(2)
          map.setMaxBounds(null)
        } else {
          // kiosk/desktop: keep things constrained so Chicago remains the focus
          // Give a reasonable min zoom (no hard bounds to avoid tile drag issues)
          map.setMinZoom(CHICAGO_ZOOM_OUT)
          map.setMaxBounds(null)
        }
      }
    } catch {}
  }

  const flyToGlobal = () => {
    const map = mainMapRef.current
    if (!map) return
    applyConstraintsForMode(map, 'global', isMobile)
    try {
      map.stop()
      map.flyTo(GLOBAL_CENTER, GLOBAL_ZOOM, { animate: true })
      setTimeout(() => map.invalidateSize?.(), 50)
    } catch {}
  }

  const snapToChicago = () => {
    const map = mainMapRef.current
    if (!map) return
    applyConstraintsForMode(map, 'chicago', isMobile)
    try {
      map.stop()
      // Prefer your canonical helper:
      goToChicago(map)
      // Fallback if goToChicago is a no-op:
      const c = Array.isArray(CHI) ? CHI : [41.8781, -87.6298]
      if (map.getZoom() < 3) {
        map.setView(c, CHICAGO_ZOOM_OUT, { animate: false })
      }
      setTimeout(() => map.invalidateSize?.(), 50)
    } catch {}
  }

  // Keep the Leaflet view + constraints in sync with mapMode and device
  useEffect(() => {
    const map = mainMapRef.current
    if (!map) return
    if (mapMode === 'global') {
      flyToGlobal()
    } else {
      snapToChicago()
    }
  }, [mapMode, isMobile])

  /* ---------------- Fine-tune modal ---------------- */
  const openSubmap = (center, pointer) => {
    if (isMobile) return
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

  // mode switches (trigger view immediately too)
  const goGlobal = () => {
    setMapMode('global')
    setDraft(null); setSlug(null); setSubmapCenter(null); setHandoff(null)
    setSubmapBaseZoom(null)
    setShowAttractor(false); setExploring(isMobile ? true : false)
    setToast(null)
    flyToGlobal()
  }

  const goChicagoZoomedOut = () => {
    const needsReset = !!(draft || submapCenter || shareOpen)
    if (needsReset) {
      cancelEditing()
      setTimeout(() => {
        setShowAttractor(!isMobile)
        snapToChicago()
      }, 0)
      return
    }
    setMapMode('chicago')
    setShowAttractor(!isMobile)
    setExploring(isMobile ? true : false)
    snapToChicago()
  }

  // style helper
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

  // Desktop header content
  const desktopHeaderRight =
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
        </div>
      )
      : (
        <GlobalCounters counts={continentCounts} />
      )

  // Mobile header content: map/table toggle only
  const mobileHeaderRight = (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', gap:8, flexWrap:'wrap' }}>
      <div />
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button
          className="btn-toggle btn-toggle--sm"
          aria-pressed={mobileViewMode === 'map'}
          onClick={() => setMobileViewMode('map')}
        >
          Map
        </button>
        <button
          className="btn-toggle btn-toggle--sm"
          aria-pressed={mobileViewMode === 'table'}
          onClick={() => setMobileViewMode('table')}
        >
          Table
        </button>
      </div>
      <div />
    </div>
  )

  /* ---------------- Admin (hidden) ---------------- */
  const [adminOpen, setAdminOpen] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1'
  )
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef(null)
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

  // --------- MAIN RENDER ----------
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
        {isMobile ? mobileHeaderRight : desktopHeaderRight}
      </HeaderBar>

      <div className="map-wrap" style={{ position:'relative', flex:1, minHeight:'60vh', borderTop:'1px solid #222', borderBottom:'1px solid #222' }}>
        {isMobile && mobileViewMode === 'table' ? (
          <RecentPinsTable pins={pinsDeduped} />
        ) : (
          <MapShell
            mapMode={mapMode}
            isMobile={isMobile}           
            mainMapRef={mainMapRef}
            exploring={exploring}
            onPick={handlePick}
          >
            {showPopularSpots
              && mapMode === 'chicago'
              && !draft
              && (!isMobile || (isMobile && exploring)) && (
                <PopularSpotsOverlay labelsAbove showHotDog showItalianBeef labelStyle="pill" />
            )}

            {showCommunityPins && !draft && (
              <PinBubbles
                pins={pinsDeduped}
                enabled={true}
                minZoomForPins={13}
                maxZoom={19}
              />
            )}

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

            {draft && !isMobile && (
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
        )}

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

      <footer style={{ padding:'10px 14px' }}>
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
          </div>
        ) : (
          !isMobile && (
            <Editor
              mapMode={mapMode}
              slug={slug}
              form={form}
              setForm={setForm}
              hotdogSuggestions={hotdogSuggestions}
              onCancel={cancelEditing}
              onOpenShare={() => setShareOpen(true)}
            />
          )
        )}
      </footer>

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

      <KioskStartOverlay visible={!isMobile && autoKiosk && needsKioskStart && !isFullscreen} onStart={startKioskNow} />
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  )
}
