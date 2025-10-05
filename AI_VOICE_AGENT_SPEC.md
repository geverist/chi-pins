# AI Voice Agent Feature Specification
**EngageOS™ Conversational AI Kiosk Interface**

---

## Overview

Add a voice-first AI agent that customers can naturally talk to instead of tapping through menus. The agent understands natural language, responds with a configurable voice, and can handle ordering, game selection, questions, and more.

---

## User Experience Flow

### 1. **Activation**
Customer approaches kiosk:
- Screen shows: "👋 Hi! Say 'Hey' to get started, or tap anywhere"
- Idle animation: Pulsing microphone icon
- Auto-wake on voice detection OR tap to activate

### 2. **Voice Interaction**
Customer: "I want to order a hot dog"

Agent (speaking): "Great choice! Would you like our classic Chicago dog with the works, or something custom?"

Customer: "Classic is fine. And add fries."

Agent: "Perfect! One Chicago dog with fries. That'll be $8.50. Want to pay now or add anything else?"

### 3. **Visual Feedback**
- **Listening**: Animated waveform shows voice input
- **Processing**: "..." thinking indicator
- **Speaking**: Agent avatar animates (lip sync if advanced)
- **Screen shows**: Current order/context in text form

### 4. **Fallback to Touch**
- If voice unclear: "I didn't catch that. You can also tap to select"
- Shows relevant buttons based on context

---

## Technical Architecture

### Components

```
┌─────────────────────────────────────────┐
│          Kiosk Frontend (React)         │
│  ┌───────────────────────────────────┐  │
│  │    Voice Agent Component          │  │
│  │  - Microphone access              │  │
│  │  - Audio playback                 │  │
│  │  - Visual feedback (waveforms)    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│       Backend API (Vercel Edge)         │
│  ┌───────────────────────────────────┐  │
│  │  Voice Processing Endpoint        │  │
│  │  - OpenAI Whisper (STT)           │  │
│  │  - GPT-4 (conversation logic)     │  │
│  │  - ElevenLabs/OpenAI TTS          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Configuration Database          │
│  - Agent prompts per vertical           │
│  - Voice settings (voice ID, speed)     │
│  - Business-specific context            │
└─────────────────────────────────────────┘
```

---

## AI Model Configuration

### System Prompts (Per Vertical)

**Restaurant (Chicago Mikes)**:
```
You are a friendly order-taking assistant at Chicago Mikes, a classic hot dog stand.

Context:
- Menu: Chicago Dog ($5), Italian Beef ($7), Fries ($3.50), Drinks ($2)
- Specials: Combo (Dog + Fries + Drink) = $9 (save $1.50)
- We're known for authentic Chicago-style hot dogs (never ketchup!)

Your job:
1. Greet customers warmly
2. Take their order clearly
3. Suggest upsells naturally ("Want fries with that?")
4. Confirm order and total
5. Direct them to payment when ready

Personality:
- Casual, friendly Chicago vibe
- Quick and efficient (people are hungry!)
- Proud of our Chicago dog tradition
- Use phrases like "You got it!" "Coming right up!"

Rules:
- Keep responses under 20 words
- Always confirm order before finalizing
- If unsure, offer choices instead of guessing
- Never mention ketchup on Chicago dogs (it's a crime!)
```

**Med Spa**:
```
You are a knowledgeable spa concierge at [Spa Name], helping clients explore treatments.

Services:
- Botox: $12/unit (avg 20-50 units)
- Dermal Fillers: $650-$1,200 per syringe
- Laser Hair Removal: $150-$400 per session
- Facials: $85-$200
- Microneedling: $250-$500

Your job:
1. Greet clients warmly and ask how you can help
2. Educate about treatments in simple terms
3. Suggest complementary services
4. Book consultations or appointments
5. Answer common questions about procedures

Personality:
- Calm, professional, reassuring
- Educational but not medical (you're not a provider)
- Empathetic to beauty/wellness goals
- Use phrases like "Many of our clients love..." "A great option for..."

Rules:
- Never diagnose or prescribe
- Always suggest free consultation for new treatments
- Mention financing options if price concerns arise
- Keep responses under 30 words for clarity
```

**Banking**:
```
You are a helpful banking assistant at [Bank Name], here to answer questions and assist members.

Services:
- Checking/Savings accounts
- Credit cards (rewards, cashback, low APR)
- Personal loans
- Mortgages
- Investment accounts

Your job:
1. Greet members warmly
2. Answer product questions clearly
3. Direct complex questions to banker
4. Help with account inquiries (balance, recent transactions - via integration)
5. Educate on digital banking features

Personality:
- Professional, trustworthy, patient
- Clear and jargon-free
- Helpful without being pushy
- Use phrases like "I'd be happy to help" "Let me explain..."

Rules:
- Never share account details publicly (use screen for private info)
- For account access, require authentication first
- Complex financial advice → "Let me connect you with a banker"
- Keep financial education simple and accurate
```

---

## Voice Configuration

### Voice Personas (ElevenLabs / OpenAI TTS)

**Restaurant Voices**:
- **"Marcus"** - Male, energetic, Chicago accent (default)
- **"Sofia"** - Female, friendly, warm
- **"Alex"** - Non-binary, upbeat, casual

**Med Spa Voices**:
- **"Lily"** - Female, calm, soothing (default)
- **"James"** - Male, professional, reassuring
- **"Ava"** - Female, elegant, confident

**Banking Voices**:
- **"David"** - Male, authoritative, trustworthy (default)
- **"Emily"** - Female, warm, professional
- **"Morgan"** - Non-binary, neutral, clear

### Voice Settings (Per Business):
```json
{
  "voiceId": "marcus_chicago",
  "speed": 1.1,
  "pitch": 1.0,
  "stability": 0.75,
  "similarity": 0.85,
  "style": "conversational"
}
```

---

## Configuration Schema (Supabase)

### Table: `ai_agent_configs`

```sql
CREATE TABLE ai_agent_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    vertical TEXT NOT NULL, -- restaurant, medspa, banking, etc.

    -- AI Model Settings
    model TEXT DEFAULT 'gpt-4o-mini', -- gpt-4o, gpt-4o-mini, claude-3-5-sonnet
    temperature DECIMAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 150,

    -- System Prompt
    system_prompt TEXT NOT NULL,
    context_data JSONB, -- Menu, services, hours, etc.

    -- Voice Settings
    voice_provider TEXT DEFAULT 'elevenlabs', -- elevenlabs, openai
    voice_id TEXT DEFAULT 'marcus_chicago',
    voice_speed DECIMAL DEFAULT 1.0,
    voice_pitch DECIMAL DEFAULT 1.0,

    -- Behavior Settings
    greeting_message TEXT DEFAULT 'Hi! How can I help you today?',
    idle_timeout_seconds INTEGER DEFAULT 30,
    auto_suggest BOOLEAN DEFAULT true, -- Auto-suggest upsells
    multimodal BOOLEAN DEFAULT false, -- Use vision for menu reading

    -- Safety & Compliance
    content_filter BOOLEAN DEFAULT true,
    pii_masking BOOLEAN DEFAULT true, -- Mask credit cards, SSN, etc.

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Example Config: Chicago Mikes

```json
{
  "business_id": "chicago-mikes-001",
  "vertical": "restaurant",
  "model": "gpt-4o-mini",
  "temperature": 0.8,
  "system_prompt": "You are a friendly order-taking assistant at Chicago Mikes...",
  "context_data": {
    "menu": [
      { "name": "Chicago Dog", "price": 5.00, "description": "Yellow mustard, relish, onion, tomato, pickle, sport pepper, celery salt" },
      { "name": "Italian Beef", "price": 7.00, "description": "Thinly sliced beef, au jus, giardiniera" },
      { "name": "Fries", "price": 3.50 },
      { "name": "Drink", "price": 2.00 }
    ],
    "specials": [
      { "name": "Combo", "items": ["Chicago Dog", "Fries", "Drink"], "price": 9.00, "savings": 1.50 }
    ],
    "hours": "Mon-Sat: 11am-10pm, Sun: Closed"
  },
  "voice_provider": "elevenlabs",
  "voice_id": "marcus_chicago",
  "greeting_message": "Hey! Welcome to Chicago Mikes. What can I get ya?",
  "auto_suggest": true
}
```

---

## Implementation Plan

### Phase 1: Core Voice Agent (Week 1-2)

**Frontend Component**: `VoiceAgent.jsx`

```jsx
import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceAgent({ config }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize Web Audio API for microphone
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder for audio capture
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after 10 seconds (or when user clicks stop)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 10000);

    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Please allow microphone access to use voice assistant');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  // Send audio to backend for processing
  const processAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('config', JSON.stringify(config));

    try {
      const response = await fetch('/api/voice-agent', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      // Update transcript
      setTranscript(data.transcript);
      setAgentResponse(data.agentResponse);

      // Play TTS audio response
      if (data.audioUrl) {
        await playAudio(data.audioUrl);
      }

    } catch (error) {
      console.error('Voice processing error:', error);
    }
  };

  // Play TTS audio
  const playAudio = async (audioUrl) => {
    setIsSpeaking(true);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setIsSpeaking(false);
    };

    await audio.play();
  };

  return (
    <div className="voice-agent">
      {/* Microphone Button */}
      <button
        onClick={isListening ? stopListening : startListening}
        className={`mic-button ${isListening ? 'listening' : ''}`}
      >
        {isListening ? <MicOff size={48} /> : <Mic size={48} />}
        <span>{isListening ? 'Listening...' : 'Tap to speak'}</span>
      </button>

      {/* Visual Feedback */}
      {isListening && <AudioWaveform />}

      {isSpeaking && (
        <div className="speaking-indicator">
          <Volume2 size={24} />
          <span>Agent speaking...</span>
        </div>
      )}

      {/* Conversation Display */}
      <div className="conversation">
        {transcript && (
          <div className="user-message">
            <strong>You:</strong> {transcript}
          </div>
        )}
        {agentResponse && (
          <div className="agent-message">
            <strong>Agent:</strong> {agentResponse}
          </div>
        )}
      </div>
    </div>
  );
}

// Audio waveform visualization component
function AudioWaveform() {
  return (
    <div className="waveform">
      {[...Array(20)].map((_, i) => (
        <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
```

**Backend API**: `/api/voice-agent.js`

```javascript
import { OpenAI } from 'openai';
import formidable from 'formidable';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false, // Required for file upload
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data (audio file)
    const form = formidable();
    const [fields, files] = await form.parse(req);

    const audioFile = files.audio[0];
    const config = JSON.parse(fields.config[0]);

    // Step 1: Speech-to-Text (Whisper)
    const transcript = await transcribeAudio(audioFile.filepath);

    // Step 2: Generate AI Response (GPT-4)
    const agentResponse = await generateResponse(transcript, config);

    // Step 3: Text-to-Speech (ElevenLabs or OpenAI TTS)
    const audioUrl = await synthesizeSpeech(agentResponse, config);

    return res.status(200).json({
      transcript,
      agentResponse,
      audioUrl
    });

  } catch (error) {
    console.error('Voice agent error:', error);
    return res.status(500).json({ error: 'Voice processing failed' });
  }
}

async function transcribeAudio(filepath) {
  const audioFile = fs.createReadStream(filepath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en'
  });

  return transcription.text;
}

async function generateResponse(userMessage, config) {
  const completion = await openai.chat.completions.create({
    model: config.model || 'gpt-4o-mini',
    temperature: config.temperature || 0.7,
    max_tokens: config.max_tokens || 150,
    messages: [
      {
        role: 'system',
        content: config.system_prompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ]
  });

  return completion.choices[0].message.content;
}

async function synthesizeSpeech(text, config) {
  // Option 1: OpenAI TTS (simpler, cheaper)
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    voice: config.voice_id || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
    input: text,
    speed: config.voice_speed || 1.0
  });

  // Convert to buffer and upload to temporary storage
  const buffer = Buffer.from(await speech.arrayBuffer());

  // Upload to Vercel Blob or return base64
  const audioBase64 = buffer.toString('base64');
  const audioUrl = `data:audio/mp3;base64,${audioBase64}`;

  return audioUrl;

  // Option 2: ElevenLabs (better quality, more voices)
  // const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + config.voice_id, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'xi-api-key': process.env.ELEVENLABS_API_KEY
  //   },
  //   body: JSON.stringify({
  //     text,
  //     voice_settings: {
  //       stability: 0.75,
  //       similarity_boost: 0.85
  //     }
  //   })
  // });
  //
  // const audioBlob = await response.blob();
  // // Upload and return URL
}
```

---

### Phase 2: Conversation Memory (Week 3)

**Add context tracking** so agent remembers conversation:

```javascript
// Store conversation in session
const conversationHistory = [
  { role: 'system', content: config.system_prompt },
  { role: 'user', content: 'I want a hot dog' },
  { role: 'assistant', content: 'Great! Classic Chicago dog or custom?' },
  { role: 'user', content: 'Classic with fries' },
  { role: 'assistant', content: 'Perfect! One Chicago dog with fries. $8.50 total.' }
];
```

---

### Phase 3: Action Execution (Week 4)

**Allow agent to take actions** (not just talk):

```javascript
// Agent can trigger functions
const tools = [
  {
    type: 'function',
    function: {
      name: 'add_to_order',
      description: 'Add item to customer order',
      parameters: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          quantity: { type: 'number' },
          customizations: { type: 'array' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'launch_game',
      description: 'Start a specific game for the customer',
      parameters: {
        type: 'object',
        properties: {
          game_id: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_balance',
      description: 'Check account balance (banking)',
      parameters: {
        type: 'object',
        properties: {
          account_number: { type: 'string' }
        }
      }
    }
  }
];
```

User: "Let me play trivia"
Agent: [calls launch_game('chicago-trivia')] → Game launches
Agent: "Starting Chicago trivia for you now!"

---

## Admin Configuration UI

**Dashboard**: `/admin/voice-settings`

```jsx
<form>
  <h2>Voice Agent Settings</h2>

  {/* AI Model Selection */}
  <label>AI Model</label>
  <select name="model">
    <option value="gpt-4o-mini">GPT-4o Mini (faster, cheaper)</option>
    <option value="gpt-4o">GPT-4o (smarter, pricier)</option>
    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
  </select>

  {/* System Prompt */}
  <label>System Prompt</label>
  <textarea rows="10" name="system_prompt" placeholder="You are a friendly assistant..."></textarea>

  {/* Voice Selection */}
  <label>Voice Persona</label>
  <select name="voice_id">
    <option value="alloy">Alloy (Neutral, balanced)</option>
    <option value="echo">Echo (Male, clear)</option>
    <option value="fable">Fable (British, warm)</option>
    <option value="onyx">Onyx (Deep, authoritative)</option>
    <option value="nova">Nova (Female, energetic)</option>
    <option value="shimmer">Shimmer (Female, soft)</option>
  </select>

  {/* Voice Preview */}
  <button type="button" onClick={previewVoice}>
    🔊 Preview Voice
  </button>

  {/* Context Data (Menu, Services, etc.) */}
  <label>Business Context (JSON)</label>
  <textarea rows="15" name="context_data" placeholder='{"menu": [...], "hours": "..."}'></textarea>

  {/* Behavior Settings */}
  <label>
    <input type="checkbox" name="auto_suggest" defaultChecked />
    Enable auto-suggestions (upsells)
  </label>

  <label>
    <input type="checkbox" name="pii_masking" defaultChecked />
    Mask sensitive info (credit cards, SSN)
  </label>

  <button type="submit">Save Settings</button>
</form>
```

---

## Pricing & Cost Analysis

### Per-Interaction Costs:

**OpenAI Whisper** (STT):
- $0.006 per minute
- Avg 30-second interaction = **$0.003**

**GPT-4o-mini** (Conversation):
- $0.150 per 1M input tokens
- $0.600 per 1M output tokens
- Avg 200 tokens per response = **$0.0002**

**OpenAI TTS** (Text-to-Speech):
- $15 per 1M characters
- Avg 100 characters per response = **$0.0015**

**Total cost per interaction**: ~**$0.005** (half a cent)

**Monthly costs** (1,000 customers/day, 50% use voice):
- 15,000 interactions/month × $0.005 = **$75/month**

**Pricing to customer**:
- Include in base subscription (negligible cost)
- Or charge premium: +$99/month for "AI Voice Agent" feature

---

## Next Steps

1. **Build MVP** (this week):
   - Voice agent component (frontend)
   - Basic API endpoint (Whisper + GPT-4 + TTS)
   - Test with Chicago Mikes config

2. **Add to demo mode** (next week):
   - Add "🎤 Voice Mode" button to kiosk
   - Show in investor demos

3. **Configuration UI** (Week 3):
   - Admin panel for voice settings
   - Supabase table for configs

4. **Launch Beta** (Month 2):
   - 5 pilot customers test voice agent
   - Gather feedback, iterate

Would you like me to start building the voice agent component now?
