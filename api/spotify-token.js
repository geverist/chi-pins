// api/spotify-token.js
// Secure backend endpoint for Spotify authentication
// Keeps Client Secret on server, only returns access token to client

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Spotify credentials from environment variables (secure, backend-only)
    // Trim to remove any whitespace/newlines that may have been added
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      console.error('Spotify credentials not configured in environment variables');
      return res.status(500).json({
        error: 'Spotify not configured',
        details: 'Administrator needs to configure Spotify credentials'
      });
    }

    // Request access token from Spotify using Client Credentials Flow
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Spotify token error:', errorData);
      return res.status(tokenResponse.status).json({
        error: 'Failed to get Spotify token',
        details: errorData.error_description || 'Unknown error'
      });
    }

    const tokenData = await tokenResponse.json();

    // Only return the access token to the client (not the secret!)
    return res.status(200).json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
    });

  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
