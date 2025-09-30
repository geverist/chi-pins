// src/components/SearchControl.jsx
import { useEffect, useRef, useState } from 'react'

/**
 * Top-centered, type-ahead search for cities/towns using OpenStreetMap Nominatim.
 * - Filters to administrative "place" types only.
 * - Chicago-biased (via Nominatim viewbox + client-side scoring), but still global.
 * - Debounced fetching, keyboard navigation, click-to-fly.
 * - Overlay captures pointer events to avoid triggering map clicks below.
 */

const CHI = { lat: 41.8781, lon: -87.6298 }
// Rough Chicago metro viewbox (left, top, right, bottom)
const CHI_VIEWBOX = {
  left: -88.8,
  right: -86.9,
  top: 42.7,
  bottom: 41.2
}

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const sin1 = Math.sin(dLat / 2)
  const sin2 = Math.sin(dLon / 2)
  const c =
    sin1 * sin1 +
    Math.cos(la1) * Math.cos(la2) * sin2 * sin2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(c)))
}

export default function SearchControl({ mainMapRef }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const boxRef = useRef(null)
  const abortRef = useRef(null)

  const shouldSearch = q.trim().length >= 2

  const fetchPlaces = async (term) => {
    abortRef.current?.abort?.()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('q', term)
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('accept-language', 'en')
      url.searchParams.set('limit', '10')
      url.searchParams.set('dedupe', '1')
      // Chicago-biased viewbox (NOT bounded; still global)
      url.searchParams.set(
        'viewbox',
        `${CHI_VIEWBOX.left},${CHI_VIEWBOX.top},${CHI_VIEWBOX.right},${CHI_VIEWBOX.bottom}`
      )
      // Small hint that we care about places:
      // (Nominatim doesn’t strictly enforce this, we still filter client-side)
      url.searchParams.set('extratags', '0')

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'ChiPins/1.0 (Typeahead Search)' }
      })
      if (!res.ok) throw new Error('geocode failed')
      const json = await res.json()

      const allowedPlaceTypes = new Set([
        'city','town','village','hamlet','suburb','neighbourhood','neighborhood','borough'
      ])

      // First pass: filter to "place" features we want
      const raw = (Array.isArray(json) ? json : []).filter(
        d => d.class === 'place' && allowedPlaceTypes.has((d.type || '').toLowerCase())
      )

      // Client-side Chicago bias scoring:
      // - +40 if "Chicago" in name/address
      // - +25 if state = Illinois
      // - distance boost (closer to CHI better)
      const scored = raw.map(d => {
        const lat = Number(d.lat)
        const lon = Number(d.lon)
        const addr = d.address || {}
        const label =
          d.display_name?.split(',')?.slice(0, 3)?.join(', ') ||
          d.name ||
          `${lat.toFixed(4)}, ${lon.toFixed(4)}`

        // Base score starts at 0, add bonuses
        let score = 0
        const hay = `${label} ${addr.city || ''} ${addr.town || ''} ${addr.state || ''}`.toLowerCase()
        if (hay.includes('chicago')) score += 40
        if ((addr.state || '').toLowerCase().includes('illinois')) score += 25

        // Distance bonus (closer to Chicago -> higher)
        const distKm = (Number.isFinite(lat) && Number.isFinite(lon))
          ? haversineKm(CHI, { lat, lon })
          : 20000
        // Map ~0–2000km into ~+0..+20 (clamped)
        const distBoost = Math.max(0, 20 - Math.min(2000, distKm) / 100)
        score += distBoost

        return { d, lat, lon, score, label }
      })

      scored.sort((a, b) => b.score - a.score)

      const cleaned = scored.slice(0, 7).map(({ d, lat, lon, label }) => ({
        id: `${d.osm_type || 'x'}:${d.osm_id || d.place_id}`,
        label,
        type: d.type,
        lat, lon,
        raw: d
      }))

      setResults(cleaned)
      setOpen(true)
      setActiveIdx(cleaned.length ? 0 : -1)
    } catch {
      // swallow unless abort
      if (!controller.signal.aborted) {
        setResults([])
        setOpen(false)
        setActiveIdx(-1)
      }
    } finally {
      setLoading(false)
    }
  }

  // Debounce fetch
  useEffect(() => {
    if (!shouldSearch) { setResults([]); setOpen(false); setActiveIdx(-1); return }
    const t = setTimeout(() => fetchPlaces(q.trim()), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Close on outside pointer
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    return () => document.removeEventListener('pointerdown', onDoc)
  }, [])

  const flyTo = (lat, lon, type) => {
    const map = mainMapRef?.current
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lon)) return
    const tight = new Set(['neighbourhood','neighborhood','suburb','hamlet','village','borough'])
    const zoom = tight.has((type || '').toLowerCase()) ? 14 : 11
    try {
      map.flyTo([lat, lon], zoom, { animate: true, duration: 1.0 })
    } catch {
      map.setView([lat, lon], zoom)
    }
  }

  const onPick = (item) => {
    flyTo(item.lat, item.lon, item.type)
    setQ(item.label)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[Math.max(activeIdx, 0)]
      if (item) onPick(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={boxRef}
      role="search"
      style={{
        position:'absolute',
        top:12,
        left:'50%',
        transform:'translateX(-50%)',
        zIndex: 4500,
        width:'min(640px, 92vw)',
        pointerEvents:'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="glass" style={{
        display:'flex',
        alignItems:'center',
        gap:8,
        padding:8,
        borderRadius:12,
        background:'rgba(16,17,20,0.55)',
        border:'1px solid rgba(255,255,255,0.14)',
        boxShadow:'0 8px 24px rgba(0,0,0,0.28)',
        backdropFilter:'blur(6px) saturate(115%)',
        WebkitBackdropFilter:'blur(6px) saturate(115%)',
      }}>
        <span aria-hidden style={{opacity:.9}}>🔎</span>
        <input
          aria-label="Search for a city or town"
          placeholder="Search city or town… (biased to Chicago)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          style={{
            flex:1,
            background:'transparent',
            border:'none',
            outline:'none',
            color:'#eef3f8',
            fontSize:16,
          }}
        />
        {loading ? <span style={{fontSize:12, color:'#a7b0b8'}}>Searching…</span> : null}
        {!!q && (
          <button
            className="btn-toggle btn-toggle--sm"
            onClick={() => { setQ(''); setResults([]); setOpen(false); setActiveIdx(-1) }}
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="glass"
          role="listbox"
          style={{
            marginTop:6,
            borderRadius:12,
            overflow:'hidden',
            border:'1px solid rgba(255,255,255,0.14)',
            boxShadow:'0 10px 28px rgba(0,0,0,0.32)',
            backdropFilter:'blur(6px) saturate(115%)',
            WebkitBackdropFilter:'blur(6px) saturate(115%)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {results.map((r, i) => (
            <button
              key={r.id}
              role="option"
              aria-selected={i === activeIdx}
              onClick={() => onPick(r)}
              className="btn-toggle"
              style={{
                display:'block',
                textAlign:'left',
                width:'100%',
                padding:'10px 12px',
                borderRadius:0,
                border:'none',
                background: i === activeIdx ? 'rgba(255,255,255,0.08)' : 'transparent'
              }}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div style={{fontWeight:600}}>{r.label}</div>
              <div style={{fontSize:12, color:'#a7b0b8', marginTop:2}}>
                {(r.type || '').replace(/^\w/, c => c.toUpperCase())}
                {' · '}
                {Number.isFinite(r.lat) && Number.isFinite(r.lon)
                  ? `${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}`
                  : '—'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
