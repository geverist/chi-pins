// Optional stub — wire to your backend route if needed.
export async function postToFacebook({ lat, lng, note, source, slug, pinCardImageUrl }) {
  try {
    // const res = await fetch('/api/share-to-facebook', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ lat, lng, note, source, slug, pinCardImageUrl })
    // })
    // if (!res.ok) throw new Error('Share failed')
    console.info('[FB Share] (stub) Would share to Facebook:', {
      lat, lng, note, source, slug, pinCardImageUrl
    })
    return false
  } catch (err) {
    console.warn('Facebook share failed:', err)
    return false
  }
}
