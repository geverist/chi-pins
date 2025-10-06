# Configure Twilio Webhook - Final Step

## ✅ Completed:
- [x] Edge Function deployed: `inbound-voice-handler`
- [x] Anthropic API key configured
- [x] Database tables created
- [x] Phone number configured: **+1 (720) 702-2122**
- [x] Knowledge base loaded

## 🎯 Final Step: Connect Twilio to Your Edge Function

### 1. Go to Twilio Console
**URL**: https://console.twilio.com/us1/develop/phone-numbers/manage/active

### 2. Find Your Phone Number
- Click on: **+1 (720) 702-2122**

### 3. Configure Voice Settings

Scroll down to **"Voice Configuration"** section:

**When a call comes in:**
- Select: `Webhook`
- URL: `https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler`
- HTTP Method: `POST`

**Primary handler fails:**
- Select: `URL` (optional fallback)
- Or leave as default

### 4. Save Configuration
- Scroll to bottom
- Click **"Save configuration"** or **"Save"**

---

## 🧪 Test Your Voice Agent

### Call the number: **+1 (720) 702-2122**

**Test Scenarios:**

1. **"What time are you open?"**
   - ✅ Should respond with hours: Mon-Thu 9-9, Fri-Sat 9-10, Sun 10-8

2. **"Do you have gluten-free options?"**
   - ✅ Should confirm gluten-free buns available

3. **"Where are you located?"**
   - ✅ Should say Chicago, Illinois

4. **"I want to order a beef sandwich"**
   - ✅ Should start taking your order

5. **"I want to leave feedback"**
   - ✅ Should offer to take a message

---

## 📊 Monitor Calls

**View in Database:**
```sql
-- See recent calls
SELECT
  caller_number,
  intent,
  sentiment,
  started_at,
  conversation_transcript
FROM voice_calls
ORDER BY started_at DESC
LIMIT 5;
```

**View in Supabase Dashboard:**
- Go to: https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/editor
- Browse `voice_calls` table

**View Twilio Logs:**
- https://console.twilio.com/us1/monitor/logs/calls

---

## 🔧 If Something Doesn't Work

### Check Edge Function Logs:
https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/logs/edge-functions

### Check Twilio Debugger:
https://console.twilio.com/us1/monitor/debugger

### Common Issues:

**Issue**: Call connects but AI doesn't respond
- ✅ Check Edge Function logs for errors
- ✅ Verify ANTHROPIC_API_KEY is set correctly
- ✅ Check webhook URL is exactly: `https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler`

**Issue**: Webhook not triggered
- ✅ Verify Twilio webhook URL is saved
- ✅ Check HTTP method is POST
- ✅ Test webhook in Twilio console using "Test" button

**Issue**: Business hours not working
- ✅ Check timezone settings in phone_numbers table
- ✅ Verify current time matches business hours

---

## 🎉 You're Live!

Once the webhook is configured, your AI voice agent is **live and answering calls 24/7!**

**What happens on each call:**
1. Customer calls +1 (720) 702-2122
2. Twilio routes to your Edge Function
3. Claude AI understands the question
4. AI responds with information from knowledge base
5. Full conversation logged to database
6. Voicemails transcribed automatically

**Your voice agent can:**
- ✅ Answer questions about hours, location, menu
- ✅ Take food orders
- ✅ Handle dietary restrictions
- ✅ Collect feedback
- ✅ Transfer to human if needed
- ✅ Leave voicemails

---

## 📈 Next Steps

1. **Test thoroughly** - Call multiple times with different questions
2. **Add more knowledge** - Update `voice_agent_knowledge` table
3. **Customize greeting** - Update `phone_numbers.greeting_message`
4. **Monitor analytics** - Check call logs daily
5. **Announce to customers** - Add to website/social media

**Enjoy your AI voice agent!** 🤖📞
