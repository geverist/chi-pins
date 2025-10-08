// api/twilio-voice-webhook.js
/**
 * Twilio Voice Webhook for AI-Powered Phone Calls
 *
 * Handles incoming phone calls with AI responses using OpenAI + ElevenLabs.
 * When ElevenLabs is configured, uses natural AI voices instead of Twilio TTS.
 *
 * Flow:
 * 1. Receive call → Gather speech input
 * 2. Transcribe → Send to OpenAI
 * 3. Get AI response → Convert to speech with ElevenLabs
 * 4. Play audio → Repeat or end call
 */

import OpenAI from 'openai';
import twilio from 'twilio';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory session storage (for multi-turn conversations)
const sessions = new Map();

export default async function handler(req, res) {
  // Parse Twilio POST body
  const {
    CallSid,
    SpeechResult,
    Digits,
    From,
  } = req.body;

  console.log('[Twilio] Incoming request:', { CallSid, SpeechResult, Digits, From });

  const twiml = new VoiceResponse();

  try {
    // Get or create session
    let session = sessions.get(CallSid) || {
      conversationHistory: [],
      turnCount: 0,
    };

    // First call (no speech input yet)
    if (!SpeechResult && !Digits) {
      const greeting = "Hi! I'm your AI assistant. How can I help you today?";

      session.conversationHistory.push({
        role: 'assistant',
        content: greeting,
      });

      // Speak greeting and gather input
      await speakAndGather(twiml, greeting, req);

      session.turnCount++;
      sessions.set(CallSid, session);

      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    // User said something
    const userInput = SpeechResult || (Digits ? `Menu option ${Digits}` : '');

    if (!userInput) {
      await speakAndGather(twiml, "I didn't catch that. Could you please repeat?", req);
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    console.log('[Twilio] User input:', userInput);

    // Add to conversation history
    session.conversationHistory.push({
      role: 'user',
      content: userInput,
    });

    // Get AI response
    const aiResponse = await getAIResponse(session.conversationHistory);

    session.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
    });

    // Check if user wants to end call
    const endPhrases = ['goodbye', 'bye', 'hang up', 'end call', 'no thanks', 'that\'s all'];
    const shouldEnd = endPhrases.some(phrase => userInput.toLowerCase().includes(phrase));

    if (shouldEnd || session.turnCount >= 10) {
      // End the call
      await speakText(twiml, "Thank you for calling! Have a great day!", req);
      twiml.hangup();
      sessions.delete(CallSid);
    } else {
      // Continue conversation
      await speakAndGather(twiml, aiResponse, req);
      session.turnCount++;
      sessions.set(CallSid, session);
    }

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());

  } catch (error) {
    console.error('[Twilio] Error:', error);

    // Fallback error message
    twiml.say({
      voice: 'Polly.Joanna',
    }, "I'm sorry, I'm having trouble right now. Please try again later.");
    twiml.hangup();

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }
}

/**
 * Get AI response from OpenAI
 */
async function getAIResponse(conversationHistory) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful AI phone assistant. Keep responses brief and conversational (1-2 sentences max).
Be friendly and helpful. If asked about something you can't help with, politely redirect.`,
      },
      ...conversationHistory,
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
}

/**
 * Speak text using ElevenLabs or Twilio TTS, then gather input
 */
async function speakAndGather(twiml, text, req) {
  const gather = twiml.gather({
    input: 'speech dtmf',
    timeout: 3,
    speechTimeout: 'auto',
    action: req.url, // Post back to this same endpoint
  });

  await speakText(gather, text, req);
}

/**
 * Speak text using ElevenLabs if configured, otherwise Twilio TTS
 */
async function speakText(twimlElement, text, req) {
  // Check if ElevenLabs is configured (from admin settings)
  const useElevenLabs = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_PHONE_VOICE_ID;

  if (useElevenLabs) {
    try {
      // Generate audio URL using ElevenLabs
      const audioUrl = await generateElevenLabsAudio(text, req);

      // Play the audio
      twimlElement.play(audioUrl);

      return;
    } catch (error) {
      console.error('[Twilio] ElevenLabs error, falling back to Twilio TTS:', error);
      // Fall through to Twilio TTS
    }
  }

  // Fallback to Twilio TTS
  twimlElement.say({
    voice: 'Polly.Joanna',
  }, text);
}

/**
 * Generate ElevenLabs audio and return public URL
 */
async function generateElevenLabsAudio(text, req) {
  // Build full URL to our ElevenLabs TTS endpoint
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  const baseUrl = `${protocol}://${host}`;

  // The audio URL that Twilio will fetch
  // We'll use our elevenlabs-tts endpoint with query params
  const params = new URLSearchParams({
    text,
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_PHONE_VOICE_ID,
    model: process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
  });

  return `${baseUrl}/api/elevenlabs-tts?${params.toString()}`;
}
