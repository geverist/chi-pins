// src/components/Toast.jsx
export default function Toast({ title, text, onClose }) {
  return (
    <div
      style={{
        position:'absolute', top:12, right:12, zIndex:4000,
        maxWidth: 360,
        background:'rgba(16,17,20,0.82)',
        border:'1px solid rgba(255,255,255,0.14)',
        borderRadius:12,
        padding:'10px 12px',
        backdropFilter:'blur(4px)',
        WebkitBackdropFilter:'blur(4px)',
        boxShadow:'0 6px 18px rgba(0,0,0,0.35)',
        color:'#f4f6f8'
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{display:'flex', alignItems:'start', gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700, marginBottom:2}}>
            {title}
          </div>
          <div style={{opacity:0.9, lineHeight:1.35}}>
            {text}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          style={{
            border:'1px solid #2a2f37',
            background:'#20232a',
            color:'#f4f6f8',
            borderRadius:8,
            padding:'4px 8px',
            cursor:'pointer'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
