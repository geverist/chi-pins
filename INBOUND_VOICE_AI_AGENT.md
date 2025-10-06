# Inbound Voice AI Agent Add-On

## Overview

The Inbound Voice AI Agent is a premium add-on that provides businesses with an AI-powered phone answering service. When customers call the business, an intelligent voice agent handles inquiries, takes orders, and collects feedback—all without requiring staff to answer the phone.

---

## Use Cases

### Restaurant (Chicago Mike's Example)
- **Hours & Location**: "What time are you open today?"
- **Menu Questions**: "Do you have gluten-free options?"
- **Place Orders**: "I'd like to order 2 Italian beefs and a hot dog for pickup"
- **Wait Times**: "How long is the wait right now?"
- **Reservations**: "Can I make a reservation for 6 people tonight?"
- **Feedback**: "I want to leave a compliment about my server"

### Medical Spa
- **Appointment Booking**: "I'd like to book a facial for next Tuesday"
- **Service Information**: "How much does Botox cost?"
- **Hours & Availability**: "Are you open on weekends?"
- **Pre-appointment Questions**: "What should I do before my laser treatment?"

### Auto Repair Shop
- **Estimate Requests**: "How much for an oil change?"
- **Appointment Scheduling**: "Can I get my car in tomorrow morning?"
- **Service Status**: "Is my car ready for pickup?"
- **Hours & Location**: "What time do you close today?"

### Hotel/Hospitality
- **Room Availability**: "Do you have rooms available this weekend?"
- **Amenities Information**: "Do you have a pool?"
- **Check-in/out Times**: "What time is check-in?"
- **Local Recommendations**: "What restaurants are nearby?"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer Phone Call                       │
│                 +1-555-CHICAGO (Example)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Twilio Voice Gateway                       │
│  • Receives inbound call                                     │
│  • Routes to EngageOS Voice Agent webhook                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          EngageOS Voice Agent (Supabase Edge Function)      │
│  • Identifies tenant from phone number                       │
│  • Loads tenant context (menu, hours, settings)              │
│  • Streams to Claude AI for conversation                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude AI (Anthropic)                     │
│  • Conversational understanding                              │
│  • Menu recommendations                                      │
│  • Order taking                                              │
│  • Appointment scheduling                                    │
│  • Voicemail transcription                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              EngageOS Business Logic                         │
│  • Create orders in system                                   │
│  • Save voicemails/feedback                                  │
│  • Send confirmation SMS                                     │
│  • Update analytics                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. **AI-Powered Conversations**
- Natural language understanding
- Context-aware responses
- Multi-turn conversations
- Transfer to human when needed

### 2. **Business Information**
- Hours of operation
- Location & directions
- Current wait times
- Special announcements

### 3. **Order Taking** (Restaurants)
- Browse menu by voice
- Add items to cart
- Dietary restrictions & modifications
- Payment over phone or in-person
- SMS confirmation with order details

### 4. **Appointment Scheduling** (Service Businesses)
- Check availability
- Book appointments
- Reschedule/cancel
- SMS confirmation

### 5. **Voicemail & Feedback**
- Leave messages for staff
- Collect customer feedback
- Transcribe and categorize
- Notify staff via SMS/email

### 6. **Analytics & Insights**
- Call volume tracking
- Peak call times
- Common questions
- Conversion rates (calls → orders)
- Customer sentiment analysis

---

## Database Schema

### Table: `phone_numbers`
Tracks provisioned phone numbers for each tenant.

```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE, -- E.164 format: +15551234567
  provider TEXT DEFAULT 'twilio',
  status TEXT DEFAULT 'active',

  -- Configuration
  greeting_message TEXT,
  voice_type TEXT DEFAULT 'nova', -- Twilio voice: alice, man, woman, or custom
  language TEXT DEFAULT 'en-US',

  -- Routing
  fallback_number TEXT, -- Transfer to human if AI can't handle
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "21:00"},
    "tuesday": {"open": "09:00", "close": "21:00"},
    "wednesday": {"open": "09:00", "close": "21:00"},
    "thursday": {"open": "09:00", "close": "21:00"},
    "friday": {"open": "09:00", "close": "22:00"},
    "saturday": {"open": "09:00", "close": "22:00"},
    "sunday": {"open": "10:00", "close": "20:00"}
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(phone_number);
```

### Table: `voice_calls`
Logs all inbound voice calls.

```sql
CREATE TABLE voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id),

  -- Call details
  caller_number TEXT NOT NULL, -- Customer's phone number
  call_sid TEXT UNIQUE, -- Twilio call SID
  duration_seconds INTEGER,
  status TEXT DEFAULT 'in-progress', -- in-progress, completed, failed, no-answer

  -- AI interaction
  conversation_transcript JSONB, -- Full conversation history
  intent TEXT, -- hours, menu, order, feedback, appointment, other
  sentiment TEXT, -- positive, neutral, negative

  -- Outcomes
  order_id UUID, -- Link to created order
  appointment_id UUID, -- Link to created appointment
  voicemail_id UUID, -- Link to voicemail
  transferred_to_human BOOLEAN DEFAULT false,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_calls_tenant ON voice_calls(tenant_id);
CREATE INDEX idx_voice_calls_caller ON voice_calls(caller_number);
CREATE INDEX idx_voice_calls_intent ON voice_calls(intent);
CREATE INDEX idx_voice_calls_started ON voice_calls(started_at DESC);
```

### Table: `voice_voicemails`
Stores voicemails and feedback left via phone.

```sql
CREATE TABLE voice_voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES voice_calls(id),

  -- Voicemail content
  caller_number TEXT,
  caller_name TEXT,
  recording_url TEXT, -- Twilio recording URL
  transcription TEXT, -- AI transcription
  category TEXT, -- feedback, complaint, question, other
  sentiment TEXT, -- positive, neutral, negative

  -- Status
  status TEXT DEFAULT 'new', -- new, read, archived
  assigned_to UUID, -- Staff member

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_voice_voicemails_tenant ON voice_voicemails(tenant_id);
CREATE INDEX idx_voice_voicemails_status ON voice_voicemails(status);
CREATE INDEX idx_voice_voicemails_created ON voice_voicemails(created_at DESC);
```

### Table: `voice_agent_knowledge`
Custom knowledge base for the voice AI agent per tenant.

```sql
CREATE TABLE voice_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Knowledge entry
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT, -- hours, menu, services, policies, other
  priority INTEGER DEFAULT 0, -- Higher priority = AI uses first

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_knowledge_tenant ON voice_agent_knowledge(tenant_id);
CREATE INDEX idx_voice_knowledge_category ON voice_agent_knowledge(category);
```

---

## Pricing Structure

### Add-On Pricing
- **Base**: $99/month
  - Includes: Dedicated phone number + 100 minutes/month
  - AI-powered answering
  - Order taking & appointment scheduling
  - Voicemail transcription
  - Basic analytics

- **Additional Minutes**: $0.15/minute after 100 minutes
- **Premium Features** (+$49/month):
  - Custom voice training
  - Advanced sentiment analysis
  - CRM integrations
  - Priority support

### Bundle Pricing
- **SMS + Email + Translation + Voice**: $199/month (save $48)

---

## Integration Points

### 1. Twilio Integration
```javascript
// supabase/functions/inbound-voice-handler/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const formData = await req.formData();
  const callSid = formData.get('CallSid');
  const from = formData.get('From');
  const to = formData.get('To');

  // Identify tenant from phone number
  const { data: phoneNumber } = await supabase
    .from('phone_numbers')
    .select('tenant_id, greeting_message')
    .eq('phone_number', to)
    .single();

  // Set tenant context
  await setTenantContext(supabase, phoneNumber.tenant_id);

  // Generate TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="nova">${phoneNumber.greeting_message}</Say>
  <Gather input="speech" action="/voice-agent-response" method="POST">
    <Say>How can I help you today?</Say>
  </Gather>
</Response>`;

  return new Response(twiml, {
    headers: { 'Content-Type': 'text/xml' }
  });
});
```

### 2. Claude AI Integration
```javascript
// Stream conversation to Claude
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  system: `You are a helpful voice assistant for ${tenantName}.

Business Hours: ${businessHours}
Menu: ${menu}

Help customers with:
- Answering questions about hours and location
- Taking food orders
- Collecting feedback
- Transferring to staff if needed

Be conversational, friendly, and concise. Keep responses under 30 seconds.`,
  messages: conversationHistory
});
```

### 3. Order Creation
```javascript
// Create order from voice call
const order = await supabase.from('orders').insert([{
  tenant_id: tenantId,
  customer_phone: callerNumber,
  items: extractedItems,
  total_amount: calculateTotal(extractedItems),
  order_type: 'phone',
  status: 'pending',
  special_instructions: extractedNotes
}]);

// Send SMS confirmation
await sendSMS(callerNumber, `Order confirmed! Total: $${total}. Ready in 20 min.`);
```

---

## Admin Dashboard Features

### Call Management
- **Live Call Monitor**: See active calls in real-time
- **Call History**: Filter by date, intent, duration
- **Call Recordings**: Listen to recordings with transcripts
- **Analytics Dashboard**:
  - Calls per day/week/month
  - Peak call times heatmap
  - Top intents
  - Conversion rates

### Knowledge Base Editor
- Add/edit custom Q&A
- Test AI responses
- Import from FAQ
- Priority ranking

### Settings
- **Greeting Message**: Customize initial greeting
- **Business Hours**: Set when to accept calls
- **Transfer Rules**: When to transfer to human
- **Voicemail Settings**: Notification preferences
- **Voice Selection**: Choose AI voice type

---

## Marketing Copy

### For Restaurant Industry Page

```html
<div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border: 2px solid #667eea;">
  <h4 style="color: #667eea; margin-bottom: 15px;">📞 NEW: AI Voice Agent</h4>
  <p style="margin-bottom: 15px;">
    Never miss a call again! Our AI voice agent answers customer calls 24/7,
    takes orders, answers menu questions, and collects feedback—all without
    staff having to pick up the phone.
  </p>
  <div style="text-align: left;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
      <span>📞 AI Voice Agent (100 min/month)</span>
      <strong>+$99/month</strong>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
      <span>📞 Premium Voice + Advanced Analytics</span>
      <strong>+$148/month</strong>
    </div>
  </div>
  <div style="margin-top: 15px; padding: 10px; background: #f7fafc; border-radius: 4px;">
    <strong>✨ Includes:</strong>
    <ul style="margin: 10px 0 0 20px; font-size: 14px;">
      <li>Dedicated business phone number</li>
      <li>AI-powered order taking</li>
      <li>Hours & menu questions</li>
      <li>Voicemail transcription</li>
      <li>SMS order confirmations</li>
      <li>Call analytics dashboard</li>
    </ul>
  </div>
</div>
```

---

## Implementation Checklist

### Phase 1: Infrastructure (Week 1)
- [ ] Create database migrations for phone tables
- [ ] Set up Twilio account integration
- [ ] Build phone number provisioning API
- [ ] Create Supabase Edge Function for inbound calls

### Phase 2: AI Agent (Week 2)
- [ ] Integrate Claude AI for conversations
- [ ] Build intent classification
- [ ] Create order-taking flow
- [ ] Implement voicemail transcription

### Phase 3: Admin Dashboard (Week 3)
- [ ] Call history viewer
- [ ] Live call monitoring
- [ ] Knowledge base editor
- [ ] Analytics dashboard

### Phase 4: Testing & Launch (Week 4)
- [ ] Test with Chicago Mike's
- [ ] Load testing (100 concurrent calls)
- [ ] Documentation
- [ ] Marketing materials
- [ ] Public launch

---

## Success Metrics

- **Call Answer Rate**: 100% (vs. ~60% industry average)
- **Order Conversion**: 35%+ of calls → orders
- **Customer Satisfaction**: 4.5+ stars
- **Cost Savings**: $800-1200/month per location (vs. hiring staff)
- **Revenue Increase**: 15-25% from captured orders

---

## Next Steps

1. **Enable for Chicago Mike's**: Provision +1-555-CHICAGO number
2. **Train AI on menu**: Load full menu into knowledge base
3. **Set business hours**: Configure call routing
4. **Test internally**: Team testing for 1 week
5. **Soft launch**: Announce to select customers
6. **Full launch**: Add to all industry marketing pages
