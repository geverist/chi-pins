// src/components/RecentPinsTable.jsx
import React, { useMemo } from 'react'

export default function RecentPinsTable({ pins = [], onSelect }) {
  const rows = useMemo(() => {
    const copy = Array.isArray(pins) ? [...pins] : []
    copy.sort((a, b) => (b?.created_at || '').localeCompare(a?.created_at || ''))
    return copy.slice(0, 250)
  }, [pins])

  if (!rows.length) {
    return (
      <div style={{ padding: 12, color: '#a7b0b8', background: 'var(--bg)', height: '100%' }}>
        No recent pins yet.
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: 8,
        display: 'grid',
        gap: 8,
        background: 'var(--bg)'  // ensure map is not visible underneath
      }}
    >
      {rows.map((r) => {
        const created = r.created_at ? new Date(r.created_at).toLocaleString() : '—'
        const noteShort = (r.note || '').length > 120 ? (r.note.slice(0, 120) + '…') : (r.note || '—')
        return (
          <button
            key={r.id || r.slug || `${r.lat},${r.lng},${r.created_at}`}
            className="card"
            style={{
              textAlign: 'left',
              display: 'grid',
              gap: 6,
              padding: 12,
              cursor: 'pointer'
            }}
            onClick={() => onSelect?.(r)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name || r.neighborhood || r.slug || 'Guest'}
              </strong>
              <small className="muted">{created}</small>
            </div>

            <div style={{ display: 'grid', gap: 4 }}>
              {r.neighborhood ? (
                <div>
                  <small className="muted">Neighborhood</small>
                  <div>{r.neighborhood}</div>
                </div>
              ) : null}

              {r.hotdog ? (
                <div>
                  <small className="muted">Favorite stand</small>
                  <div>{r.hotdog}</div>
                </div>
              ) : null}

              <div>
                <small className="muted">Note</small>
                <div style={{ whiteSpace: 'pre-wrap' }}>{noteShort}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, color: '#a7b0b8', fontSize: 12 }}>
              <span>Source: {r.source || '—'}</span>
              {r.continent ? <span>• {r.continent}</span> : null}
              {r.team ? <span>• {r.team}</span> : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
