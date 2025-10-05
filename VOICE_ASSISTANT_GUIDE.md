# 🎤 AI Voice Assistant - Complete Guide

## Overview

The **EngageOS Voice Assistant** provides hands-free, conversational interaction with kiosks using:
- **Speech-to-Text** (Web Speech API + OpenAI Whisper fallback)
- **AI Responses** (OpenAI GPT-4 with industry-specific prompts)
- **Text-to-Speech** (Web Speech API + ElevenLabs fallback)
- **Wake Word Detection** ("Hey Kiosk" or custom)

---

## 🎯 Key Features

### 1. **Hands-Free Navigation**
- Voice commands to navigate kiosk
- "Hey Kiosk, show me the menu"
- "Hey Kiosk, what's the wait time?"
- "Hey Kiosk, I'd like to order"

### 2. **Natural Conversation**
- Context-aware responses
- Industry-specific knowledge
- Multi-turn conversations
- Intent recognition

### 3. **Multi-Language Support**
- English (US, UK, Australia)
- Spanish
- French
- German
- Chinese (Mandarin)
- Custom languages via configuration

### 4. **Accessibility**
- Hands-free operation for mobility-impaired users
- Visual feedback for hearing-impaired users
- Adjustable speech rate, pitch, volume
- Large text transcripts

### 5. **Industry-Specific Intelligence**
- Restaurant: Menu recommendations, allergens, specials
- Auto: Vehicle info, service status, financing
- Healthcare: Check-in, wait times, facility info
- Retail: Product location, availability, sales
- Fitness: Class schedules, trainer availability
- Hospitality: Check-in, local recommendations
- Cannabis: Product info, effects, compliance
- Events: Session schedules, speaker info

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  VOICE ASSISTANT FLOW                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  👤 User Says:                                          │
│  "Hey Kiosk, show me today's specials"                 │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────┐              │
│  │   SPEECH-TO-TEXT (STT)                │              │
│  │  • Web Speech API (primary)           │              │
│  │  • OpenAI Whisper (fallback)          │              │
│  └──────────────────────────────────────┘              │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────┐              │
│  │   WAKE WORD DETECTION                 │              │
│  │  • "Hey Kiosk" detected                │              │
│  │  • Extract command                     │              │
│  └──────────────────────────────────────┘              │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────┐              │
│  │   AI PROCESSING (GPT-4)               │              │
│  │  • Industry-specific context          │              │
│  │  • Location information                │              │
│  │  • Intent recognition                  │              │
│  │  • Response generation                 │              │
│  └──────────────────────────────────────┘              │
│         │                                                │
│         ▼                                                │
│  ┌──────────────────────────────────────┐              │
│  │   TEXT-TO-SPEECH (TTS)                │              │
│  │  • Web Speech API (primary)           │              │
│  │  • ElevenLabs (premium voice)         │              │
│  └──────────────────────────────────────┘              │
│         │                                                │
│         ▼                                                │
│  🔊 Assistant Says:                                     │
│  "Today's specials are grilled salmon                   │
│   and ribeye steak. Would you like to                   │
│   see photos or place an order?"                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 Implementation

### 1. Add to Kiosk (App.jsx)

```jsx
import VoiceAssistant from './components/VoiceAssistant';

function App() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  return (
    <div>
      {/* Your existing kiosk UI */}

      <VoiceAssistant
        locationId={locationId}
        industry="restaurant"
        enabled={voiceEnabled}
        wakeWord="hey kiosk"
        language="en-US"
      />
    </div>
  );
}
```

### 2. Database Schema

```sql
-- Voice interactions log
CREATE TABLE voice_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  language TEXT DEFAULT 'en-US',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_voice_interactions_location ON voice_interactions(location_id);
CREATE INDEX idx_voice_interactions_timestamp ON voice_interactions(timestamp);
```

### 3. Backend Edge Function

Already created at: `supabase/functions/ai-voice-agent/index.ts`

**Deploy:**
```bash
supabase functions deploy ai-voice-agent
```

**Set OpenAI API Key:**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

---

## 🎨 UI Components

### Voice Button States

1. **Idle (Ready to Listen)**
   - Purple gradient button
   - Microphone icon
   - Pulse animation

2. **Listening (Active)**
   - Red/pink gradient
   - Pulsing animation
   - "Listening for 'hey kiosk'..." status

3. **Processing (AI Thinking)**
   - Blue gradient
   - Spinner animation
   - "Processing..." status

4. **Speaking (AI Response)**
   - Green gradient
   - Waving bars animation
   - "Speaking..." status

### Transcript Overlay

- Shows user's spoken text
- Shows AI response
- Large, readable font
- Close button
- Accessible design

---

## 🗣️ Example Interactions

### Restaurant

**User:** "Hey Kiosk, what's on the menu today?"
**Assistant:** "We have a full menu including burgers, salads, pasta, and seafood. Our daily special is grilled salmon with roasted vegetables. Would you like to see photos or place an order?"

**User:** "Hey Kiosk, I have a peanut allergy. What can I eat?"
**Assistant:** "I'll show you our allergen-safe options. All our salads, grilled chicken, and pasta dishes are peanut-free. Would you like me to highlight these items on the menu?"

**User:** "Hey Kiosk, how long is the wait?"
**Assistant:** "The current wait time is about 15 minutes. While you wait, you can play trivia games or browse our photo gallery. Would you like to add your name to the waitlist?"

---

### Auto Dealership

**User:** "Hey Kiosk, when will my car be ready?"
**Assistant:** "Let me check your service status. Your vehicle is currently being serviced and should be ready in about 45 minutes. We're performing an oil change and tire rotation. I'll notify you when it's complete."

**User:** "Hey Kiosk, compare the Accord and the Camry."
**Assistant:** "Both are excellent sedans. The Accord offers sportier handling and a more upscale interior, while the Camry is known for exceptional reliability and fuel economy. Would you like to see detailed specs or schedule a test drive?"

---

### Healthcare

**User:** "Hey Kiosk, I'm here for my appointment."
**Assistant:** "Welcome! I can help you check in. Please confirm your name and date of birth, and I'll notify the staff that you've arrived. Your wait time should be about 10 minutes."

**User:** "Hey Kiosk, where is the radiology department?"
**Assistant:** "The radiology department is on the 2nd floor, east wing. Take the elevators on your right and turn left when you exit. Would you like me to send directions to your phone?"

---

### Retail

**User:** "Hey Kiosk, do you have this shirt in blue?"
**Assistant:** "Let me check our inventory. Yes, we have that shirt in blue in sizes small, medium, and large. It's located in aisle 3, section B. Would you like me to reserve one for you at the checkout?"

**User:** "Hey Kiosk, what's on sale today?"
**Assistant:** "We're having a 30% off sale on all winter clothing and a buy-one-get-one sale on shoes. Our clearance section also has items up to 70% off. Would you like to see featured deals?"

---

### Fitness

**User:** "Hey Kiosk, when is the next yoga class?"
**Assistant:** "The next yoga class is at 6:00 PM tonight with instructor Sarah. It's a 60-minute vinyasa flow class suitable for all levels. There are 5 spots remaining. Would you like to reserve one?"

**User:** "Hey Kiosk, can I get a guest pass?"
**Assistant:** "Absolutely! Members can bring one guest per week for free. I'll generate a guest pass for you. Just have your friend show it at the front desk. Would you like me to email or text it to you?"

---

## ⚙️ Configuration Options

### Admin Settings

```javascript
{
  // Wake word settings
  wakeWord: "hey kiosk",  // Custom wake word
  wakeWordSensitivity: 0.7,  // 0-1 scale

  // Speech recognition
  language: "en-US",
  continuousListening: true,
  interimResults: true,

  // Speech synthesis
  speechRate: 1.0,  // 0.5-2.0
  speechPitch: 1.0,  // 0.5-2.0
  speechVolume: 1.0,  // 0-1.0

  // AI settings
  aiModel: "gpt-4",  // or "gpt-3.5-turbo"
  temperature: 0.7,  // 0-1 (creativity)
  maxTokens: 150,  // Response length

  // Premium voice (ElevenLabs)
  useElevenLabs: false,
  elevenLabsVoiceId: "default",
  elevenLabsModel: "eleven_monolingual_v1",

  // UI settings
  showTranscript: true,
  showResponse: true,
  autoHideDelay: 5000,  // ms

  // Industry context
  industry: "restaurant",
  customPrompt: ""  // Additional context for AI
}
```

---

## 📊 Analytics

Track voice assistant usage:

```sql
-- Most common voice queries
SELECT
  user_message,
  COUNT(*) as frequency,
  AVG(LENGTH(ai_response)) as avg_response_length
FROM voice_interactions
WHERE location_id = 'abc123'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY user_message
ORDER BY frequency DESC
LIMIT 20;

-- Voice usage by hour
SELECT
  EXTRACT(HOUR FROM timestamp) as hour,
  COUNT(*) as interactions,
  AVG(LENGTH(user_message)) as avg_query_length
FROM voice_interactions
WHERE location_id = 'abc123'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;

-- Most engaging responses (users continue conversation)
SELECT
  user_message,
  ai_response,
  COUNT(*) as follow_up_count
FROM voice_interactions vi1
WHERE EXISTS (
  SELECT 1 FROM voice_interactions vi2
  WHERE vi2.location_id = vi1.location_id
    AND vi2.session_id = vi1.session_id
    AND vi2.timestamp > vi1.timestamp
    AND vi2.timestamp < vi1.timestamp + INTERVAL '2 minutes'
)
GROUP BY user_message, ai_response
ORDER BY follow_up_count DESC
LIMIT 10;
```

---

## 🚀 Advanced Features

### 1. **Multi-Turn Conversations**

Maintain context across multiple voice interactions:

```javascript
const sessionId = generateSessionId();

// First interaction
"Hey Kiosk, show me burgers"
→ Shows burger menu

// Follow-up (same session)
"What about vegetarian options?"
→ AI remembers context, shows veggie burgers

// Another follow-up
"Add the black bean burger to my order"
→ Adds to cart
```

### 2. **Intent Recognition**

Automatically detect user intent and route accordingly:

```javascript
const intents = {
  order: ["order", "buy", "purchase", "get", "add to cart"],
  info: ["what is", "tell me about", "describe", "explain"],
  navigation: ["show me", "take me to", "go to", "find"],
  help: ["help", "how do I", "can you", "assist"]
};

// "I'd like to order a burger" → Navigate to order screen
// "What's in the Caesar salad?" → Show ingredients
// "Help me find the bathroom" → Show facility map
```

### 3. **Voice Commerce**

Complete transactions via voice:

```javascript
// Full ordering flow
"Hey Kiosk, I'd like to order"
→ "Sure! What would you like?"

"A cheeseburger and fries"
→ "Great! Would you like to add a drink?"

"Yes, a Coke"
→ "Perfect! Your total is $12.50. Ready to checkout?"

"Yes"
→ "Please tap your card on the reader."
```

### 4. **Proactive Assistance**

AI initiates conversation when helpful:

```javascript
// Customer standing idle for 30 seconds
→ "Hi there! Can I help you find something?"

// Customer looking at allergen info
→ "I see you're checking allergens. Would you like me to filter the menu for specific restrictions?"

// Long wait time
→ "I know the wait is a bit long today. Would you like to play a game or watch our chef's specials video while you wait?"
```

---

## 🔒 Privacy & Security

### Data Handling

1. **Voice Data**
   - Audio not stored (real-time transcription only)
   - Transcripts stored for analytics (opt-in)
   - Automatic deletion after 90 days

2. **PII Protection**
   - No names, phone numbers, or addresses stored
   - Payment info never processed via voice
   - GDPR/CCPA compliant

3. **Encryption**
   - All API calls over TLS 1.3
   - Database encryption at rest
   - Token-based authentication

### Compliance

- **HIPAA** (Healthcare): No PHI in voice interactions
- **PCI-DSS** (Payments): No card info via voice
- **COPPA** (Children): Parental consent required
- **ADA** (Accessibility): Full accessibility support

---

## 💰 Pricing

**AI Voice Agent Widget: $149/month**

**Includes:**
- Unlimited voice interactions
- GPT-4 powered responses
- Basic text-to-speech
- Analytics dashboard
- Multi-language support

**Add-Ons:**
- ElevenLabs Premium Voice: +$49/month (higher quality TTS)
- Custom wake word training: +$99 one-time
- Advanced analytics: +$29/month

---

## 🎯 Best Practices

### 1. **Design for Voice-First**
- Keep responses under 3 sentences
- Use natural, conversational language
- Confirm actions before executing
- Provide clear next steps

### 2. **Handle Errors Gracefully**
- "I didn't quite catch that. Could you repeat?"
- "I'm not sure how to help with that. Would you like to speak with staff?"
- Fallback to visual UI if voice fails

### 3. **Optimize for Noise**
- Use directional microphone
- Implement noise cancellation
- Increase confidence threshold in loud environments

### 4. **Test with Real Users**
- Different accents and dialects
- Various speech patterns
- Background noise levels
- Non-native speakers

---

## 📱 Mobile & Accessibility

### Mobile Optimization

- Works on iOS Safari, Android Chrome
- Responsive voice button placement
- Touch-friendly transcript display
- Offline fallback messaging

### Accessibility Features

- **Visual Feedback:** Animated status indicators
- **Text Display:** Large transcript overlay
- **Keyboard Control:** Space bar to activate
- **Screen Reader:** ARIA labels and live regions

---

## 🔧 Troubleshooting

### Common Issues

**1. Microphone Not Working**
- Check browser permissions
- Ensure HTTPS connection
- Test with different browser

**2. Wake Word Not Detected**
- Speak clearly and at normal pace
- Reduce background noise
- Adjust sensitivity in settings

**3. Slow Response Time**
- Check internet connection
- Verify OpenAI API status
- Review server logs

**4. Inaccurate Transcription**
- Use in quieter environment
- Speak closer to device
- Consider Whisper API fallback

---

## 🚀 Roadmap

### Q1 2026
- [ ] Voice authentication (voiceprint)
- [ ] Multi-speaker detection
- [ ] Emotion detection in voice
- [ ] Real-time translation

### Q2 2026
- [ ] Custom voice training per location
- [ ] Voice-based games and quizzes
- [ ] Sentiment analysis
- [ ] Conversation summarization

### Q3 2026
- [ ] Offline voice processing
- [ ] Edge AI models (on-device)
- [ ] Voice biometrics for loyalty
- [ ] Natural language ordering

---

**Last Updated:** October 5, 2025
**Component:** `src/components/VoiceAssistant.jsx`
**Backend:** `supabase/functions/ai-voice-agent/index.ts`
**Status:** Ready for Production ✅
