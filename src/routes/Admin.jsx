import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function Admin() {
  const [key, setKey] = useState('')        // UUID or slug
  const [code, setCode] = useState('')      // admin pin
  const [msg, setMsg] = useState('')        // status
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)

  const adminPin = import.meta.env.VITE_ADMIN_PIN || '1234'
  const isUuid = useMemo(() => UUID_V4_RE.test(key.trim()), [key])
  const trimmedKey = key.trim()

  // Ready when we have key + pin and not loading
  const isReady = !!trimmedKey && !!code && !loading

  // Debounced preview fetch (runs on key change or manual)
  const fetchPreview = useCallback(async () => {
    setPreview(null)
    setMsg('')
    const k = trimmedKey
    if (!k) return
    try {
      let q = supabase.from('pins').select('*').limit(1)
      q = isUuid ? q.eq('id', k) : q.eq('slug', k)
      const { data, error } = await q.maybeSingle()
      if (error) {
        // Supabase returns error when maybeSingle finds >1 rows; keep it simple
        setMsg(error.message || 'Preview failed.')
        return
      }
      if (data) setPreview(data)
      else setMsg('No matching pin found.')
    } catch (e) {
      setMsg(e?.message || 'Preview failed.')
    }
  }, [trimmedKey, isUuid])

  // Debounce typing → preview
  const debounceRef = useRef(0)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!trimmedKey) { setPreview(null); setMsg(''); return }
    debounceRef.current = setTimeout(() => { fetchPreview() }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [trimmedKey, fetchPreview])

  async function deletePin() {
    setMsg('')
    if (!trimmedKey) return setMsg('Enter a UUID or slug.')
    if (!code) return setMsg('Enter the admin PIN.')
    if (code !== adminPin) return setMsg('Invalid PIN.')

    if (!confirm(`Delete pin ${isUuid ? 'ID' : 'slug'} "${trimmedKey}"?\nThis cannot be undone.`)) return

    setLoading(true)
    try {
      // Return the deleted row so we can show which one it was
      let q = supabase.from('pins').delete().select().limit(1)
      q = isUuid ? q.eq('id', trimmedKey) : q.eq('slug', trimmedKey)
      const { data, error } = await q

      if (error) {
        setMsg(error.message || 'Delete failed.')
        return
      }
      if (!data || data.length === 0) {
        setMsg('Nothing deleted (no matching record).')
        return
      }
      const d = data[0]
      setMsg(`Deleted: ${d.slug || d.id} (${d.team || d.continent || 'n/a'})`)
      setPreview(null)
      setKey('')
    } catch (e) {
      // Helpful hint for offline / CORS / env noise
      const hint = (e?.message || '').includes('Failed to fetch')
        ? ' Are you offline or is the project URL blocked?'
        : ''
      setMsg(`Delete failed: ${e?.message || e}${hint}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2>Admin</h2>
      <p style={{ marginTop: 4, color: '#a7b0b8' }}>
        Enter a pin <b>UUID</b> or <b>slug</b> to preview and delete.
      </p>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 200px auto' }}>
        <input
          placeholder="Pin UUID or slug"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') deletePin() }}
        />
        <input
          placeholder="Admin PIN"
          type="password"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') deletePin() }}
        />
        <button onClick={deletePin} disabled={!isReady}>
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {/* Preview card */}
      {preview && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: '1px solid #2a2f37',
            borderRadius: 10,
            background: '#16181d'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Deleting: {preview.slug || preview.id}
          </div>

          <div style={{ display: 'grid', gap: 6, gridTemplateColumns: '160px 1fr' }}>
            <div style={{ color: '#a7b0b8' }}>Source</div><div>{preview.source || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Team</div><div>{preview.team || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Continent</div><div>{preview.continent || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Name</div><div>{preview.name || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Neighborhood</div><div>{preview.neighborhood || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Hot dog stand</div><div>{preview.hotdog || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Note</div><div>{preview.note || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>Coords</div>
            <div>
              {Number.isFinite(preview.lat) && Number.isFinite(preview.lng)
                ? `${preview.lat.toFixed(5)}, ${preview.lng.toFixed(5)}`
                : '—'}
            </div>
            <div style={{ color: '#a7b0b8' }}>Created</div><div>{preview.created_at || '—'}</div>
            <div style={{ color: '#a7b0b8' }}>ID</div><div>{preview.id || '—'}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, minHeight: 22 }}>
        {msg && <span>{msg}</span>}
      </div>
    </div>
  )
}
