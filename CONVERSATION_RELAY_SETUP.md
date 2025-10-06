# Twilio ConversationRelay Setup Guide

## Overview

This guide will help you set up the advanced ConversationRelay voice agent with:
- ✅ Twilio ConversationRelay WebSocket integration
- ✅ Claude AI with tool/function calling
- ✅ Stateful conversation prompt trees
- ✅ Configurable TTS/STT providers (Google, Deepgram, ElevenLabs, Amazon)
- ✅ Real-time token streaming
- ✅ Interruption handling
- ✅ DTMF support
- ✅ Knowledge base integration

---

## Prerequisites

1. **Twilio Account** with ConversationRelay enabled
   - Sign AI Features Addendum at: https://console.twilio.com/

2. **Anthropic API Key** for Claude
   - Get yours at: https://console.anthropic.com/

3. **Supabase Project** (already set up)
   - Project ref: `xxwqmakcrchgefgzrulf`

---

## Step 1: Run Database Migration

Apply the voice configuration migration:

```bash
# Via Supabase SQL Editor
# Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/sql

# Copy and paste contents of:
supabase/migrations/20251006_voice_config.sql
```

This creates:
- `voice_prompts` table - Stateful conversation flows
- `voice_tools` table - Tool/function definitions
- Voice configuration columns on `phone_numbers` table

**Verify migration:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'phone_numbers'
AND column_name IN ('tts_provider', 'stt_provider', 'conversation_mode');
```

You should see the new columns listed.

---

## Step 2: Deploy ConversationRelay Edge Function

**Deploy via Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/functions

2. Click **"Create a new function"**

3. Function details:
   - Name: `conversation-relay-handler`
   - Region: `us-east-1` (or closest to your users)

4. Copy code from: `supabase/functions/conversation-relay-handler/index.ts`

5. Click **"Deploy"**

**Or deploy via CLI:**

```bash
npx supabase functions deploy conversation-relay-handler --project-ref xxwqmakcrchgefgzrulf
```

**Function URL will be:**
```
https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/conversation-relay-handler
```

---

## Step 3: Set Environment Variables

The ConversationRelay handler needs the Anthropic API key.

**Via Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/settings/functions

2. Under "Function secrets", add:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
   ```

**Or via CLI:**

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref xxwqmakcrchgefgzrulf
```

---

## Step 4: Update Twilio Webhook

**Option A: Via Twilio Console**

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active

2. Click on: **+1 (720) 702-2122**

3. Scroll to **"Voice Configuration"**

4. Set:
   - **When a call comes in**: `Webhook`
   - **URL**: `https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/conversation-relay-handler/twiml`
   - **HTTP Method**: `POST`

5. Click **"Save configuration"**

**Option B: Via Twilio API**

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_NUMBER_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -d "VoiceUrl=$SUPABASE_FUNCTION_URL/conversation-relay-handler/twiml" \
  -d "VoiceMethod=POST"
```

---

## Step 5: Configure Voice Settings via Admin Panel

1. Open the kiosk app: http://localhost:5174

2. Open Admin Panel (tap 4 corners: TL → TR → BR → BL)

3. Go to **"Voice Agent"** tab

4. Click **"🎙️ Voice Config"**

5. Configure:

   **Speech-to-Text (STT):**
   - Provider: `Deepgram` (recommended for phone calls)
   - Model: `nova-2` (best accuracy)
   - Language: `en-US`

   **Text-to-Speech (TTS):**
   - Provider: `Google` (good balance) or `ElevenLabs` (most natural)
   - Voice: Choose from dropdown
   - Language: `en-US`

   **Advanced Options:**
   - ✅ Enable DTMF Detection (allows phone key presses)
   - ✅ Enable Interruption (allows caller to interrupt AI)
   - Mode: `ConversationRelay (Full AI)`

6. Changes save automatically!

---

## Step 6: Test Your Voice Agent

**Call the number**: **+1 (720) 702-2122**

**Test Scenarios:**

1. **Natural conversation**:
   - "Hi, what time are you open?"
   - "Do you have gluten-free options?"
   - "I'd like to place an order"

2. **Tool calling**:
   - "Can you search your menu for Italian beef?"
   - "Are you accepting orders right now?"
   - "How much is a beef sandwich with cheese?"

3. **DTMF (phone keys)**:
   - Press `1` for hours
   - Press `2` to transfer to human
   - Press `9` to leave a message

4. **Interruption**:
   - While AI is talking, start speaking
   - AI should stop and listen

---

## How It Works

### Architecture

```
Caller → Twilio → ConversationRelay → WebSocket → Edge Function → Claude AI
                                                         ↓
                                                    Supabase DB
                                                  (Knowledge Base)
```

### WebSocket Flow

1. **Call comes in** → Twilio sends POST to `/twiml`
2. **TwiML returned** with `<ConversationRelay url="wss://...">`
3. **WebSocket opens** → Twilio sends `setup` message
4. **Caller speaks** → Twilio sends `prompt` message with transcription
5. **Edge Function** → Calls Claude AI with tools
6. **Claude responds** → Streaming tokens sent back as `text` messages
7. **Claude calls tool** → Function executes, returns result, Claude continues
8. **Call ends** → Conversation saved to database

### Message Types

**From Twilio:**
- `setup` - Call metadata
- `prompt` - User speech transcription
- `interrupt` - Caller interrupted AI
- `dtmf` - Phone key pressed
- `error` - Error occurred

**To Twilio:**
- `text` - Token to speak (supports streaming)
- `play` - Play audio file
- `language` - Switch language
- `sendDigits` - Send DTMF tones
- `end` - End call with optional handoff data

---

## Features Breakdown

### 1. Tool Calling

Claude can use tools during conversations:

**Built-in tools:**
- `search_knowledge_base` - Query restaurant info
- `take_order` - Record customer orders
- `leave_voicemail` - Save messages
- `transfer_to_human` - Hand off to staff

**Custom tools:**
- Defined in `voice_tools` table
- Edit via Admin Panel → Voice Agent → Tools
- Each tool has JSON schema for validation

**How it works:**
```
User: "How much is a beef sandwich?"
     ↓
Claude: *calls search_knowledge_base tool*
     ↓
Function: Returns menu info from database
     ↓
Claude: "Our Italian beef is $8.99, and you can add cheese for $1 extra."
```

### 2. Stateful Prompt Trees

Define conversation flows that guide users:

**Example flow:**
```
greeting → hours_question → menu_interest → order_taking → confirm_order
```

**Managed in:**
- Database: `voice_prompts` table
- Admin Panel: Voice Agent → Prompt Tree

**Each prompt has:**
- `prompt_key` - Unique ID
- `prompt_text` - What AI says
- `next_prompts` - Possible next steps
- `required_intent` - Trigger condition

### 3. Multi-Provider Voice Configuration

**STT Providers:**
- **Deepgram**: Best for phone calls, nova-2 model
- **Google**: Good fallback, multiple models

**TTS Providers:**
- **Google**: Neural2 voices, good quality
- **Amazon Polly**: Neural voices, reliable
- **ElevenLabs**: Most natural, Flash 2.5 model

**Configured via:**
- Admin Panel: Voice Agent → Voice Config
- Database: `phone_numbers` table columns

### 4. Knowledge Base Integration

**How it works:**
- Stored in `voice_agent_knowledge` table
- Searchable by category (hours, menu, location, etc.)
- Claude uses `search_knowledge_base` tool
- Admin can add/edit via Voice Agent → Knowledge Base

**Example:**
```sql
INSERT INTO voice_agent_knowledge (category, question, answer)
VALUES (
  'menu',
  'Do you have Italian beef?',
  'Yes! Our Italian beef is $8.99 with peppers...'
);
```

---

## Monitoring & Analytics

### View Call Logs

**Via Admin Panel:**
- Voice Agent → Call Logs
- Shows: caller, intent, sentiment, transcript

**Via Database:**
```sql
SELECT
  caller_number,
  intent,
  sentiment,
  conversation_transcript,
  started_at
FROM voice_calls
ORDER BY started_at DESC
LIMIT 10;
```

### View Voicemails

**Via Admin Panel:**
- Voice Agent → Voicemails
- Plays audio, shows transcription

**Via Database:**
```sql
SELECT
  caller_number,
  category,
  transcription,
  recording_url,
  created_at
FROM voice_voicemails
ORDER BY created_at DESC;
```

### Check Edge Function Logs

https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/logs/edge-functions

Look for:
- `conversation-relay-handler` function
- WebSocket connection events
- Claude API calls
- Tool executions

### Check Twilio Logs

https://console.twilio.com/us1/monitor/logs/calls

Look for:
- ConversationRelay connections
- WebSocket handshake
- Call duration
- Any errors

---

## Troubleshooting

### Issue: Calls connect but no AI response

**Check:**
1. Edge Function logs for errors
2. ANTHROPIC_API_KEY is set correctly
3. WebSocket URL in TwiML is correct
4. Conversation mode is set to `conversationrelay`

**Fix:**
```bash
# Verify environment variable
npx supabase secrets list --project-ref xxwqmakcrchgefgzrulf

# Redeploy function
npx supabase functions deploy conversation-relay-handler --project-ref xxwqmakcrchgefgzrulf
```

### Issue: Tool calling not working

**Check:**
1. Tools are enabled in `voice_tools` table
2. Tool input matches schema
3. Handler function exists in Edge Function

**Fix:**
```sql
-- Enable all tools
UPDATE voice_tools SET enabled = true;
```

### Issue: Wrong voice/accent

**Check:**
1. Admin Panel → Voice Config → TTS settings
2. `phone_numbers` table `tts_voice` column

**Fix:**
- Update via Admin Panel
- Or directly in database:
```sql
UPDATE phone_numbers
SET tts_provider = 'Google',
    tts_voice = 'en-US-Neural2-D'
WHERE tenant_id = 'chicago-mikes';
```

### Issue: Poor transcription accuracy

**Check:**
1. STT provider and model
2. Background noise
3. Language setting

**Fix:**
- Switch to Deepgram with nova-2 model
- Enable speech hints in voice_config:
```sql
UPDATE phone_numbers
SET voice_config = jsonb_set(
  voice_config,
  '{hints}',
  '["Italian beef", "hot dog", "Chicago Mike"]'::jsonb
)
WHERE tenant_id = 'chicago-mikes';
```

### Issue: Calls disconnect unexpectedly

**Check:**
1. WebSocket connection stability
2. Edge Function timeout
3. Claude API errors

**Fix:**
- Check Edge Function logs
- Ensure WebSocket stays open
- Add error handling for Claude API failures

---

## Next Steps

1. **Populate Knowledge Base**
   - Add all menu items with prices
   - Add FAQ entries
   - Add special instructions

2. **Customize Prompt Tree**
   - Define your conversation flows
   - Add branching based on intents
   - Test different paths

3. **Create Custom Tools**
   - Add tools specific to your business
   - Integrate with external APIs
   - Add database operations

4. **Test Thoroughly**
   - Call multiple times
   - Try different questions
   - Test error scenarios
   - Verify tool calling

5. **Monitor Performance**
   - Check call logs daily
   - Review transcripts
   - Identify gaps in knowledge
   - Optimize prompts

6. **Go Live!**
   - Announce to customers
   - Add phone number to website
   - Train staff on system
   - Monitor and iterate

---

## Advanced Configuration

### Custom Language Support

Add more languages in voice_config:

```sql
UPDATE phone_numbers
SET voice_config = jsonb_set(
  voice_config,
  '{languages}',
  '[
    {
      "code": "en-US",
      "ttsProvider": "Google",
      "voice": "en-US-Neural2-D",
      "transcriptionProvider": "Deepgram",
      "speechModel": "nova-2"
    },
    {
      "code": "es-US",
      "ttsProvider": "Google",
      "voice": "es-US-Neural2-A",
      "transcriptionProvider": "Deepgram",
      "speechModel": "nova-2"
    },
    {
      "code": "fr-FR",
      "ttsProvider": "Google",
      "voice": "fr-FR-Neural2-A",
      "transcriptionProvider": "Google",
      "speechModel": "telephony"
    }
  ]'::jsonb
)
WHERE tenant_id = 'chicago-mikes';
```

### Custom Claude Settings

Adjust AI behavior in Edge Function:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,  // Limit response length
  temperature: 0.7,   // 0 = deterministic, 1 = creative
  system: systemPrompt,
  messages: state.messages,
  tools: tools
})
```

### Business Hours Automation

The voice agent can automatically check business hours and adjust responses:

```typescript
// In Edge Function
const isOpen = await checkBusinessHours(state.context.tenantId)

if (!isOpen) {
  await sendResponse(socket,
    "We're currently closed. Our hours are " + state.context.hours +
    ". Would you like to leave a message?"
  )
}
```

---

## Cost Estimates

**Per Call:**
- Twilio ConversationRelay: ~$0.05-0.10/min
- Claude API: ~$0.003-0.015/call (depends on length)
- Deepgram STT: ~$0.0036/min
- Google TTS: ~$0.000004/character

**Example 2-minute call:**
- Twilio: $0.10-0.20
- Claude: $0.01
- Deepgram: $0.007
- Google TTS: ~$0.01
- **Total: ~$0.13-0.23 per call**

Much cheaper than human staff while providing 24/7 coverage!

---

## Support

**Documentation:**
- Twilio ConversationRelay: https://www.twilio.com/docs/voice/conversationrelay
- Claude API: https://docs.anthropic.com/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

**Your Setup:**
- Phone: +1 (720) 702-2122
- Supabase: xxwqmakcrchgefgzrulf
- Function: conversation-relay-handler

**Issues?**
- Check Edge Function logs
- Review Twilio debugger
- Inspect call logs in database
- Test with simple handler first
