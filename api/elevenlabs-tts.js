// api/elevenlabs-tts.js
/**
 * ElevenLabs Text-to-Speech API for Twilio Phone Integration
 *
 * This endpoint generates speech audio using ElevenLabs and returns it
 * in a format compatible with Twilio's <Play> verb.
 *
 * Used by Twilio phone system to speak AI responses with natural voices.
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both POST body and GET query params (for Twilio <Play> verb)
    const { text, apiKey, voiceId, model, stability, similarity } =
      req.method === 'GET' ? req.query : req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    // Call ElevenLabs API
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: model || 'eleven_turbo_v2_5',
        voice_settings: {
          stability: stability ?? 0.5,
          similarity_boost: similarity ?? 0.75,
        },
        output_format: 'mp3_44100_128', // 128kbps MP3 at 44.1kHz (Twilio compatible)
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] API error:', response.status, error);
      return res.status(response.status).json({ error: `ElevenLabs API error: ${error}` });
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();

    // Return audio file directly (Twilio can fetch this URL)
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[ElevenLabs] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
