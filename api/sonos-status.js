// api/sonos-status.js
// Vercel serverless function to get current Sonos playback status

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

  const { SONOS_API_URL, SONOS_API_KEY, SONOS_SPEAKER_ID } = process.env;

  if (!SONOS_API_URL || !SONOS_SPEAKER_ID) {
    return res.status(500).json({ error: 'Sonos not configured' });
  }

  try {
    // Get current playback status
    const statusResponse = await fetch(`${SONOS_API_URL}/speakers/${SONOS_SPEAKER_ID}/status`, {
      headers: {
        'Content-Type': 'application/json',
        ...(SONOS_API_KEY && { 'X-API-Key': SONOS_API_KEY }),
      },
    });

    if (!statusResponse.ok) {
      console.error('Sonos status error:', statusResponse.status);
      return res.status(statusResponse.status).json({ error: 'Failed to get status' });
    }

    const status = await statusResponse.json();

    // Get current queue
    const queueResponse = await fetch(`${SONOS_API_URL}/speakers/${SONOS_SPEAKER_ID}/queue`, {
      headers: {
        'Content-Type': 'application/json',
        ...(SONOS_API_KEY && { 'X-API-Key': SONOS_API_KEY }),
      },
    });

    const queue = queueResponse.ok ? await queueResponse.json() : { items: [] };

    return res.status(200).json({
      playbackState: status.playbackState || 'STOPPED',
      currentTrack: status.currentTrack || null,
      volume: status.volume || 50,
      queue: queue.items || [],
      position: status.position || 0,
      duration: status.duration || 0,
    });
  } catch (error) {
    console.error('Error fetching Sonos status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
