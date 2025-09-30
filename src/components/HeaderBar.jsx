// src/components/HeaderBar.jsx
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
  onGlobal,        // kept for compatibility (ignored)
  onChicago,       // kept for compatibility (ignored)
  children,        // put your Map/Table toggle here
  logoSrc,
  onLogoClick,
  continentCounts = null,
  titleOverride,
}) {
  const title =
    titleOverride ||
    (mapMode === 'global'
      ? 'Where in the world are you from?'
      : 'Where in Chicago(land) are you from?')

  return (
    <header
      style={{
        display:'grid',
        gridTemplateColumns:'1fr',
        gridTemplateRows:'auto auto',
        rowGap:8,
        padding:'10px 14px',
        position:'relative',
        borderBottom:'1px solid #222',
      }}
    >
      {/* Top row: logo + title + total + (optional) continent counts */}
      <div
        style={{
          display:'flex',
          alignItems:'center',
          gap:12,
          justifyContent:'space-between',
          flexWrap:'wrap'
        }}
      >
        {/* Left: logo + title + total */}
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex: '1 1 auto' }}>
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

          <h1
            style={{
              margin:0,
              fontSize:'clamp(16px, 2.2vw, 22px)',
              whiteSpace:'nowrap',
              overflow:'hidden',
              textOverflow:'ellipsis'
            }}
          >
            {title}
          </h1>

          <span style={{ display:'inline-flex', alignItems:'center', gap:6, marginLeft:10, whiteSpace:'nowrap' }}>
            <span>📍</span>
            <strong style={{ fontWeight:700 }}>{totalCount}</strong>
          </span>
        </div>

        {/* Right: continent counts (only for global, optional) */}
        {mapMode === 'global' && continentCounts && (
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flex:'0 0 auto' }}>
            <InlineCount color={PIN_COLOR.chicago} label="Chicago"       count={continentCounts.chicago} />
            <InlineCount color={PIN_COLOR.na}      label="North America" count={continentCounts.na} />
            <InlineCount color={PIN_COLOR.sa}      label="South America" count={continentCounts.sa} />
            <InlineCount color={PIN_COLOR.eu}      label="Europe"        count={continentCounts.eu} />
            <InlineCount color={PIN_COLOR.as}      label="Asia"          count={continentCounts.as} />
            <InlineCount color={PIN_COLOR.af}      label="Africa"        count={continentCounts.af} />
          </div>
        )}
      </div>

      {/* Second row: centered custom controls (Map/Table toggle) */}
      {children && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center' }}>
          {children}
        </div>
      )}
    </header>
  )
}
