// src/components/RecentPinsTable.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'

export default function RecentPinsTable({ pins = [], onSelect }) {
  // Sort newest first (tolerate missing created_at)
  const rows = useMemo(() => {
    const safe = Array.isArray(pins) ? pins.slice() : []
    safe.sort((a, b) => {
      const ta = a?.created_at ? Date.parse(a.created_at) : 0
      const tb = b?.created_at ? Date.parse(b.created_at) : 0
      return tb - ta
    })
    return safe
  }, [pins])

  if (!rows.length) {
    return (
      <div style={{ padding: 12, textAlign: 'center', color: '#a7b0b8' }}>
        No pins yet.
      </div>
    )
  }

  return (
    <div className="admin-list" style={{ padding: 12, maxHeight: '100%', overflow: 'auto' }}>
      {rows.map((p) => {
        const key = p.id || p.slug || `${p.lat},${p.lng},${p.created_at || ''}`
        const when = p.created_at ? new Date(p.created_at).toLocaleString() : '—'
        const preview = (p.note || '').trim()
        return (
          <button
            key={key}
            className="admin-list-item"
            onClick={() => onSelect?.(p)}
            style={{
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              background: '#16181d',
            }}
          >
            <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name || 'Guest'}
                </strong>
                <small className="muted" style={{ flexShrink: 0 }}>{when}</small>
              </div>
              {p.neighborhood && (
                <div style={{ fontSize: 14 }}>
                  <small className="muted">Neighborhood: </small>{p.neighborhood}
                </div>
              )}
              {p.hotdog && (
                <div style={{ fontSize: 14 }}>
                  <small className="muted">Favorite Stand: </small>{p.hotdog}
                </div>
              )}
              <div style={{
                fontSize: 14,
                color: '#e5e7eb',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {preview || '—'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
