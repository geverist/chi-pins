const PIN_COLOR = {
  chicago:  '#0ea5e9',
  na:       '#3b82f6',
  sa:       '#ef4444',
  eu:       '#22c55e',
  af:       '#f59e0b',
  as:       '#a855f7',
}

function InlineCount({ color, label, count }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
      <span
        aria-hidden
        style={{
          width:12, height:12, borderRadius:'50%',
          border:'2px solid #fff',
          background: color,
          boxShadow:'0 1px 2px rgba(0,0,0,0.35)',
          transform:'translateY(-1px)'
        }}
      />
      <span style={{ opacity:0.95 }}>
        <strong style={{ fontWeight:700 }}>{label}</strong>: {count ?? 0}
      </span>
    </span>
  )
}

export default function HeaderBar({
  mapMode,
  totalCount = 0,
  onGlobal,
  onChicago,
  children,
  logoSrc,
  onLogoClick,
  continentCounts = null,
  titleOverride, // optional: lets mobile say "Chicago Mike's Guest Pins"
}) {
  const switchBtnStyle = (pressed) => ({
    padding:'10px 12px', borderRadius:12,
    border:'1px solid #2a2f37',
    background: pressed ? 'linear-gradient(#242a33, #1a1f26)' : 'linear-gradient(#1f242b, #171b20)',
    color:'#f4f6f8', boxShadow: pressed
      ? 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)'
      : '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  })

  const titleText =
    titleOverride ??
    (mapMode === 'global'
      ? 'Where in the world are you from?'
      : 'Where in Chicago(land) are you from?')

  return (
    <header
      style={{
        display:'flex', alignItems:'center', gap:12, justifyContent:'space-between',
        flexWrap:'wrap', padding:'10px 14px', position:'relative',
        borderBottom:'1px solid #222',
      }}
    >
      {/* Left: logo + title + total */}
      <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
        {logoSrc ? (
          <button
            onClick={onLogoClick}
            title="Home"
            aria-label="Home"
            style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              padding:6, borderRadius:10, border:'1px solid #ddd',
              background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', cursor:'pointer',
            }}
          >
            <img src={logoSrc} alt="Logo" style={{ height:24, width:'auto', display:'block' }} />
          </button>
        ) : null}

        <h1 style={{ margin:0, fontSize:'clamp(16px, 2.2vw, 22px)', whiteSpace:'nowrap' }}>
          {titleText}
        </h1>

        <span style={{ display:'inline-flex', alignItems:'center', gap:6, marginLeft:10 }}>
          <span>📍</span>
          <strong style={{ fontWeight:700 }}>{totalCount}</strong>
        </span>
      </div>

      {/* Right: continent counts (inline) + children + view switch */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {mapMode === 'global' && continentCounts && (
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <InlineCount color={PIN_COLOR.chicago} label="Chicago"       count={continentCounts.chicago} />
            <InlineCount color={PIN_COLOR.na}      label="North America" count={continentCounts.na} />
            <InlineCount color={PIN_COLOR.sa}      label="South America" count={continentCounts.sa} />
            <InlineCount color={PIN_COLOR.eu}      label="Europe"        count={continentCounts.eu} />
            <InlineCount color={PIN_COLOR.as}      label="Asia"          count={continentCounts.as} />
            <InlineCount color={PIN_COLOR.af}      label="Africa"        count={continentCounts.af} />
          </div>
        )}

        {children}

        {mapMode === 'chicago' ? (
          <button type="button" onClick={onGlobal} style={switchBtnStyle(false)} title="Switch to Global map">
            🌎 Global map
          </button>
        ) : (
          <button type="button" onClick={onChicago} style={switchBtnStyle(true)} title="Back to Chicago">
            🏙️ Back to Chicago
          </button>
        )}
      </div>
    </header>
  )
}
