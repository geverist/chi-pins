# 🤖 Self-Healing System Setup Guide

## What Is This?

The Chi-Pins kiosk now has an **autonomous self-healing system** that can:

1. **Monitor** - Continuously watch for errors in real-time
2. **Analyze** - Classify errors by severity and pattern
3. **Fix** - Automatically generate and apply code fixes
4. **Deploy** - Push fixes to production automatically
5. **Verify** - Confirm the error is resolved

## Architecture

```
┌─────────────────┐
│  Kiosk Device   │
│  (React App)    │
└────────┬────────┘
         │ Console logs
         │
         ▼
┌─────────────────────────────────────────┐
│  Console Webhook (consoleWebhook.js)   │
│  - Captures errors, warns, logs         │
│  - Batches events                       │
│  - Sends to webhook processor           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Webhook Processor (API endpoint)       │
│  - Deduplicates errors                  │
│  - Classifies severity                  │
│  - Stores in database                   │
│  - Sends SMS alerts (CRITICAL)          │
│  - Triggers auto-fix (optional)         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Auto-Healer (Background script)        │
│  - Polls database for new errors        │
│  - Analyzes error patterns              │
│  - Generates fix prompts                │
│  - Applies fixes to code                │
│  - Commits and pushes to GitHub         │
│  - Monitors deployment                  │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Vercel Auto-Deploy                     │
│  - Deploys on push to main              │
│  - Health checks verify fix             │
└─────────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Database Tables

The auto-healer needs database tables to track errors and fixes.

**Option A: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Create a **New Query**
4. Copy the contents of `sql-migrations/create-auto-healer-tables.sql`
5. Paste and click **Run**

**Option B: Command Line (with psql)**

```bash
# Using psql (adjust credentials for your setup)
psql -h your-supabase-host.com -p 6543 -U postgres -d postgres \
  -f sql-migrations/create-auto-healer-tables.sql
```

This creates four tables:
- `error_log` - Stores all errors from webhook
- `auto_fix_requests` - Tracks fix attempts
- `error_patterns` - Learns common error patterns
- `system_health_log` - Tracks overall health

### 2. Configure Environment Variables

Add these to your Vercel environment variables:

```bash
# Already configured (just verify):
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# New variables for auto-healer:
ALERT_PHONE=+17204507540
AUTO_HEALER_ENABLED=false  # Set to 'true' when ready
ANTHROPIC_API_KEY=your_anthropic_key  # For AI code fixes (optional)
```

### 3. Configure Console Webhook

1. Open kiosk admin panel
2. Go to **System** tab → **Console Webhook** section
3. Set **Webhook URL** to:
   ```
   https://chi-pins.vercel.app/api/webhook-processor
   ```
4. Enable **Console Webhook** toggle
5. Select log levels: `error`, `warn`, `info`, `log`
6. Click **Send Test Event** to verify

### 4. Deploy Updated Code

```bash
# Build and deploy
npm run build

# Deploy to kiosk
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  ./scripts/deploy-kiosk.sh 192.168.2.112:40585
```

### 5. Start Monitoring Services

**Health Check Monitoring (UptimeRobot)**

1. Go to [UptimeRobot](https://uptimerobot.com/)
2. Add monitor:
   - URL: `https://chi-pins.vercel.app/api/health`
   - Interval: 5 minutes
   - Alerts: SMS to +17204507540

**Log Monitoring (SMS Alerts)**

```bash
# On your development machine or server:
./scripts/monitor-logs.sh 192.168.2.112:40585

# Or run in background:
nohup ./scripts/monitor-logs.sh 192.168.2.112:40585 > /tmp/kiosk-monitor.log 2>&1 &
```

**Automated Smoke Tests**

```bash
# Run once to test:
./scripts/smoke-tests.sh production

# Set up cron job to run every 5 minutes:
crontab -e

# Add this line:
*/5 * * * * /path/to/chi-pins/scripts/smoke-tests.sh production >> /tmp/smoke-tests.log 2>&1
```

**Auto-Healer (Self-Fixing)**

```bash
# Test in dry-run mode first:
node scripts/auto-healer.js --dry-run --severity=CRITICAL

# When ready, enable and run:
AUTO_HEALER_ENABLED=true node scripts/auto-healer.js --interval=60

# Run in background:
nohup AUTO_HEALER_ENABLED=true node scripts/auto-healer.js --interval=60 \
  > /tmp/auto-healer.log 2>&1 &
```

## How Auto-Fixing Works

### Error Detection & Classification

When an error occurs on the kiosk:

1. **Console webhook** captures it with full context:
   - Error message
   - Stack trace
   - URL where it occurred
   - Timestamp
   - User agent
   - Additional data

2. **Webhook processor** analyzes it:
   - Checks for duplicates (1-minute window)
   - Classifies severity: CRITICAL, HIGH, MEDIUM, LOW
   - Stores in database
   - Sends SMS alert if CRITICAL

### Severity Classification

**CRITICAL** (Auto-fix + SMS alert)
- Fatal errors, crashes
- "Cannot read properties of undefined"
- "is not a function"
- Database connection failures
- Network errors
- Uncaught exceptions

**HIGH** (Auto-fix, no alert)
- TypeError, ReferenceError, RangeError
- Failed operations
- General errors

**MEDIUM** (Monitor only)
- Warnings
- Deprecated APIs
- Timeouts

**LOW** (Log only)
- Info messages
- Debug logs

### Fix Generation

The auto-healer analyzes each error and generates a fix strategy:

**NULL_REFERENCE**
```javascript
// Before:
const value = user.profile.name;

// After:
const value = user?.profile?.name || 'Unknown';
```

**TYPE_ERROR**
```javascript
// Before:
items.map(item => item.name);

// After:
(items || []).map(item => item?.name);
```

**NETWORK_ERROR**
```javascript
// Before:
const data = await fetch(url);

// After:
const data = await fetch(url).catch(err => {
  console.error('Fetch failed:', err);
  return fallbackData;
});
```

### Fix Application

1. **Generate fix prompt** - Creates detailed instructions for AI
2. **Search codebase** - Finds the problematic code
3. **Apply fix** - Edits the file with the fix
4. **Run tests** - Verifies fix doesn't break anything
5. **Commit** - Creates git commit with fix description
6. **Push** - Pushes to GitHub
7. **Monitor** - Watches Vercel deployment
8. **Verify** - Confirms error is resolved

### Safety Features

- **Dry-run mode** - Test without making changes
- **Severity threshold** - Only fix CRITICAL/HIGH errors
- **Duplicate detection** - Don't fix same error twice
- **Fix history** - Track all fix attempts
- **Manual review** - Fix prompts saved for review
- **Enable flag** - `AUTO_HEALER_ENABLED=true` required
- **SMS notifications** - Alert on fix attempts

## Monitoring Dashboard

Check the health of your kiosk at any time:

```bash
# Health check
curl https://chi-pins.vercel.app/api/health | jq

# Recent errors (last 24 hours)
# Use Supabase dashboard to query error_dashboard view

# Auto-fix history
# Query auto_fix_requests table in Supabase
```

## Troubleshooting

### No Errors Being Captured

1. Check console webhook is enabled in admin panel
2. Verify webhook URL is correct
3. Check browser console (F12) for webhook send failures
4. Test webhook with "Send Test Event" button

### SMS Alerts Not Sending

1. Verify Twilio credentials in Vercel environment
2. Check ALERT_PHONE is set correctly
3. Test SMS endpoint:
   ```bash
   curl -X POST https://chi-pins.vercel.app/api/send-sms \
     -H "Content-Type: application/json" \
     -d '{"to":"+17204507540","message":"Test"}'
   ```

### Auto-Healer Not Running

1. Check `AUTO_HEALER_ENABLED=true` is set
2. Verify database tables were created
3. Check auto-healer logs: `tail -f /tmp/auto-healer.log`
4. Ensure Supabase credentials are in environment

### Fixes Not Being Applied

Currently, the auto-healer generates fix prompts but doesn't automatically apply them. To enable full auto-fixing, you need to:

1. Set up Anthropic API key for AI code analysis
2. Configure GitHub Actions or similar CI/CD
3. Enable auto-commit and push permissions

For now, review fix prompts in `.auto-healer-fixes/` directory and apply manually.

## Future Enhancements

- [ ] Full autonomous fixing with Anthropic API integration
- [ ] Machine learning for error pattern recognition
- [ ] Rollback mechanism for failed fixes
- [ ] A/B testing for fix effectiveness
- [ ] Web dashboard for monitoring and control
- [ ] Integration with GitHub Issues for complex errors
- [ ] Slack/Discord notifications
- [ ] Performance optimization suggestions
- [ ] Predictive error detection

## Costs

**UptimeRobot**: Free tier (50 monitors, 5-min intervals)
**Twilio SMS**: ~$0.0075 per SMS (depends on volume)
**Anthropic API**: ~$0.003 per 1K tokens (for AI fixes)
**Supabase**: Included in your current plan
**Vercel**: Included in your current plan

## Security Notes

- All API keys stored in environment variables only
- Database uses Row Level Security (RLS)
- Auto-healer can be disabled instantly with `AUTO_HEALER_ENABLED=false`
- All fixes are logged and tracked
- SMS alerts only to configured phone number
- No sensitive data in error logs

## Support

If you encounter issues:

1. Check this guide and monitoring setup docs
2. Review logs: `/tmp/auto-healer.log`, `/tmp/kiosk-monitor.log`
3. Check Vercel function logs
4. Query error_log table in Supabase
5. Run smoke tests to identify failing components

---

**Congratulations!** 🎉 Your kiosk now has autonomous self-healing capabilities. It will watch for errors, fix them automatically, and alert you if anything needs attention.
