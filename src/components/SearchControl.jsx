import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'

const debounce = (fn, ms = 300) => {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export default function SearchControl({
  placeholder = 'Search city or town…',
  minChars = 2,
  maxResults = 8,
  zoomOnSelect = 11,          // reasonable city zoom
}) {
  const map = useMap()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)
  const [hilite, setHilite] = useState(-1)

  // fetch suggestions (Nominatim)
  const doSearch = useMemo(
    () =>
      debounce(async (query) => {
        if (!query || query.trim().length < minChars) {
          setItems([])
          setOpen(false)
          return
        }
        try {
          setLoading(true)
          // Limit to city/town/village/hamlet results; English labels preferred
          const url = new URL('https://nominatim.openstreetmap.org/search')
          url.searchParams.set('format', 'jsonv2')
          url.searchParams.set('q', query)
          url.searchParams.set('addressdetails', '1')
          url.searchParams.set('limit', String(maxResults))
          url.searchParams.set('featuretype', 'city')
          url.searchParams.set('accept-language', 'en')
          // Prefer place types for populated places
          url.searchParams.set('extratags', '0')

          const res = await fetch(url.toString(), {
            headers: {
              'Accept': 'application/json',
            },
          })
          const data = await res.json()
          const cleaned = (Array.isArray(data) ? data : [])
            .filter(d =>
              ['city', 'town', 'village', 'hamlet', 'municipality', 'county'].includes(d?.type)
            )
            .map(d => ({
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
              label: d.display_name,
              type: d.type,
            }))
          setItems(cleaned)
          setOpen(true)
        } catch {
          setItems([])
          setOpen(false)
        } finally {
          setLoading(false)
        }
      }, 300),
    [minChars, maxResults]
  )

  useEffect(() => { doSearch(q) }, [q, doSearch])

  // click outside to close
  useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const selectItem = (it) => {
    setOpen(false)
    if (!it || !Number.isFinite(it.lat) || !Number.isFinite(it.lon)) return
    try {
      map.flyTo([it.lat, it.lon], zoomOnSelect, { animate: true })
    } catch {}
  }

  const onKeyDown = (e) => {
    if (!open || !items.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHilite(h => Math.min(items.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHilite(h => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = items[Math.max(0, hilite)]
      if (it) selectItem(it)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    // Position: below native zoom controls (top-left)
    <div
      ref={boxRef}
      style={{
        position: 'absolute',
        top: 84,            // sits just below Leaflet zoom (+/-)
        left: 12,
        zIndex: 3500,
        width: 'min(72vw, 320px)',
      }}
    >
      <div className="glass" style={{
        display:'flex', alignItems:'center', gap:8,
        borderRadius: 12, padding: 8, border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(16,17,20,0.55)',
        backdropFilter: 'blur(6px) saturate(115%)',
        WebkitBackdropFilter: 'blur(6px) saturate(115%)'
      }}>
        <span aria-hidden>🔎</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (items.length) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{
            flex:1,
            background:'transparent', border:'none', outline:'none',
            color:'#fff', fontSize:14
          }}
        />
        {loading ? <span style={{ fontSize:12, opacity:0.8 }}>…</span> : null}
        {q && (
          <button
            onClick={() => { setQ(''); setItems([]); setOpen(false); inputRef.current?.focus() }}
            className="btn-toggle btn-toggle--sm"
            style={{ padding:'4px 8px' }}
          >
            Clear
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <div
          className="glass"
          style={{
            marginTop: 6,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.14)',
            overflow: 'hidden',
            maxHeight: 300,
            overflowY: 'auto'
          }}
        >
          {items.map((it, i) => (
            <button
              key={`${it.lat},${it.lon},${i}`}
              onMouseEnter={() => setHilite(i)}
              onMouseLeave={() => setHilite(-1)}
              onClick={() => selectItem(it)}
              style={{
                display:'block',
                width:'100%',
                textAlign:'left',
                padding:'10px 12px',
                background: i === hilite ? 'rgba(255,255,255,0.08)' : 'transparent',
                border:'none',
                color:'#e9eef3',
                cursor:'pointer',
                fontSize:13,
                lineHeight:1.35
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
