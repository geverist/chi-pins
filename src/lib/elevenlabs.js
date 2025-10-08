// src/lib/elevenlabs.js
/**
 * ElevenLabs Text-to-Speech Integration
 *
 * Provides high-quality voice synthesis for:
 * - Kiosk voice assistant responses
 * - Phone call voice responses via Twilio
 *
 * Requires:
 * - ElevenLabs API key
 * - Voice ID (can be different for kiosk vs phone)
 */

/**
 * Generate speech audio from text using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Configuration options
 * @param {string} options.apiKey - ElevenLabs API key
 * @param {string} options.voiceId - Voice ID to use
 * @param {string} options.model - Model ID (default: eleven_turbo_v2_5)
 * @param {number} options.stability - Voice stability 0-1 (default: 0.5)
 * @param {number} options.similarity - Similarity boost 0-1 (default: 0.75)
 * @param {string} options.outputFormat - Audio format (default: mp3_44100_128)
 * @returns {Promise<ArrayBuffer>} Audio data
 */
export async function textToSpeech(text, options = {}) {
  const {
    apiKey,
    voiceId,
    model = 'eleven_turbo_v2_5',
    stability = 0.5,
    similarity = 0.75,
    outputFormat = 'mp3_44100_128',
  } = options;

  if (!apiKey) {
    throw new Error('ElevenLabs API key is required');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required');
  }

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
      model_id: model,
      voice_settings: {
        stability,
        similarity_boost: similarity,
      },
      output_format: outputFormat,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return await response.arrayBuffer();
}

/**
 * Play audio from ElevenLabs in the browser
 * @param {string} text - Text to speak
 * @param {Object} options - Same as textToSpeech options
 * @returns {Promise<void>}
 */
export async function speak(text, options = {}) {
  const audioData = await textToSpeech(text, options);
  const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(audioBlob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };

    audio.play().catch(reject);
  });
}

/**
 * Generate speech audio and return as base64 (for Twilio phone integration)
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Same as textToSpeech options
 * @returns {Promise<string>} Base64 encoded audio
 */
export async function textToSpeechBase64(text, options = {}) {
  const audioData = await textToSpeech(text, options);
  const base64 = btoa(
    new Uint8Array(audioData).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return base64;
}

/**
 * Generate speech audio and save to public URL (for Twilio <Play> verb)
 * This requires a backend endpoint to save the file
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Same as textToSpeech options
 * @returns {Promise<string>} Public URL to audio file
 */
export async function textToSpeechUrl(text, options = {}) {
  const audioData = await textToSpeech(text, options);

  // Send audio to backend to save and return public URL
  const response = await fetch('/api/elevenlabs/save-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: Array.from(new Uint8Array(audioData)),
      text: text.substring(0, 50), // First 50 chars for filename
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save audio file');
  }

  const { url } = await response.json();
  return url;
}

/**
 * Get available voices from ElevenLabs
 * @param {string} apiKey - ElevenLabs API key
 * @returns {Promise<Array>} Array of voice objects
 */
export async function getVoices(apiKey) {
  if (!apiKey) {
    throw new Error('ElevenLabs API key is required');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}

/**
 * Check if ElevenLabs should be used based on settings
 * @param {Object} settings - Admin settings object
 * @returns {boolean}
 */
export function shouldUseElevenLabs(settings) {
  return (
    settings?.ttsProvider === 'elevenlabs' &&
    settings?.elevenlabsApiKey &&
    settings?.elevenlabsVoiceId
  );
}

/**
 * Get ElevenLabs options from settings (for kiosk)
 * @param {Object} settings - Admin settings object
 * @returns {Object} Options for textToSpeech function
 */
export function getElevenLabsOptions(settings) {
  return {
    apiKey: settings.elevenlabsApiKey,
    voiceId: settings.elevenlabsVoiceId,
    model: settings.elevenlabsModel || 'eleven_turbo_v2_5',
    stability: settings.elevenlabsStability ?? 0.5,
    similarity: settings.elevenlabsSimilarity ?? 0.75,
  };
}

/**
 * Get ElevenLabs options for phone calls
 * @param {Object} settings - Admin settings object
 * @returns {Object} Options for textToSpeech function
 */
export function getElevenLabsPhoneOptions(settings) {
  return {
    apiKey: settings.elevenlabsApiKey,
    voiceId: settings.elevenlabsPhoneVoiceId || settings.elevenlabsVoiceId,
    model: settings.elevenlabsModel || 'eleven_turbo_v2_5',
    stability: settings.elevenlabsStability ?? 0.5,
    similarity: settings.elevenlabsSimilarity ?? 0.75,
  };
}
