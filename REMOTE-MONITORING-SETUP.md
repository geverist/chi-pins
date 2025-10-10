# Remote Monitoring & Adaptive Learning Setup Guide

## What's Been Completed ✅

### 1. Adaptive Learning System (FULLY INTEGRATED)
- **Hook**: `src/hooks/useAdaptiveLearning.js` - Complete ML-powered learning system
- **Model**: `src/lib/engagementModel.js` - TensorFlow.js neural network (already existed)
- **Eye Tracking**: `src/hooks/useEyeTracking.js` - MediaPipe gaze detection (exists but not integrated yet)
- **Integration**: Fully wired into `App.jsx` with session tracking

#### How It Works:
1. **Session Recording**: Every time someone approaches or ambient motion is detected, a learning session starts
2. **Outcome Tracking**:
   - ✅ **Converted**: User places a pin (tracked in `savePin` function)
   - ❌ **Abandoned**: User walks away (tracked in `onIdle` callback)
   - 👀 **Engaged**: User interacts but doesn't complete
3. **Exponential Backoff**: Learns aggressively early (100%), stabilizes over time (5% after 1000 sessions)
4. **Auto Threshold Adjustment**:
   - High abandonment (>30%) → Increase thresholds 10%
   - Low abandonment (<15%) + high engagement → Decrease thresholds 10%
5. **Incremental Training**: Retrains ML model every 10 sessions
6. **Stats Analysis**: Reloads and auto-adjusts every 20 sessions

---

### 2. Console Webhook System (NEW!)
- **Utility**: `src/lib/consoleWebhook.js` - Remote console event monitoring
- **Integration**: Initialized in `App.jsx` when enabled
- **SQL Migration**: `sql-migrations/add-console-webhook-settings.sql`

#### Features:
- 📊 **Batched Events**: Sends console events in batches (every 2 seconds or 50 events)
- 🎯 **Level Filtering**: Choose which levels to capture (log, error, warn, info)
- 📍 **Location Data**: Includes timestamp, user agent, and URL
- 🧪 **Test Function**: Built-in test event sender to verify webhook works
- 🔒 **Fire & Forget**: Won't block app if webhook is slow/down

---

## Setup Instructions

### Step 1: Run Database Migrations

You need to run these SQL migrations in your Supabase SQL Editor:

#### A. Adaptive Learning Tables (REQUIRED)
```sql
-- Copy and run: sql-migrations/create-proximity-learning-sessions.sql
```

This creates:
- `proximity_learning_sessions` table for storing session data
- Admin settings columns for learning configuration
- Analytics view for performance tracking
- Row-level security policies

#### B. Console Webhook Settings (OPTIONAL)
```sql
-- Copy and run: sql-migrations/add-console-webhook-settings.sql
```

This adds to `admin_settings`:
- `console_webhook_url` - Webhook URL to send events to
- `console_webhook_enabled` - Enable/disable toggle
- `console_webhook_levels` - Which levels to capture
- `console_webhook_batch_delay_ms` - Batch delay (default: 2000ms)
- `console_webhook_max_batch_size` - Max events per batch (default: 50)

---

### Step 2: Configure Webhook (Optional)

#### Option A: Via Supabase SQL Editor (Quickest)
```sql
UPDATE admin_settings
SET
  console_webhook_url = 'https://your-webhook-url.com/console-events',
  console_webhook_enabled = true,
  console_webhook_levels = ARRAY['log', 'error', 'warn', 'info']
WHERE tenant_id = 'chicago-mikes';
```

#### Option B: Via Admin Panel (Coming Soon)
We'll add controls to the Admin Panel "Advanced" tab:
- Text input for webhook URL
- Toggle to enable/disable
- Multi-select for log levels
- "Test Webhook" button

---

### Step 3: Set Up Webhook Endpoint (Your Backend)

You need a webhook endpoint that accepts POST requests. Here's what the payload looks like:

```json
{
  "source": "chi-pins-kiosk",
  "tenantId": "chicago-mikes",
  "batchTimestamp": "2025-10-10T12:57:00.000Z",
  "events": [
    {
      "level": "log",
      "message": "[App] Person detected approaching! Proximity: 75",
      "timestamp": "2025-10-10T12:56:58.123Z",
      "userAgent": "Mozilla/5.0...",
      "url": "https://chi-pins.com"
    },
    {
      "level": "info",
      "message": "[AdaptiveLearning] Started learning session: {...}",
      "timestamp": "2025-10-10T12:56:58.456Z",
      "userAgent": "Mozilla/5.0...",
      "url": "https://chi-pins.com"
    }
  ]
}
```

#### Example Webhook Implementations:

**Zapier Webhook:**
1. Create a new Zap with "Webhooks by Zapier" trigger
2. Choose "Catch Hook"
3. Copy the webhook URL
4. Add it to `console_webhook_url` in admin_settings
5. Connect to Slack, Discord, Email, Google Sheets, etc.

**Discord Webhook:**
```javascript
// Node.js Express endpoint
app.post('/console-events', (req, res) => {
  const { events, tenantId, batchTimestamp } = req.body;

  const discordWebhook = 'YOUR_DISCORD_WEBHOOK_URL';

  // Format for Discord
  const embed = {
    title: `🖥️ Kiosk Activity - ${tenantId}`,
    description: events.map(e =>
      `**[${e.level.toUpperCase()}]** ${e.message}`
    ).join('\n'),
    timestamp: batchTimestamp,
    color: 0x3B82F6,
  };

  fetch(discordWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  res.json({ success: true });
});
```

**Slack Webhook:**
```javascript
app.post('/console-events', (req, res) => {
  const { events, tenantId } = req.body;

  const slackWebhook = 'YOUR_SLACK_WEBHOOK_URL';

  const text = events.map(e =>
    `*[${e.level.toUpperCase()}]* ${e.message}`
  ).join('\n');

  fetch(slackWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🖥️ *Kiosk Activity - ${tenantId}*\n${text}`,
    }),
  });

  res.json({ success: true });
});
```

---

## Testing

### Test Adaptive Learning
1. Deploy to kiosk with database migrations
2. Walk in front of kiosk to trigger proximity detection
3. Check console logs for:
   ```
   [AdaptiveLearning] Started learning session: {...}
   [AdaptiveLearning] Learning probability: 98.0%
   ```
4. Either place a pin (conversion) or walk away (abandonment)
5. Check console for:
   ```
   [AdaptiveLearning] Session ended: converted (5240ms)
   ```
6. After 10 sessions, model trains automatically:
   ```
   [App] Model trained! Accuracy: 87.3% (10 sessions)
   ```
7. After 20 sessions, thresholds auto-adjust if needed:
   ```
   [App] Threshold adjustment recommended: {...}
   ```

### Test Console Webhook
1. Set up webhook URL in admin_settings
2. Enable webhook (`console_webhook_enabled = true`)
3. Deploy to kiosk
4. Check initial logs:
   ```
   [ConsoleWebhook] Initializing with URL: https://...
   [ConsoleWebhook] ✅ Initialized - console events will be sent to webhook
   ```
5. Trigger some console activity (proximity detection, pin placement, etc.)
6. Check your webhook endpoint receives batched events every 2 seconds
7. **Test Event**: Open browser console and run:
   ```javascript
   window.sendTestEvent()
   ```

---

## Monitoring What's Tracked

### Console Events Being Captured:
- **Proximity Detection**: Person approaching, ambient motion, stare detection
- **Adaptive Learning**: Session starts/ends, training events, threshold adjustments
- **Pin Placement**: Successful pins, errors, validations
- **Jukebox**: Track plays, queue changes
- **Voice Assistant**: Commands, responses
- **Business Hours**: Open/close events
- **Errors**: Any console.error or console.warn

### Key Events to Watch For:
```
[App] Person detected approaching! Proximity: 75
[AdaptiveLearning] Started learning session: {...}
[AdaptiveLearning] Session ended: converted (5240ms)
[App] Model trained! Accuracy: 87.3% (10 sessions)
[App] Threshold adjustment recommended: {...}
[Jukebox] Track started: Bohemian Rhapsody
[VoiceAssistant] Command received: place pin
[BusinessHours] Kiosk opened for business
```

---

## What's Next

### Immediate (Manual Setup Required):
1. Run SQL migration: `create-proximity-learning-sessions.sql`
2. Run SQL migration: `add-console-webhook-settings.sql`
3. Deploy to kiosk
4. Monitor console logs

### Optional (If Using Webhooks):
1. Set up webhook endpoint (Zapier, Discord, Slack, custom)
2. Configure webhook URL in Supabase admin_settings
3. Enable webhook
4. Test with `sendTestEvent()`

### Future Enhancements:
1. Add Admin Panel UI for webhook configuration
2. Add Admin Panel UI for adaptive learning settings:
   - Learning aggressiveness slider (1-100)
   - Passive learning mode toggle
   - Manual training button
   - Learning stats display (sessions, accuracy, abandonment rate)
3. Integrate eye tracking (`useEyeTracking`) to enhance engagement detection
4. Add learning data visualization dashboard
5. Export learning sessions to CSV for analysis

---

## Eye Tracking (Not Yet Integrated)

The `src/hooks/useEyeTracking.js` hook exists and provides:
- **Gaze Direction**: looking-at-screen, looking-away, unknown
- **Engagement Boost**: +20% when looking at screen, -30% when looking away
- **Face Detection**: Boolean indicating face presence

To integrate:
1. Import `useEyeTracking` in App.jsx
2. Initialize with `enabled` flag from admin settings
3. Pass `gazeDirection` to `adaptiveLearning.startSession()`
4. Use gaze data to enhance confidence scores

---

## Questions?

- **How often does the model train?** Every 10 sessions
- **How often do thresholds auto-adjust?** Every 20 sessions (if abandonment rate is too high/low)
- **What's the learning probability?** `aggressiveness / totalSessions` (100% early, 5% after 1000 sessions)
- **Can I disable learning?** Yes, set `proximity_learning_enabled = false` in admin_settings
- **Can I use passive mode?** Yes, set `passive_learning_mode = true` to collect data without taking actions
- **How do I reset learned data?** Truncate `proximity_learning_sessions` table in Supabase

Enjoy your adaptive, self-learning kiosk! 🎉
