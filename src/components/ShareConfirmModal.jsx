export default function ShareConfirmModal({
  open,
  onCancel,
  onConfirm,
  shareToFb,
  setShareToFb,
  draft,
  form,
  mapMode,
  facebookShareEnabled = false
}) {
  if (!open) return null
  return (
    <div
      className="share-modal"
      role="dialog"
      aria-modal="true"
      style={{
        position:'fixed', inset:0, zIndex:5000,
        background:'rgba(0,0,0,0.45)',
        display:'grid', placeItems:'center', padding:'16px'
      }}
      onClick={onCancel}
    >
      <div
        className="share-card"
        style={{
          width:'min(520px, 96vw)',
          background:'#11141a', color:'#f3f5f7',
          border:'1px solid #2a2f37', borderRadius:12,
          padding:'16px', boxShadow:'0 10px 30px rgba(0,0,0,0.45)'
        }}
        onClick={(e)=>e.stopPropagation()}
      >
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <h3 style={{margin:0}}>Post your pin?</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{border:'1px solid #2a2f37', background:'#1a1e25', color:'#f3f5f7', borderRadius:8, padding:'4px 8px'}}
          >
            ✕
          </button>
        </div>

        <p style={{margin:'12px 0 10px', opacity:0.9, lineHeight:1.4}}>
          You're about to add a pin {mapMode === 'global' ? 'on the global map' : 'in Chicagoland'}.
          {facebookShareEnabled && (
            <>
              {' '}You can also share a pin card image to the
              <strong> Chicago Mike's</strong> Facebook page.
            </>
          )}
        </p>

        {facebookShareEnabled && (
          <label style={{display:'flex', gap:10, alignItems:'start', margin:'10px 0 6px', cursor:'pointer'}}>
            <input
              type="checkbox"
              checked={shareToFb}
              onChange={(e)=> setShareToFb(e.target.checked)}
              style={{ marginTop:4 }}
            />
            <span>Share pin card image to Chicago Mike's Facebook page</span>
          </label>
        )}

        <div style={{
          marginTop:8, padding:'8px 10px', borderRadius:8,
          background:'#171a21', border:'1px solid #2a2f37', color:'#c8ccd2',
          fontSize:13, lineHeight:1.35
        }}>
          <strong>Disclaimer:</strong> No personal information will be shared.
          {facebookShareEnabled ? (
            <>
              {' '}We'll post a card image with the location emoji, your note text, and a small map view.
              No names, phone numbers, or other personal details are included.
            </>
          ) : (
            <>
              {' '}We'll only post the approximate map location and the text you enter in <em>Notes</em>.
              Your name is optional and not required for posting.
            </>
          )}
        </div>

        <div style={{marginTop:12, fontSize:13, color:'#aeb5bd'}}>
          <div><small>Location:</small> {draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : '—'}</div>
          <div><small>Notes:</small> {form?.note?.trim() || '(none)'}</div>
        </div>

        <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:14}}>
          <button
            onClick={onCancel}
            style={{border:'1px solid #2a2f37', background:'#1a1e25', color:'#f3f5f7', borderRadius:8, padding:'8px 12px'}}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{border:'1px solid #2f7bdc', background:'#2a6ae0', color:'#fff', borderRadius:8, padding:'8px 12px'}}
          >
            Post pin {shareToFb ? 'and share' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
