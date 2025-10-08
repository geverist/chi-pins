// src/components/HeaderBar.jsx
import { useEffect, useState } from 'react'
import { useLogo } from '../hooks/useLogo'
import defaultLogoUrl from '../assets/logo.png'

const PIN_COLOR = {
  chicago:  '#0ea5e9',
  na:       '#3b82f6',
  sa:       '#ef4444',
  eu:       '#22c55e',
  af:       '#f59e0b',
  as:       '#a855f7',
}

function InlineCount({ color, label, count, onClick }) {
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          display:'inline-flex',
          alignItems:'center',
          gap:6,
          whiteSpace:'nowrap',
          background:'transparent',
          border:'none',
          padding:'4px 8px',
          borderRadius:8,
          cursor:'pointer',
          transition:'background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        title={`Center map on ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
      {content}
    </span>
  );
}

export default function HeaderBar({
  mapMode,
  totalCount = 0,
  onGlobal,
  onChicago,
  children,
  logoSrc: logoSrcProp,
  onLogoClick,
  continentCounts = null,
  onContinentClick,
  /** Optional: force mobile mode from parent. If omitted, we detect by width. */
  isMobile: isMobileProp,
  /** Mobile table view toggle */
  showTableView = false,
  onToggleView,
}) {
  // Fetch uploaded logo from Supabase
  const { logoUrl: uploadedLogoUrl } = useLogo()

  // Use uploaded logo if available, otherwise fall back to prop or default
  const logoSrc = uploadedLogoUrl || logoSrcProp || defaultLogoUrl

  // If isMobile not provided, detect via media query
  const [isMobileDetected, setIsMobileDetected] = useState(false)
  useEffect(() => {
    if (typeof isMobileProp === 'boolean') return
    const mq = () =>
      typeof window !== 'undefined'
        ? window.matchMedia('(max-width: 768px)').matches
        : false
    const update = () => setIsMobileDetected(mq())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [isMobileProp])
  const isMobile = typeof isMobileProp === 'boolean' ? isMobileProp : isMobileDetected

  const switchBtnStyle = (pressed) => ({
    padding:'10px 12px', borderRadius:12,
    border:'1px solid #2a2f37',
    background: pressed ? 'linear-gradient(#242a33, #1a1f26)' : 'linear-gradient(#1f242b, #171b20)',
    color:'#f4f6f8', boxShadow: pressed
      ? 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)'
      : '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  })

  // ---------- Mobile header: title + view toggle ----------
  if (isMobile) {
    return (
      <header
        style={{
          display:'flex', alignItems:'center', gap:12, justifyContent:'space-between',
          flexWrap:'nowrap', padding:'10px 14px', position:'relative',
          borderBottom:'1px solid #222',
          zIndex: 500, // Above voice assistant (300) and other overlays
        }}
      >
        {/* Optional logo button keeps the same behavior but is not required */}
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
        ) : <span style={{ width:0 }} />}

        <h1
          style={{
            margin:0,
            fontSize:'clamp(14px, 4vw, 18px)',
            whiteSpace:'nowrap',
            textAlign:'center',
            flex:1
          }}
        >
          Chicago Mike&apos;s Pin Entries
        </h1>

        {/* View toggle button */}
        {onToggleView && (
          <button
            onClick={onToggleView}
            title={showTableView ? 'Show Map View' : 'Show Table View'}
            aria-label={showTableView ? 'Show Map View' : 'Show Table View'}
            style={{
              display:'inline-flex',
              alignItems:'center',
              justifyContent:'center',
              padding:'6px 12px',
              borderRadius:8,
              border:'1px solid #2a2f37',
              background: showTableView
                ? 'linear-gradient(#242a33, #1a1f26)'
                : 'linear-gradient(#1f242b, #171b20)',
              color:'#f4f6f8',
              cursor:'pointer',
              fontSize:18,
              boxShadow: showTableView
                ? 'inset 0 2px 6px rgba(0,0,0,0.5)'
                : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {showTableView ? '🗺️' : '📋'}
          </button>
        )}
      </header>
    )
  }

  // ---------- Desktop/kiosk header (unchanged) ----------
  return (
    <header
      style={{
        display:'flex', alignItems:'center', gap:12, justifyContent:'space-between',
        flexWrap:'wrap', padding:'10px 14px', position:'relative',
        borderBottom:'1px solid #222',
        zIndex: 500, // Above voice assistant (300) and other overlays
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
          {mapMode === 'global'
            ? 'Where in the world are you from?'
            : 'Where in Chicago are you from?'}
        </h1>

        <span style={{ display:'inline-flex', alignItems:'center', gap:6, marginLeft:10 }}>
          <span>📍</span>
          <strong style={{ fontWeight:700 }}>{totalCount}</strong>
        </span>
      </div>

      {/* Right: continent counts (inline, no boxes) + children + switch */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {mapMode === 'global' && continentCounts && (
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <InlineCount color={PIN_COLOR.chicago} label="Chicago"       count={continentCounts.chicago} onClick={() => onContinentClick?.('chicago')} />
            <InlineCount color={PIN_COLOR.na}      label="North America" count={continentCounts.na}      onClick={() => onContinentClick?.('na')} />
            <InlineCount color={PIN_COLOR.sa}      label="South America" count={continentCounts.sa}      onClick={() => onContinentClick?.('sa')} />
            <InlineCount color={PIN_COLOR.eu}      label="Europe"        count={continentCounts.eu}      onClick={() => onContinentClick?.('eu')} />
            <InlineCount color={PIN_COLOR.as}      label="Asia"          count={continentCounts.as}      onClick={() => onContinentClick?.('as')} />
            <InlineCount color={PIN_COLOR.af}      label="Africa"        count={continentCounts.af}      onClick={() => onContinentClick?.('af')} />
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
