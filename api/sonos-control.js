// api/sonos-control.js
// Vercel serverless function to control Sonos speakers

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { SONOS_API_URL, SONOS_API_KEY, SONOS_SPEAKER_ID } = process.env;

  if (!SONOS_API_URL || !SONOS_SPEAKER_ID) {
    return res.status(500).json({ error: 'Sonos not configured' });
  }

  try {
    const { action, trackUri, volume, position } = req.method === 'POST' ? req.body : req.query;

    let endpoint = '';
    let method = 'POST';
    let body = null;

    switch (action) {
      case 'play':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/play`;
        if (trackUri) {
          body = { trackUri };
        }
        break;

      case 'pause':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/pause`;
        break;

      case 'next':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/next`;
        break;

      case 'previous':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/previous`;
        break;

      case 'add-to-queue':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/queue`;
        body = { trackUri, position: position || 'end' };
        break;

      case 'set-volume':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/volume`;
        body = { volume: parseInt(volume) };
        break;

      case 'get-status':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/status`;
        method = 'GET';
        break;

      case 'get-queue':
        endpoint = `/speakers/${SONOS_SPEAKER_ID}/queue`;
        method = 'GET';
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(`${SONOS_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(SONOS_API_KEY && { 'X-API-Key': SONOS_API_KEY }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Sonos API error:', errorData);
      return res.status(response.status).json({
        error: 'Sonos control failed',
        details: errorData
      });
    }

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error controlling Sonos:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
