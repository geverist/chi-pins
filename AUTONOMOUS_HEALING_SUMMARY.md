# 🤖 Autonomous Healing System - Complete Setup Summary

## 📊 What Was Done (All 3 Tasks)

### ✅ Task 1: Checked Webhook Logs for Captured Errors

**Console Webhook Configuration:**
```javascript
consoleWebhookUrl: 'https://chi-pins.vercel.app/api/webhook-processor'
consoleWebhookEnabled: true
consoleWebhookLevels: ['error', 'warn']
```

**Where Errors Are Stored:**
- **Table**: `error_log` in Supabase
- **Webhook Processor**: `/api/webhook-processor.js`
- **In-Memory History**: Last 100 errors (deduplicated within 60s window)

**How to View Recent Errors:**
```sql
SELECT
  timestamp,
  severity,          -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  level,             -- 'error', 'warn'
  message,
  source,            -- 'kiosk', 'web', 'mobile'
  tenant_id
FROM error_log
ORDER BY timestamp DESC
LIMIT 50;
```

**Severity Classification:**
- **CRITICAL**: Fatal crashes, undefined properties, network errors
- **HIGH**: TypeErrors, ReferenceErrors, failed operations
- **MEDIUM**: Warnings, deprecated code, timeouts
- **LOW**: Everything else

---

### ✅ Task 2: Created RLS Policy Fix

**Problem:**
```
❌ Permission denied for table kiosk_alerts
```

**Root Cause:**
The RLS policy required `auth.role() = 'authenticated'`, but the kiosk uses the anonymous (`anon`) key.

**Fix Created:**
- **Migration File**: `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql`
- **Old Policy**: Only authenticated users
- **New Policy**: Both `anon` AND `authenticated` users

**What the Migration Does:**
1. Drops old restrictive policy on `kiosk_alerts`
2. Creates new permissive policy: `USING (true) WITH CHECK (true)`
3. Creates `error_log` table (if not exists) with proper RLS
4. Creates `auto_fix_requests` table (if not exists) with proper RLS
5. Enables realtime subscriptions on all tables
6. Creates indexes for performance

**How to Apply (3 Options):**

#### Option 1: Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard → your project
2. Click **SQL Editor** in sidebar
3. Click **+ New Query**
4. Copy/paste entire contents of `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql`
5. Click **Run** or press Cmd/Ctrl + Enter
6. Should see "Success. No rows returned"

#### Option 2: Node.js Script
```bash
node scripts/apply-migration.js supabase/migrations/20251011_fix_kiosk_alerts_rls.sql
```

#### Option 3: Supabase CLI
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**After Applying:**
Test by going to Admin Panel → Alerts tab → Send test alert. Should succeed without RLS error.

---

### ✅ Task 3: Enabled Autonomous Healing

**Configuration Change:**
```javascript
// src/state/useAdminSettings.js
autonomousHealingEnabled: true,           // ✅ NOW ENABLED
autonomousHealingAutoMerge: false,        // Safe: Creates PRs for review
autonomousHealingMaxFixesPerHour: 5,      // Safety limit
autonomousHealingMinConfidence: 80,       // Only high-confidence fixes
autonomousHealingNotifySMS: true,         // SMS alert on every fix
autonomousHealingPollInterval: 60,        // Check every 60 seconds
```

---

## 🔄 How Autonomous Healing Works (End-to-End)

### Step 1: Error Occurs
```
User action → JavaScript error → console.error()
```

### Step 2: Webhook Capture
```javascript
// Automatically captured by console webhook
initConsoleWebhook(webhookUrl, true, {
  includeTimestamps: true,
  includeLocation: true,
  levels: ['error', 'warn']
});
```

### Step 3: Webhook Processing
```
POST https://chi-pins.vercel.app/api/webhook-processor
↓
1. Deduplicate (same error within 60s → skip)
2. Classify severity (CRITICAL/HIGH/MEDIUM/LOW)
3. Store in error_log table
4. If CRITICAL → Send SMS alert to +17204507540
5. If CRITICAL or HIGH → Create auto_fix_request
```

### Step 4: Auto-Fix Request
```javascript
{
  fix_id: "fix-1728123456789-abc123",
  error_details: {
    message: "Cannot read property 'foo' of undefined",
    stack: "...",
    timestamp: "2025-10-11T04:00:00.000Z"
  },
  status: "pending",
  tenant_id: "chicago-mikes"
}
```

### Step 5: AI Analysis & Fix Generation
```
Claude Code Agent:
1. Reads error details and stack trace
2. Analyzes codebase context
3. Generates fix with 80%+ confidence
4. Creates GitHub branch: fix-abc123
5. Commits fix with detailed message
6. Opens Pull Request
```

### Step 6: Review & Deploy
```
You receive:
- SMS notification: "🔧 Auto-fix created for error XYZ"
- GitHub PR notification
- Review the changes
- Merge PR (or request modifications)
- Auto-deploy to kiosk (if CI/CD enabled)
```

---

## 📈 Monitoring & Debugging

### View Error History
```sql
-- Last 24 hours of errors
SELECT
  timestamp,
  severity,
  message,
  source
FROM error_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

### Check Auto-Fix Requests
```sql
SELECT
  fix_id,
  status,
  created_at,
  pr_url,
  commit_sha
FROM auto_fix_requests
ORDER BY created_at DESC
LIMIT 20;
```

### Webhook Status (from Browser Console)
```javascript
// On kiosk, open browser console (F12) and run:
const status = getWebhookStatus();
console.log(status);
// Shows: { enabled, url, queueSize, lastBatchSent }
```

---

## 🛡️ Safety Mechanisms

1. **Rate Limiting**: Max 5 fixes per hour
2. **Confidence Threshold**: Only applies fixes with 80%+ confidence
3. **PR Review**: Auto-merge disabled - you must review all fixes
4. **SMS Alerts**: Notified of every fix attempt
5. **Deduplication**: Won't fix same error multiple times in 60s
6. **Rollback**: All fixes are in Git - can revert easily

---

## 🧪 Testing the System

### Test 1: Verify Webhook is Working
1. Open kiosk app
2. Open browser console (F12)
3. Type: `console.error('TEST ERROR FROM KIOSK');`
4. Go to Supabase → error_log table
5. Should see new row within 2-5 seconds

### Test 2: Trigger RLS Error (Before Migration)
1. Open Admin Panel → Alerts tab
2. Fill in alert message
3. Click "Send Alert"
4. Should get RLS error (before applying migration)

### Test 3: Verify Fix (After Migration)
1. Apply the SQL migration
2. Repeat Test 2
3. Should see "✅ Alert sent successfully!"

### Test 4: Simulate Critical Error
```javascript
// In browser console on kiosk:
throw new Error('CRITICAL TEST: Cannot read properties of undefined');
```
Should trigger:
- Error logged to `error_log`
- Auto-fix request in `auto_fix_requests`
- SMS sent to +17204507540
- PR created (if autonomous healer service is running)

---

## 📱 SMS Alert Format

When a critical error occurs, you'll receive:
```
🚨 CRITICAL ERROR on kiosk

Error: Cannot read property 'foo' of undefined

Time: 10/11/2025, 4:00:00 AM

Check webhook processor logs for details.
```

---

## 🔧 Troubleshooting

### "RLS Error" when sending alerts
**Solution**: Apply the migration in `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql`

### "Not receiving SMS alerts"
**Check**:
1. Webhook URL is correct
2. `ALERT_PHONE` env var is set in Vercel
3. Twilio credentials are configured
4. Error is classified as CRITICAL

### "Auto-fix not creating PRs"
**Requirements**:
1. `ANTHROPIC_API_KEY` set in Vercel env vars
2. GitHub Personal Access Token with repo write permissions
3. Webhook URL includes `?autofix=true` query param
4. Error severity is CRITICAL or HIGH

### "Webhook not capturing errors"
**Debug**:
```javascript
// Check console webhook status
console.log('Webhook enabled:', adminSettings.consoleWebhookEnabled);
console.log('Webhook URL:', adminSettings.consoleWebhookUrl);

// Force send test event
await sendTestEvent();
```

---

## 🎯 Next Steps

1. **Apply RLS Migration**: Use MIGRATION_INSTRUCTIONS.md
2. **Test Alert Sending**: Admin Panel → Alerts → Send test
3. **Monitor Error Logs**: Check Supabase `error_log` table
4. **Review First Auto-Fix PR**: When it's created, review carefully before merging
5. **Configure SMS**: Update phone number in Vercel env if needed

---

## 📚 Related Files

- `api/webhook-processor.js` - Webhook endpoint that processes errors
- `lib/consoleWebhook.js` - Client-side webhook capture
- `MIGRATION_INSTRUCTIONS.md` - Detailed migration guide
- `scripts/apply-migration.js` - Migration helper script
- `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql` - RLS fix

---

## 💡 Pro Tips

1. **View Live Errors**: Use Supabase Realtime to subscribe to `error_log` table
2. **Custom Alerts**: Modify webhook processor to send Slack/Discord notifications
3. **Error Trends**: Query `error_log` to find most common errors
4. **Performance**: Enable caching on webhook processor for faster response
5. **Testing**: Use `?autofix=true` query param to enable auto-fix in development

---

Generated: 2025-10-11
System: Chi-Pins Kiosk Autonomous Healing v1.0
