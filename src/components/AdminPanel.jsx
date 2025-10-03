// src/components/AdminPanel.jsx
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminPanel({ open, onClose }) {
  const [tab, setTab] = useState('general')

  // ---------- Defaults (kept same) ----------
  const defaultSettings = {
    idleAttractorSeconds: 60,
    minZoomForPins: 13,
    maxZoom: 18,
    kioskAutoStart: true,
    pinAgeMonths: 24,
    showPopularSpots: true,
    showCommunityPins: true,
    clusterBubbleThreshold: 13,
    showLabelsZoom: 13,
    // new-but-safe toggles used elsewhere; default true/false won’t break anything
    loyaltyEnabled: true,
    enableGlobalBubbles: true,
    attractorHintEnabled: true,
    labelStyle: 'pill', // 'pill' | 'clean'
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
        { label: 'Portillo’s – River North', category: 'hotdog' },
        { label: 'Al’s #1 Italian Beef – Little Italy', category: 'beef' },
      ]
    } catch { return [] }
  })

  // Moderation – selected IDs for deletion
  const [pendingDeletes, setPendingDeletes] = useState(new Set())
  const [modLoading, setModLoading] = useState(false)
  const [modRows, setModRows] = useState([]) // live pins from supabase
  const [search, setSearch] = useState('')

  // ---------- Load from Supabase when panel opens ----------
  const loadFromSupabase = useCallback(async () => {
    if (!open) return
    try {
      // SETTINGS: single row table "admin_settings" (id=1)
      const { data: sData, error: sErr } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 1)
        .limit(1)
        .maybeSingle()

      if (!sErr && sData) {
        // Merge unknown keys so we can roll forward/back
        const merged = { ...defaultSettings, ...sData.settings }
        setSettings(merged)
        localStorage.setItem('adminSettings', JSON.stringify(merged))
      }

      // POPULAR SPOTS: table "popular_spots" with columns {id, label, category, city?}
      const { data: pData, error: pErr } = await supabase
        .from('popular_spots')
        .select('id,label,category')
        .order('id', { ascending: true })

      if (!pErr && Array.isArray(pData)) {
        const rows = pData.map(({ id, label, category }) => ({ id, label, category }))
        setPopularSpots(rows)
        localStorage.setItem('adminPopularSpots', JSON.stringify(rows))
      }
    } catch {
      // ignore – fallback to localStorage is already set
    }
  }, [open])

  useEffect(() => { if (open) loadFromSupabase() }, [open, loadFromSupabase])

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
      // Upsert admin_settings (single row id=1)
      await supabase
        .from('admin_settings')
        .upsert({ id: 1, settings }, { onConflict: 'id' })

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

  const saveLocalAndMaybeSupabase = async () => {
    saveLocal()
    await saveSupabase()
  }

  const applyAndClose = async () => {
    await saveLocalAndMaybeSupabase()
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
      const months = Number(settings.pinAgeMonths || 24)
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
  }, [settings.pinAgeMonths, search])

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
            <button style={btn.secondary} onClick={saveLocalAndMaybeSupabase} title="Save without closing">Save</button>
            <button style={btn.primary} onClick={applyAndClose} title="Save and close">Apply & Close</button>
            <button style={btn.ghost} onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Fixed tabs bar */}
        <div style={s.tabs}>
          <TabBtn active={tab === 'general'} onClick={() => setTab('general')}>General</TabBtn>
          <TabBtn active={tab === 'display'} onClick={() => setTab('display')}>Display</TabBtn>
          <TabBtn active={tab === 'content'} onClick={() => setTab('content')}>Popular Spots</TabBtn>
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

              <Card title="Loyalty">
                <FieldRow label="Enable loyalty phone in editor">
                  <Toggle
                    checked={settings.loyaltyEnabled}
                    onChange={(v) => setSettings(s => ({ ...s, loyaltyEnabled: v }))}
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
