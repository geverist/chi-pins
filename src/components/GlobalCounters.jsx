// src/components/GlobalCounters.jsx
const labels = {
  chicago: 'Chicago',
  na: 'North America',
  sa: 'South America',
  eu: 'Europe',
  af: 'Africa',
  as: 'Asia',
}

const dot = (bg) => ({
  display:'inline-block', width:10, height:10, borderRadius:999,
  background:bg, marginRight:6, border:'1px solid rgba(0,0,0,0.3)'
})

// color tokens should align with your iconFor continent colors (set in CSS or mapUtils)
const colors = {
  chicago: '#2a6ae0',
  na: '#2aa876',
  sa: '#f2a516',
  eu: '#d96b6b',
  af: '#9966cc',
  as: '#5bb8ff',
}

export default function GlobalCounters({ counts = {} }) {
  const chip = (key) => (
    <span
      key={key}
      style={{
        display:'inline-flex', alignItems:'center', gap:8,
        padding:'8px 10px', borderRadius:12,
        border:'1px solid #2a2f37',
        background:'linear-gradient(#1f242b, #171b20)',
        color:'#f4f6f8', fontSize:14
      }}
      title={`${labels[key]}: ${counts[key] ?? 0}`}
    >
      <i style={dot(colors[key])} />
      {labels[key]}: {counts[key] ?? 0}
    </span>
  )

  return (
    <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
      {['chicago','na','sa','eu','af','as'].map(chip)}
    </div>
  )
}
