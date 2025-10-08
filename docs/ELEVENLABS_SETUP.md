# ElevenLabs Voice Integration

This document explains how to integrate ElevenLabs AI voices for both the kiosk voice assistant and Twilio phone calls.

## Features

- **Kiosk Voice Assistant**: Natural AI voices for voice responses
- **Phone Calls**: ElevenLabs voices via Twilio for phone support
- **Automatic Fallback**: Falls back to browser/Twilio TTS if ElevenLabs is unavailable

## Setup Instructions

### 1. Get ElevenLabs API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to [API Keys](https://elevenlabs.io/app/settings/api-keys)
3. Create a new API key (starts with `sk_...`)
4. Copy the API key: `sk_44ee4b719cc286a098f8aeb34e45e22bb7d6495144332bd7`

### 2. Choose Voices

1. Browse the [Voice Library](https://elevenlabs.io/app/voice-library)
2. Find voices you like for kiosk and phone
3. Click on a voice → Copy the Voice ID
4. Recommended voices:
   - **Rachel** (ID: `21m00Tcm4TlvDq8ikWAM`) - Professional, friendly
   - **Josh** (ID: `TxGEqnHWrfWFTfGW9XjX`) - Warm, conversational
   - **Bella** (ID: `EXAVITQu4vr4xnSDxMaL`) - Energetic, upbeat
   - **Antoni** (ID: `ErXwobaYiN019PkySvjV`) - Deep, authoritative

### 3. Configure in Admin Panel

1. Open your kiosk admin panel (5-tap footer or Z-gesture)
2. Go to **General** tab
3. Find **Voice & TTS Settings** section
4. Set **TTS Provider** to `ElevenLabs`
5. Enter your **API Key**
6. Enter **Voice ID (Kiosk)** - the voice for kiosk interactions
7. Enter **Voice ID (Phone)** - the voice for phone calls (can be same or different)
8. Select **Model**:
   - `Turbo v2.5` - Fastest, lowest latency (recommended)
   - `Turbo v2` - Fast
   - `Multilingual v2` - Best quality, supports 29 languages
   - `Monolingual v1` - English only, legacy
9. Adjust **Stability** (0-1):
   - Lower = more expressive and variable
   - Higher = more consistent and predictable
   - Recommended: `0.5`
10. Adjust **Similarity Boost** (0-1):
    - Lower = more creative interpretation
    - Higher = closer to original voice sample
    - Recommended: `0.75`
11. Click **Save & Close**

### 4. Configure Environment Variables (for Twilio Phone)

Add to your `.env` file or Vercel environment variables:

```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_44ee4b719cc286a098f8aeb34e45e22bb7d6495144332bd7
ELEVENLABS_PHONE_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_turbo_v2_5
```

### 5. Set Up Twilio Webhook

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Click on your phone number
4. Under **Voice & Fax**, set:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://yourdomain.com/api/twilio-voice-webhook`
   - **HTTP**: POST
5. Click **Save**

## Testing

### Test Kiosk Voice

1. Refresh your kiosk
2. Click the microphone button
3. Say something like "What can you help me with?"
4. Listen for the AI response - it should sound more natural than browser TTS

### Test Phone Voice

1. Call your Twilio phone number
2. The AI assistant should greet you with an ElevenLabs voice
3. Ask questions and listen to the responses
4. Say "goodbye" to end the call

## Troubleshooting

### Kiosk voice still using browser TTS

- Check that **TTS Provider** is set to `ElevenLabs` in admin panel
- Verify API key is correct
- Check browser console for errors
- Make sure voice ID is valid

### Phone not using ElevenLabs

- Verify environment variables are set correctly
- Check Twilio webhook URL is correct
- Look at Twilio debugger for webhook errors
- Verify API key has sufficient credits

### Audio quality issues

- Try different voice models:
  - Use `Turbo v2.5` for lowest latency
  - Use `Multilingual v2` for best quality
- Adjust stability and similarity settings
- Check your internet connection speed

### API Rate Limits

ElevenLabs free tier limits:
- 10,000 characters/month
- ~3-5 minutes of audio

Paid plans:
- Starter: $5/mo - 30,000 characters
- Creator: $22/mo - 100,000 characters
- Pro: $99/mo - 500,000 characters

## Cost Estimation

Based on typical usage:

**Kiosk:**
- Average response: 50 characters
- 100 interactions/day = 5,000 chars/day = 150,000 chars/month
- Recommended plan: **Creator ($22/mo)**

**Phone:**
- Average response: 100 characters
- 50 calls/day × 3 responses/call = 15,000 chars/day = 450,000 chars/month
- Recommended plan: **Pro ($99/mo)**

**Combined:**
- ~600,000 characters/month
- Recommended plan: **Pro ($99/mo)** or **Business ($330/mo for 2M chars)**

## API Endpoints

### `/api/elevenlabs-tts`

Generate speech from text. Used by both kiosk and Twilio.

**POST Request:**
```json
{
  "text": "Hello, how can I help you?",
  "apiKey": "sk_...",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "model": "eleven_turbo_v2_5",
  "stability": 0.5,
  "similarity": 0.75
}
```

**GET Request (for Twilio):**
```
/api/elevenlabs-tts?text=Hello&apiKey=sk_...&voiceId=21m00...
```

**Response:**
- Audio file (audio/mpeg)

### `/api/twilio-voice-webhook`

Twilio webhook for incoming calls. Handles conversation with AI + ElevenLabs voices.

**POST Request (from Twilio):**
```
CallSid=CA1234...
From=+15551234567
SpeechResult=What are your hours?
```

**Response:**
- TwiML XML with `<Play>` or `<Say>` verbs

## Architecture

```
┌─────────────────┐
│  Kiosk Browser  │
└────────┬────────┘
         │
         │ (microphone)
         ▼
┌─────────────────────────┐
│  VoiceAssistant.jsx     │
│  - Speech Recognition   │
│  - ElevenLabs TTS       │
└────────┬────────────────┘
         │
         │ POST /api/voice-assistant
         ▼
┌─────────────────────────┐
│  OpenAI (GPT-4o-mini)   │
│  - Generate response    │
└────────┬────────────────┘
         │
         │ text response
         ▼
┌─────────────────────────┐
│  ElevenLabs API         │
│  - Text to Speech       │
└────────┬────────────────┘
         │
         │ audio (mp3)
         ▼
┌─────────────────┐
│  Browser Audio  │
└─────────────────┘


┌─────────────────┐
│  Phone Call     │
└────────┬────────┘
         │
         │ incoming call
         ▼
┌─────────────────────────┐
│  Twilio                 │
│  - Webhook to server    │
└────────┬────────────────┘
         │
         │ POST /api/twilio-voice-webhook
         ▼
┌─────────────────────────┐
│  twilio-voice-webhook   │
│  - Parse speech input   │
│  - Call OpenAI          │
│  - Generate TwiML       │
└────────┬────────────────┘
         │
         │ GET /api/elevenlabs-tts?text=...
         ▼
┌─────────────────────────┐
│  ElevenLabs API         │
│  - Text to Speech       │
└────────┬────────────────┘
         │
         │ audio (mp3)
         ▼
┌─────────────────┐
│  Twilio <Play>  │
│  - Stream audio │
└─────────────────┘
```

## Advanced Configuration

### Custom Voice Cloning

1. Go to [Voice Lab](https://elevenlabs.io/app/voice-lab)
2. Upload voice samples (recommended: 1-5 minutes of clear audio)
3. Generate custom voice
4. Copy the Voice ID
5. Use in admin panel

### Multi-Language Support

1. Use `Multilingual v2` model
2. ElevenLabs supports 29 languages including:
   - English, Spanish, French, German, Italian
   - Portuguese, Polish, Dutch, Swedish
   - Japanese, Chinese, Korean, Arabic, Hindi
3. Voice responses will match the language of the input text

### Voice Settings Optimization

For **conversational AI**:
- Stability: `0.5-0.6` (balanced)
- Similarity: `0.7-0.8` (natural)

For **announcements/notifications**:
- Stability: `0.7-0.8` (consistent)
- Similarity: `0.8-0.9` (clear)

For **character voices**:
- Stability: `0.3-0.5` (expressive)
- Similarity: `0.6-0.7` (flexible)

## Security Notes

- API keys are stored in admin settings (encrypted in Supabase)
- Environment variables for phone system (never exposed to client)
- Audio is generated server-side and streamed to client
- No API keys are sent to browser

## Support

For ElevenLabs support:
- [Documentation](https://docs.elevenlabs.io/)
- [Discord Community](https://discord.gg/elevenlabs)
- [Email Support](mailto:support@elevenlabs.io)

For integration issues:
- Check browser/server console logs
- Verify API key and voice IDs
- Test with simple text first
- Monitor ElevenLabs quota usage
