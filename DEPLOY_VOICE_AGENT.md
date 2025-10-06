# Deploy Voice AI Agent - Step by Step Guide

## ✅ Completed
- [x] Database migration applied
- [x] Phone number configured: +1 (720) 702-2122
- [x] Knowledge base populated
- [x] Voice agent enabled for chicago-mikes

## 🚀 Deployment Steps

### Step 1: Deploy the Edge Function

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/functions

2. Click **"Create a new function"**

3. Function details:
   - **Name**: `inbound-voice-handler`
   - **Region**: Choose closest to your users (e.g., `us-east-1`)

4. Copy the code from: `supabase/functions/inbound-voice-handler/index.ts`

5. Click **"Deploy"**

6. Once deployed, copy the function URL (it will be something like):
   ```
   https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler
   ```

**Option B: Via CLI (if you prefer)**

```bash
# Login to Supabase
npx supabase login

# Deploy the function
npx supabase functions deploy inbound-voice-handler --project-ref xxwqmakcrchgefgzrulf

# Set environment variables
npx supabase secrets set ANTHROPIC_API_KEY=your_anthropic_api_key_here --project-ref xxwqmakcrchgefgzrulf
```

---

### Step 2: Configure Twilio Webhook

1. **Go to Twilio Console**: https://console.twilio.com/

2. **Navigate to Phone Numbers**:
   - Click "Phone Numbers" → "Manage" → "Active numbers"
   - Find and click on: **+1 (720) 702-2122**

3. **Configure Voice Settings**:
   Scroll to "Voice & Fax" section:

   - **A CALL COMES IN**:
     - Select: "Webhook"
     - URL: `https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler`
     - Method: **POST**

   - **PRIMARY HANDLER FAILS**:
     - Select: "Voicemail"
     - Or provide a fallback number

4. **Click "Save"** at the bottom

---

### Step 3: Set Environment Variables in Supabase

The Edge Function needs these environment variables:

1. Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/settings/functions

2. Add these secrets:
   - **ANTHROPIC_API_KEY**: Your Claude API key from https://console.anthropic.com/

**Via CLI:**
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref xxwqmakcrchgefgzrulf
```

---

### Step 4: Test the Voice Agent

**Call the number**: **+1 (720) 702-2122**

**Test scenarios:**

1. **Test hours inquiry**:
   - Say: "What time are you open today?"
   - Expected: AI tells you hours (Mon-Thu 9-9, Fri-Sat 9-10, Sun 10-8)

2. **Test menu question**:
   - Say: "Do you have gluten-free options?"
   - Expected: AI confirms gluten-free buns available

3. **Test order taking**:
   - Say: "I'd like to order a beef sandwich"
   - Expected: AI starts taking your order

4. **Test location**:
   - Say: "Where are you located?"
   - Expected: AI provides Chicago, IL location

5. **Test voicemail**:
   - Say: "I want to leave feedback"
   - Expected: AI offers to take a message

---

### Step 5: Monitor Calls (Optional)

**View call logs in database:**

```sql
-- See recent calls
SELECT
  caller_number,
  intent,
  sentiment,
  status,
  started_at
FROM voice_calls
WHERE tenant_id = 'chicago-mikes'
ORDER BY started_at DESC
LIMIT 10;

-- See voicemails
SELECT
  caller_number,
  transcription,
  category,
  status,
  created_at
FROM voice_voicemails
WHERE tenant_id = 'chicago-mikes'
ORDER BY created_at DESC;
```

**Or via Supabase Dashboard:**
- Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/editor
- Browse `voice_calls` and `voice_voicemails` tables

---

## 📊 What Gets Tracked

Every call creates a record with:
- Caller's phone number
- Full conversation transcript
- Detected intent (hours, menu, order, feedback, etc.)
- Sentiment analysis (positive, neutral, negative)
- Call duration
- Outcomes (order created, voicemail left, etc.)

---

## 🔧 Troubleshooting

### Issue: "Access token not provided"
**Solution**: Use Supabase Dashboard to deploy instead of CLI, or run:
```bash
npx supabase login
```

### Issue: Calls don't trigger the webhook
**Checklist**:
1. ✅ Webhook URL is correct in Twilio console
2. ✅ Edge Function is deployed and shows "Healthy"
3. ✅ ANTHROPIC_API_KEY is set in Supabase secrets
4. ✅ Phone number status is "active" in database

### Issue: AI doesn't respond properly
**Check**:
1. View Edge Function logs: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/logs/edge-functions
2. Verify knowledge base has entries:
   ```sql
   SELECT * FROM voice_agent_knowledge WHERE tenant_id = 'chicago-mikes';
   ```
3. Check ANTHROPIC_API_KEY is valid

### Issue: Business hours not working
**Update hours in database**:
```sql
UPDATE phone_numbers
SET business_hours = '{
  "monday": {"open": "09:00", "close": "21:00", "enabled": true},
  "tuesday": {"open": "09:00", "close": "21:00", "enabled": true},
  ...
}'::jsonb
WHERE tenant_id = 'chicago-mikes';
```

---

## 🎯 Next Steps After Testing

1. **Add more knowledge base entries**:
   - Full menu with prices
   - Specific policies (refunds, allergies, etc.)
   - Delivery area information

2. **Customize greeting message**:
   ```sql
   UPDATE phone_numbers
   SET greeting_message = 'Your custom greeting here!'
   WHERE tenant_id = 'chicago-mikes';
   ```

3. **Set up SMS notifications** for new voicemails

4. **Build admin dashboard** to view calls and voicemails

5. **Add to marketing site** - announce the feature to customers!

---

## 📞 Support

If you encounter issues:
1. Check Edge Function logs in Supabase Dashboard
2. Check Twilio debugger: https://console.twilio.com/monitor/debugger
3. Verify database tables have correct data
4. Review call records in `voice_calls` table

**Your number**: +1 (720) 702-2122
**Supabase project**: xxwqmakcrchgefgzrulf
