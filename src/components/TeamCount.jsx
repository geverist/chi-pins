export default function TeamCount({ pins }){
  const counts = pins.reduce((a,p)=> (a[p.team||'other']=(a[p.team||'other']||0)+1, a), {cubs:0,whitesox:0,other:0})
  return (
    <div className="counts" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <span>🔵 Cubs: {counts.cubs}</span>
      <span>⚪ White Sox: {counts.whitesox}</span>
      <span>⚫ Other: {counts.other}</span>
    </div>
  )
}
