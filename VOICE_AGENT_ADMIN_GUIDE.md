# Voice Agent Admin Panel Guide

## Overview

The Voice Agent admin panel provides a complete interface for managing your AI phone answering service directly from the kiosk admin panel.

## Accessing the Voice Agent Panel

1. Open the Admin Panel (tap 4 corners: TL → TR → BR → BL)
2. Enter PIN code
3. Click the **"Voice Agent"** tab

## Features

### 1. 📞 Settings Section

**Phone Configuration:**
- View your active phone number
- See current status (Active/Inactive)
- Edit greeting message
- Change voice type
- Test call directly from the panel

**To update greeting:**
1. Click "Edit Greeting"
2. Enter new message
3. Saves automatically

**To test your voice agent:**
- Click "📞 Call Now" to test from your device

---

### 2. 📚 Knowledge Base Management

Manage what your AI knows about your business.

**Add Knowledge Entry:**
1. Click "➕ Add Knowledge Entry"
2. Enter Category (e.g., "hours", "menu", "location")
3. Enter Sample Question (e.g., "What time do you close?")
4. Enter Answer (e.g., "We close at 9 PM Monday-Thursday...")

**Manage Entries:**
- **Enable/Disable**: Toggle entries on/off without deleting
- **Delete**: Remove entries permanently
- **Categories**: Color-coded for easy identification

**Example Categories:**
- `hours` - Business hours questions
- `menu` - Menu items, ingredients, prices
- `location` - Address, directions, parking
- `dietary` - Gluten-free, vegan, allergen info
- `specials` - Daily specials, promotions
- `catering` - Catering and large orders

---

### 3. 📞 Call Logs

View all incoming calls with detailed analytics.

**Information Displayed:**
- Caller phone number
- Date and time of call
- Detected intent (hours, menu, order, etc.)
- Sentiment analysis (positive, neutral, negative)
- Call status (completed, voicemail, transferred)
- Full conversation transcript (expandable)

**How to view transcript:**
- Click "View Transcript" to expand
- Shows complete conversation in JSON format

**Use Case:**
- Monitor customer questions
- Identify gaps in knowledge base
- Track common inquiries
- Analyze sentiment trends

---

### 4. 💬 Voicemails

Manage voicemails left by customers.

**Information Displayed:**
- Caller phone number
- Date and time
- Category (feedback, complaint, question, etc.)
- Transcription (auto-generated)
- Audio playback

**How to listen:**
- Click play button on audio player
- Read transcription for quick review

**Use Case:**
- Review customer feedback
- Follow up on questions
- Address complaints
- Collect testimonials

---

## Tips for Best Results

### Knowledge Base Best Practices

1. **Be Specific**: Add multiple variations of the same question
   ```
   Q: "What time do you open?"
   Q: "When do you open today?"
   Q: "Are you open now?"
   ```

2. **Keep Answers Concise**: AI reads these aloud, keep under 30 seconds

3. **Update Regularly**: Add new entries based on call logs

4. **Use Categories**: Organize by topic for easier management

### Monitoring Tips

1. **Check Call Logs Daily**: Look for:
   - Unanswered questions
   - Common themes
   - Negative sentiment

2. **Review Voicemails**:
   - Follow up within 24 hours
   - Add missed info to knowledge base
   - Track recurring issues

3. **Test Regularly**:
   - Call your number weekly
   - Ask different types of questions
   - Verify greeting is appropriate

---

## Common Workflows

### Adding Menu Items
1. Go to Knowledge Base
2. Category: `menu`
3. Add entry for each item:
   ```
   Q: "Do you have Italian beef?"
   A: "Yes! Our Italian beef sandwich is $8.99 and comes with peppers. You can add cheese for $1 extra."
   ```

### Updating Hours
1. Go to Knowledge Base
2. Find existing hours entry
3. Click Delete
4. Add new entry with updated hours

### Following Up on Voicemail
1. Go to Voicemails
2. Read transcription
3. Note phone number
4. Call customer back
5. (Optional) Add to knowledge base if question was common

---

## Database Tables Reference

If you need direct database access:

- `phone_numbers` - Phone configuration
- `voice_agent_knowledge` - Knowledge base entries
- `voice_calls` - Call logs and transcripts
- `voice_voicemails` - Voicemail recordings and transcriptions

---

## Troubleshooting

**No calls showing up?**
- Verify Twilio webhook is configured (see TWILIO_WEBHOOK_SETUP.md)
- Check phone number status is "Active"
- Test by calling the number

**AI not answering correctly?**
- Check Knowledge Base has relevant entries
- Verify entries are Enabled (green checkmark)
- Add more variations of the question

**Can't edit settings?**
- Make sure you're authenticated in admin panel
- Check database permissions
- Verify phone_numbers table has data

---

## Next Steps

1. **Populate Knowledge Base**: Add 10-20 common questions
2. **Test Thoroughly**: Call multiple times with different questions
3. **Monitor Performance**: Check call logs daily for first week
4. **Iterate**: Add entries based on real calls
5. **Announce**: Tell customers about your new AI assistant!

---

## Support

For issues or questions:
- Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
- Review Twilio debugger: console.twilio.com/monitor/debugger
- Check database: Supabase Dashboard → Table Editor

**Your phone number**: +1 (720) 702-2122
**Webhook URL**: https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler-simple
