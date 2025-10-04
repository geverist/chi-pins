import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { parseTableToken } from '../lib/token'
import { isInLakeMichigan } from '../lib/mapUtils'

const CHI = { lat: 41.8781, lng: -87.6298 }

// Normal icons (non-draggable, existing pins)
const iconFor = (team) =>
  L.divIcon({
    className: `pin pin-${team}`,
    html: '<div class="pin-in"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })

// Placing icon (bigger + halo for “drag me” affordance)
const placingIconFor = (team) =>
  L.divIcon({
    className: `pin pin-${team} pin-placing`,
    html: `
      <div class="pin-placing-wrap">
        <div class="pin-in"></div>
        <div class="pin-halo"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  })

function TapToPlace({ placing, onPick }) {
  useMapEvents({
    click(e) { if (placing) onPick(e.latlng) },
  })
  return null
}

// Dedicated draggable marker; disables map pan while dragging.
// Shows a “Drag to adjust” tooltip until first drag.
function DraggablePlacingMarker({ lat, lng, team, onChange, mapRef }) {
  const [showTip, setShowTip] = useState(true)

  return (
    <Marker
      position={[lat, lng]}
      icon={placingIconFor(team)}
      draggable={true}
      autoPan={true}
      interactive={true}
      bubblingMouseEvents={false}
      keyboard={false}
      zIndexOffset={1000}
      title="Drag to adjust"
      eventHandlers={{
        dragstart: () => { mapRef.current?.dragging?.disable(); setShowTip(false) },
        drag: (e) => {
          const ll = e.target.getLatLng()
          onChange({ lat: ll.lat, lng: ll.lng })
        },
        dragend: (e) => {
          const ll = e.target.getLatLng()
          onChange({ lat: ll.lat, lng: ll.lng })
          mapRef.current?.dragging?.enable()
        },
      }}
    >
      {showTip && (
        <Tooltip direction="top" offset={[0, -28]} permanent className="drag-tip">
          Drag to adjust
        </Tooltip>
      )}
    </Marker>
  )
}

export default function TableMode() {
  const [params] = useSearchParams()
  const { venue } = useParams()
  const { table, token } = parseTableToken(params)

  const [pins, setPins] = useState([])
  const [draft, setDraft] = useState({ team: 'cubs', note: '', name: '', neighborhood: '' })
  const [placing, setPlacing] = useState(null)
  const [error, setError] = useState('')
  const mapRef = useRef(null)

  // … (all your existing effects: token check, load, optional realtime, polling) …

  async function savePin() {
    if (!placing) return

    // Check if pin is in Lake Michigan
    if (isInLakeMichigan(placing.lat, placing.lng)) {
      alert('Cannot place a pin in Lake Michigan! Please select a location on land.')
      return
    }

    const clean = { ...draft, note: draft.note.trim().slice(0, 280) }
    if (!clean.note) return

    const rec = {
      ...clean, ...placing,
      table_id: table, source: 'table',
      device_id: `table-${table}`,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('pins').insert([rec]).select()
    if (error) { alert('Could not save.'); return }

    const inserted = data?.[0] || rec
    setPins(p => [inserted, ...p])
    setPlacing(null) // <- after submit, placing ends; no more dragging
    setDraft({ team: 'cubs', note: '', name: '', neighborhood: '' })
  }

  return (
    <div className="app">
      <header>
        <h1>Table {table || '—'} • Add your pin</h1>
        <small className="muted">{venue}</small>
      </header>

      <div className="map-wrap">
        <MapContainer
          center={CHI}
          zoom={10}
          style={{ height: '100%' }}
          whenCreated={(map) => { mapRef.current = map }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <TapToPlace placing={placing} onPick={(ll) => setPlacing({ lat: ll.lat, lng: ll.lng })} />

          {pins.slice(0, 50).map(p => (
            <Marker
              key={p.id || `${p.lat},${p.lng},${p.created_at}`}
              position={[p.lat, p.lng]}
              icon={iconFor(p.team)}
              draggable={false}          // existing pins never draggable
            >
              <Popup>
                <b>{p.neighborhood || 'Chicago'}</b> — {p.team}<br/>
                {p.note}{p.name ? <div>— {p.name}</div> : null}
              </Popup>
            </Marker>
          ))}

          {placing && (
            <DraggablePlacingMarker
              lat={placing.lat}
              lng={placing.lng}
              team={draft.team}
              onChange={setPlacing}
              mapRef={mapRef}
            />
          )}
        </MapContainer>
      </div>

      <footer>
        {error && <div style={{ color: '#ff6565', marginBottom: 8 }}>{error}</div>}
        {!placing ? (
          <div className="form">
            <button
              onClick={() => setPlacing({ lat: CHI.lat, lng: CHI.lng })}
              title="Tap the map to set your pin; then drag to adjust."
            >
              Start placing pin (tap map to set)
            </button>
            <small className="muted">Tip: Tap to place, then drag the pin before submitting.</small>
            <Recent pins={pins} />
          </div>
        ) : (
          <div className="form">
            <div className="teams">
              {['cubs','whitesox','other'].map(t => (
                <button
                  key={t}
                  className={draft.team===t?'on':''}
                  onClick={() => setDraft(f => ({ ...f, team:t }))}
                >
                  {t==='cubs'?'🔵 Cubs': t==='whitesox'?'⚪ White Sox':'⚫ Other'}
                </button>
              ))}
            </div>
            <input placeholder="Neighborhood (optional)" value={draft.neighborhood} onChange={e=>setDraft({ ...draft, neighborhood:e.target.value })}/>
            <input placeholder="Name (optional)" value={draft.name} onChange={e=>setDraft({ ...draft, name:e.target.value })}/>
            <textarea placeholder="Favorite memory (max 280 chars)" value={draft.note} onChange={e=>setDraft({ ...draft, note:e.target.value })}/>
            <button onClick={savePin} disabled={!draft.note.trim() || !placing}>Submit Pin</button>
            <button className="cancel" onClick={() => setPlacing(null)}>Cancel</button>
            <small className="muted">Drag the pin to fine-tune before you submit.</small>
          </div>
        )}
      </footer>
    </div>
  )
}

function Recent({ pins }) {
  return (
    <div className="list">
      {pins.slice(0, 12).map(p => (
        <div className="card" key={p.id || `${p.lat},${p.lng},${p.created_at}`}>
          <div><b>{p.neighborhood || 'Chicago'}</b> — {p.team}</div>
          <div>{p.note}</div>
          {p.name ? <small className="muted">— {p.name}</small> : null}
        </div>
      ))}
    </div>
  )
}
