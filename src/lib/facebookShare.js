// Optional stub — wire to your backend route if needed.
export async function postToFacebook({ lat, lng, note, source, slug }) {
  try {
    // const res = await fetch('/api/share-to-facebook', { ... })
    // if (!res.ok) throw new Error('Share failed')
    console.info('[FB Share] (stub) Would share to Facebook:', { lat, lng, note, source, slug })
    return false
  } catch (err) {
    console.warn('Facebook share failed:', err)
    return false
  }
}
