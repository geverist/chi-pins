// api/jukebox-library.js
// Vercel serverless function to fetch music library from local media server

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { MEDIA_SERVER_URL, MEDIA_SERVER_API_KEY } = process.env;

  if (!MEDIA_SERVER_URL) {
    return res.status(500).json({ error: 'Media server not configured' });
  }

  try {
    const { search, genre, artist, limit = 50, offset = 0 } = req.query;

    // Build query parameters for media server
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(search && { search }),
      ...(genre && { genre }),
      ...(artist && { artist }),
    });

    // Fetch from media server (e.g., Plex, Jellyfin, or custom server)
    const response = await fetch(`${MEDIA_SERVER_URL}/api/music/library?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(MEDIA_SERVER_API_KEY && { 'X-API-Key': MEDIA_SERVER_API_KEY }),
      },
    });

    if (!response.ok) {
      console.error('Media server error:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'Failed to fetch music library',
        details: response.statusText
      });
    }

    const data = await response.json();

    // Transform to standard format
    const tracks = (data.tracks || data.items || []).map(track => ({
      id: track.id || track.key,
      title: track.title || track.name,
      artist: track.artist || track.artistName || 'Unknown Artist',
      album: track.album || track.albumName || '',
      duration: track.duration || 0,
      genre: track.genre || '',
      year: track.year || null,
      artworkUrl: track.artworkUrl || track.thumb || null,
      uri: track.uri || track.url,
    }));

    return res.status(200).json({
      tracks,
      total: data.total || tracks.length,
      offset: data.offset || offset,
      limit: data.limit || limit,
    });
  } catch (error) {
    console.error('Error fetching music library:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
