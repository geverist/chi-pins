// src/components/AdminPanel.jsx
import { useEffect, useMemo, useState } from 'react'

const DEFAULT_SETTINGS = {
  idleAttractorSeconds: 60,
  minZoomForPins: 13,
  maxZoom: 19,
  kioskAutoStart: true,
  pinAgeMonths: 24,
  showPopularSpots: true,
  showCommunityPins: true,
  clusterBubbleThreshold: 13,
  showLabelsZoom: 13,
  // NEW:
  clusterMode: 'bubbles', // 'bubbles' | 'heatmap'
  heatmap: { minZoom: 10, radius: 25, blur: 15, maxOpacity: 0.6 },
}

function deepMerge(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return b ?? a
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    const out = { ...a }
    for (const k of Object.keys(b)) out[k] = deepMerge(a[k], b[k])
    return out
  }
  return b ?? a
}

export default function AdminPanel({ open, onClose }) {
  const [tab, setTab] = useState('general')

  // Load + merge defaults so new keys always appear
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('adminSettings')
      const parsed = raw ? JSON.parse(raw) : {}
      return deepMerge(DEFAULT_SETTINGS, parsed)
    } catch { return { ...DEFAULT_SETTINGS } }
  })

  const [popularSpots, setPopularSpots] = useState(() => {
    try {
      const raw = localStorage.getItem('adminPopularSpots')
      return raw ? JSON.parse(raw) : [
        { label: 'Portillo’s – River North', category: 'hotdog' },
        { label: 'Al’s #1 Italian Beef – Little Italy', category: 'beef' },
      ]
    } catch { return [] }
  })

  const [pendingDeletes, setPendingDeletes] = useState(new Set())

  // Close via ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // If something else updates localStorage, merge it live
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'adminSettings') {
        try {
          const incoming = JSON.parse(e.newValue || '{}')
          setSettings(s => deepMerge(DEFAULT_SETTINGS, incoming ?? {}))
        } catch {}
      }
      if (e.key === 'adminPopularSpots') {
        try { setPopularSpots(JSON.parse(e.newValue || '[]') || []) } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const saveLocal = () => {
    localStorage.setItem('adminSettings', JSON.stringify(settings))
    localStorage.setItem('adminPopularSpots', JSON.stringify(popularSpots))
  }

  const applyAndClose = () => { saveLocal(); onClose?.() }

  const addSpot = () => setPopularSpots(s => [...s, { label: '', category: 'hotdog' }])
  const updateSpot = (idx, patch) =>
    setPopularSpots(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  const removeSpot = (idx) => setPopularSpots(s => s.filter((_, i) => i !== idx))

  const togglePendingDelete = (id) => {
    setPendingDeletes(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!open) return null

  return (
    <div style={s.overlay}>
      <div style={s.backdrop} onClick={onClose} />
      <div style={s.panel}>
        <div style={s.header}>
          <div style={s.titleWrap}>
            <span style={s.badge}>Admin</span>
            <h3 style={s.title}>Control Panel</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn.secondary} onClick={saveLocal} title="Save without closing">Save</button>
            <button style={btn.primary} onClick={applyAndClose} title="Save and close">Apply & Close</button>
            <button style={btn.ghost} onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div style={s.tabs}>
          <TabBtn active={tab === 'general'} onClick={() => setTab('general')}>General</TabBtn>
          <TabBtn active={tab === 'display'} onClick={() => setTab('display')}>Display</TabBtn>
          <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>Popular Spots</TabBtn>
          <TabBtn active={tab === 'moderate'} onClick={() => setTab('moderate')}>Moderation</TabBtn>
        </div>

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
              </Card>

              <Card title="Data window">
                <FieldRow label="Show pins from last (months)">
                  <NumberInput
                    value={settings.pinAgeMonths}
                    min={1}
                    max={120}
                    onChange={(v) => setSettings(s => ({ ...s, pinAgeMonths: v }))}
                  />
                </FieldRow>
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
                <FieldRow label="Max zoom">
                  <NumberInput
                    value={settings.maxZoom}
                    min={2}
                    max={20}
                    onChange={(v) => setSettings(s => ({ ...s, maxZoom: v }))}
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
              </Card>

              <Card title="Layers">
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
              </Card>

              {/* NEW: Cluster view mode + heatmap tuning (this is what you’re looking for) */}
              <Card title="Clusters View">
                <FieldRow label="Mode">
                  <div style={{ display:'flex', gap:8 }}>
                    <button
                      type="button"
                      style={btnChoice(settings.clusterMode === 'bubbles')}
                      onClick={() => setSettings(s => ({ ...s, clusterMode: 'bubbles' }))}
                    >Bubbles</button>
                    <button
                      type="button"
                      style={btnChoice(settings.clusterMode === 'heatmap')}
                      onClick={() => setSettings(s => ({ ...s, clusterMode: 'heatmap' }))}
                    >Heatmap</button>
                  </div>
                </FieldRow>

                {settings.clusterMode === 'heatmap' && (
                  <>
                    <FieldRow label="Heatmap min zoom">
                      <NumberInput
                        value={settings.heatmap?.minZoom ?? 10}
                        min={2}
                        max={20}
                        onChange={(v) => setSettings(s => ({
                          ...s, heatmap: { ...(s.heatmap||{}), minZoom: v }
                        }))}
                      />
                    </FieldRow>
                    <FieldRow label="Radius">
                      <NumberInput
                        value={settings.heatmap?.radius ?? 25}
                        min={5}
                        max={80}
                        onChange={(v) => setSettings(s => ({
                          ...s, heatmap: { ...(s.heatmap||{}), radius: v }
                        }))}
                      />
                    </FieldRow>
                    <FieldRow label="Blur">
                      <NumberInput
                        value={settings.heatmap?.blur ?? 15}
                        min={0}
                        max={80}
                        onChange={(v) => setSettings(s => ({
                          ...s, heatmap: { ...(s.heatmap||{}), blur: v }
                        }))}
                      />
                    </FieldRow>
                    <FieldRow label="Max opacity (0–1)">
                      <NumberInput
                        value={settings.heatmap?.maxOpacity ?? 0.6}
                        min={0}
                        max={1}
                        onChange={(v) => setSettings(s => ({
                          ...s, heatmap: { ...(s.heatmap||{}), maxOpacity: v }
                        }))}
                      />
                    </FieldRow>
                  </>
                )}
              </Card>
            </SectionGrid>
          )}

          {tab === 'content' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Popular spots (shown on Chicago map)">
                <div style={{ display: 'grid', gap: 8 }}>
                  {popularSpots.map((row, i) => (
                    <div key={i} style={s.row}>
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
                  <div>
                    <button style={btn.secondary} onClick={addSpot}>+ Add spot</button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {tab === 'moderate' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <Card title="Moderate pins">
                <p style={s.muted}>
                  (Demo UI) Select pins to delete. In your app, wire this to Supabase
                  with a protected RPC or delete mutation.
                </p>
                <ModerationTable
                  onToggle={togglePendingDelete}
                  selected={pendingDeletes}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    style={btn.danger}
                    onClick={() => {
                      // TODO: call Supabase delete for ids in pendingDeletes
                      setPendingDeletes(new Set())
                      alert('Deleted selected pins (demo).')
                    }}
                  >
                    Delete selected
                  </button>
                </div>
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

/** Demo table for moderation; replace with live data if desired */
function ModerationTable({ selected, onToggle }) {
  const rows = useMemo(() => ([
    { id: 'pin-001', slug: 'bridgeport-jordan', note: 'First Sox game with dad!', created_at: '2024-06-10' },
    { id: 'pin-002', slug: 'pilsen-ditka', note: 'Maxwell St Polish > *chef’s kiss*', created_at: '2024-08-01' },
    { id: 'pin-003', slug: 'hydepark-addison', note: 'Vienna red hots forever', created_at: '2025-01-02' },
  ]), [])

  return (
    <div style={{ overflow: 'auto', border: '1px solid #2b3037', borderRadius: 12 }}>
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
          {rows.map(r => {
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
                <td style={t.td}>{r.created_at}</td>
              </tr>
            )
          })}
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
    maxHeight: '88vh',
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
    display: 'flex', gap: 6, padding: '8px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  body: { padding: 12, overflow: 'auto' },
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

const btnChoice = (active) => ({
  padding:'8px 12px',
  borderRadius:10,
  border: active ? '1px solid rgba(56,189,248,0.6)' : '1px solid rgba(148,163,184,0.4)',
  background: active ? 'rgba(56,189,248,0.20)' : 'rgba(148,163,184,0.12)',
  color:'#e9eef3', cursor:'pointer'
})

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
    position: 'sticky', top: 0
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
