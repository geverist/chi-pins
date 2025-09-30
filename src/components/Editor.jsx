// src/components/Editor.jsx
export default function Editor({
  mapMode,
  slug,
  form,
  setForm,
  hotdogSuggestions = [],
  onCancel,
  onOpenShare,
}) {
  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const digitsOnly = String(form.loyaltyPhone || '').replace(/\D+/g, '')
  const phoneLooksValid = digitsOnly.length >= 10 && digitsOnly.length <= 15

  const commonSlugBadge = (
    <div
      className="slug-badge"
      title="This is the permanent ID for your pin"
      style={{
        background: '#16181d',
        border: '1px solid #2a2f37',
        borderRadius: 999,
        padding: '8px 12px',
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        color: 'var(--muted)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {slug ? `🆔 ${slug}` : '🆔 generating…'}
    </div>
  )

  const ActionButtons = (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
      <button onClick={onOpenShare}>Add My Pin</button>
      <button className="cancel" onClick={onCancel}>Cancel</button>
    </div>
  )

  // Single row for name / neighborhood / hotdog / notes (with notes given more width)
  const InlineFieldsChicago = (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gap: 10,
        // Make the last track (notes) wider to fill the row
        gridTemplateColumns:
          'minmax(180px,1fr) minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
      }}
    >
      <input
        placeholder="Your name (optional)"
        value={form.name || ''}
        onChange={(e) => update({ name: e.target.value })}
      />

      <input
        placeholder="Neighborhood (optional)"
        value={form.neighborhood || ''}
        onChange={(e) => update({ neighborhood: e.target.value })}
      />

      <div style={{ display: 'contents' }}>
        <input
          list="hotdog-stand-suggestions"
          placeholder="Favorite hot dog stand (search or create)"
          value={form.hotdog || ''}
          onChange={(e) => update({ hotdog: e.target.value })}
        />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {/* Notes stays a single-line input but now gets extra width via grid */}
      <input
        placeholder="Leave a note for other guests (optional, 280 chars)"
        maxLength={280}
        value={form.note || ''}
        onChange={(e) => update({ note: e.target.value })}
      />
    </div>
  )

  // Global: no neighborhood, so just 3 columns with the last (notes) wider
  const InlineFieldsGlobal = (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'minmax(180px,1fr) minmax(200px,1fr) minmax(260px,2fr)',
      }}
    >
      <input
        placeholder="Your name (optional)"
        value={form.name || ''}
        onChange={(e) => update({ name: e.target.value })}
      />

      <div style={{ display: 'contents' }}>
        <input
          list="hotdog-stand-suggestions"
          placeholder="Favorite hot dog stand (search or create)"
          value={form.hotdog || ''}
          onChange={(e) => update({ hotdog: e.target.value })}
        />
        <datalist id="hotdog-stand-suggestions">
          {hotdogSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <input
        placeholder="Leave a note for other guests (optional, 280 chars)"
        maxLength={280}
        value={form.note || ''}
        onChange={(e) => update({ note: e.target.value })}
      />
    </div>
  )

  if (mapMode === 'chicago') {
    return (
      <div
        className="form"
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          maxHeight: '48vh',
          overflow: 'auto',
          paddingTop: 2,
        }}
      >
        {/* Header row: Teams | ID badge | Actions */}
        <div
          className="teamsRow"
          style={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div className="teams" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['cubs', 'whitesox', 'other'].map((t) => (
              <button
                key={t}
                className={form.team === t ? 'on' : ''}
                onClick={() => update({ team: t })}
              >
                {t === 'cubs' ? '🔵 Cubs' : t === 'whitesox' ? '⚪ White Sox' : '⚫ Other'}
              </button>
            ))}
          </div>
          <div style={{ justifySelf: 'center' }}>{commonSlugBadge}</div>
          <div style={{ justifySelf: 'end' }}>{ActionButtons}</div>
        </div>

        {InlineFieldsChicago}

        {/* ⭐ Loyalty phone (optional) */}
        <div
          style={{
            gridColumn: '1 / -1',
            border: '1px solid #2a2f37',
            borderRadius: 12,
            padding: 12,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <strong>Link your loyalty phone (optional)</strong>
          </div>
          <div style={{ color: '#a7b0b8', fontSize: 13 }}>
            Add the phone number tied to your loyalty account to earn a star with this pin.
          </div>

          <div
            style={{
              display: 'grid',
              gap: 8,
              gridTemplateColumns: 'minmax(220px, 1fr) auto',
              alignItems: 'center',
            }}
          >
            <input
              type="tel"
              inputMode="tel"
              placeholder="(312) 555-1234"
              value={form.loyaltyPhone || ''}
              onChange={(e) => update({ loyaltyPhone: e.target.value })}
            />
            <span
              style={{
                fontSize: 13,
                color: phoneLooksValid ? '#9AE6B4' : '#a7b0b8',
              }}
            >
              {phoneLooksValid ? '⭐ You’ll earn a star for linking' : 'Enter at least 10 digits'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // GLOBAL (no team, no neighborhood)
  return (
    <div
      className="form"
      style={{
        display: 'grid',
        gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
        maxHeight: '48vh',
        overflow: 'auto',
        paddingTop: 2,
      }}
    >
      {/* Header row (global): ID badge | Actions */}
      <div
        style={{
          gridColumn: '1 / -1',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ justifySelf: 'center' }}>{commonSlugBadge}</div>
        <div style={{ justifySelf: 'end' }}>{ActionButtons}</div>
      </div>

      {InlineFieldsGlobal}

      {/* ⭐ Loyalty phone (optional) */}
      <div
        style={{
          gridColumn: '1 / -1',
          border: '1px solid #2a2f37',
          borderRadius: 12,
          padding: 12,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <strong>Link your loyalty phone (optional)</strong>
        </div>
        <div style={{ color: '#a7b0b8', fontSize: 13 }}>
          Add the phone number tied to your loyalty account to earn a star with this pin.
        </div>

        <div
          style={{
            display: 'grid',
            gap: 8,
            gridTemplateColumns: 'minmax(220px, 1fr) auto',
            alignItems: 'center',
          }}
        >
          <input
            type="tel"
            inputMode="tel"
            placeholder="(312) 555-1234"
            value={form.loyaltyPhone || ''}
            onChange={(e) => update({ loyaltyPhone: e.target.value })}
          />
          <span
            style={{
              fontSize: 13,
              color: phoneLooksValid ? '#9AE6B4' : '#a7b0b8',
            }}
          >
            {phoneLooksValid ? '⭐ You’ll earn a star for linking' : 'Enter at least 10 digits'}
          </span>
        </div>
      </div>
    </div>
  )
}
