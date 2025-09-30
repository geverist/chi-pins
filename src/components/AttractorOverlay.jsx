export default function AttractorOverlay({ onDismiss }) {
  return (
    <div className="attractor-overlay" onClick={onDismiss}>
      <div
        className="cta glass"
        style={{
          position:'relative',
          padding:'14px 18px',
          borderRadius:12,
          textAlign:'center',
          maxWidth:'min(92vw, 520px)',
        }}
      >
        Tap the map to drop your pin

        {/* Attached mini bubble */}
        <div
          className="cta-mini glass"
          style={{
            position:'absolute',
            left:'50%',
            transform:'translateX(-50%)',
            top:'100%',
            marginTop:8,
            padding:'6px 10px',
            borderRadius:10,
            fontSize:14,
            lineHeight:1.2,
            whiteSpace:'nowrap',
          }}
        >
          Pinch to zoom in
          {/* tiny “tail” to attach bubbles */}
          <div
            aria-hidden
            style={{
              position:'absolute',
              top:-6,
              left:'50%',
              transform:'translateX(-50%)',
              width:0, height:0,
              borderLeft:'6px solid transparent',
              borderRight:'6px solid transparent',
              borderBottom:'6px solid rgba(255,255,255,0.14)', // matches glass border
              opacity:0.9,
              pointerEvents:'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
