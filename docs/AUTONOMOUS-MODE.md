# 🤖 Fully Autonomous Self-Healing Mode

Your kiosk can now **detect, fix, and deploy** bug fixes **completely autonomously** with zero human intervention.

## How It Works

```
1. Error occurs on kiosk
   ↓
2. Console webhook captures error + stack trace
   ↓
3. Webhook processor classifies as CRITICAL
   ↓
4. Stores in database
   ↓
5. Autonomous healer polls database (every 60s)
   ↓
6. Claude AI analyzes error and source code
   ↓
7. Claude generates fix with 80%+ confidence
   ↓
8. Fix applied to source code
   ↓
9. Git commit + push to GitHub
   ↓
10. Self-hosted runner auto-deploys to kiosk
   ↓
11. Verifies error resolved
   ↓
12. SMS: "🤖 Auto-fixed and deployed!"
```

**Total time:** 3-5 minutes from error to fix deployed

## Setup

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create account or sign in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-...`)

### 2. Add to Environment

Add to your `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
AUTO_FIX_ENABLED=true
AUTO_MERGE=true  # or false to create PRs for review
```

### 3. Run Autonomous Healer

**Test mode first (won't actually fix anything):**

```bash
DRY_RUN=true node scripts/autonomous-healer.js
```

**Full autonomous mode:**

```bash
AUTO_FIX_ENABLED=true node scripts/autonomous-healer.js
```

**Run as background service:**

```bash
# Using PM2
npm install -g pm2
pm2 start scripts/autonomous-healer.js --name autonomous-healer

# Using nohup
nohup node scripts/autonomous-healer.js > /tmp/autonomous-healer.log 2>&1 &
```

## Safety Features

### 1. Confidence Threshold

Only applies fixes with **80%+ confidence**. Low-confidence fixes create an SMS alert for manual review.

### 2. Rate Limiting

Maximum **5 fixes per hour** to prevent runaway automation.

### 3. Code Review Option

Set `AUTO_MERGE=false` to create Pull Requests instead of auto-merging:

```bash
AUTO_MERGE=false node scripts/autonomous-healer.js
```

This creates PRs for you to review before deployment.

### 4. Severity Filtering

Only fixes **CRITICAL** errors. HIGH/MEDIUM/LOW errors require manual intervention.

### 5. SMS Notifications

You receive an SMS for:
- ✅ Every successful auto-fix
- ⚠️ Low-confidence fixes (skipped)
- ❌ Failed fixes
- 📝 PRs created for review

### 6. Rollback Capability

Every fix is a separate git commit. To rollback:

```bash
git revert HEAD
git push
# Kiosk auto-deploys the rollback
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_FIX_ENABLED` | `false` | Enable autonomous fixing |
| `AUTO_MERGE` | `false` | Auto-merge or create PR |
| `DRY_RUN` | `false` | Test mode (no changes) |
| `ANTHROPIC_API_KEY` | - | Required for AI fixes |
| `POLL_INTERVAL` | `60` | Seconds between checks |
| `ALERT_PHONE` | `+17204507540` | SMS notifications |

### Example Configurations

**Conservative (PR review):**
```bash
AUTO_FIX_ENABLED=true
AUTO_MERGE=false
```

**Fully autonomous:**
```bash
AUTO_FIX_ENABLED=true
AUTO_MERGE=true
```

**Test mode:**
```bash
DRY_RUN=true
```

## What Gets Fixed Automatically

### ✅ Can Fix

- **Null reference errors**: `Cannot read properties of undefined`
- **Type errors**: `x is not a function`
- **Missing null checks**: Add defensive programming
- **Undefined variable references**
- **Simple syntax errors**
- **Missing imports**
- **Array/object access errors**

### ⚠️ May Fix (with lower confidence)

- **Logic errors**: Incorrect conditions
- **State management issues**: Complex React state bugs
- **Async/Promise errors**: Timing issues
- **API integration errors**: Network/fetch issues

### ❌ Won't Fix (too complex)

- **Architecture changes**: Requires human design decisions
- **Security vulnerabilities**: Requires security review
- **Performance issues**: Requires profiling and analysis
- **Business logic errors**: Requires domain knowledge

## Example Fix Flow

### Error Occurs

```javascript
// Kiosk throws error:
TypeError: Cannot read properties of undefined (reading 'name')
  at UserProfile.render (src/components/UserProfile.jsx:42:15)
```

### Claude Analyzes

```
Analysis: The code accesses user.profile.name without checking
if user or profile exists first.

Fix Strategy: Add optional chaining to safely access nested properties.

Confidence: 95%
```

### Fix Applied

```javascript
// Before:
const displayName = user.profile.name;

// After:
const displayName = user?.profile?.name || 'Unknown';
```

### Auto-Deployed

```
✅ Committed to main
✅ Pushed to GitHub
✅ Self-hosted runner deploys to kiosk (2 min)
✅ Error resolved
📱 SMS: "🤖 Auto-fixed and deployed!"
```

## Monitoring

### Check Status

```bash
# If running with PM2
pm2 status
pm2 logs autonomous-healer

# If running with nohup
tail -f /tmp/autonomous-healer.log
```

### View Fix History

**GitHub:**
https://github.com/geverist/chi-pins/commits/main

Look for commits starting with `🤖 Auto-fix:`

**Database:**
```sql
SELECT * FROM error_log
WHERE auto_fix_success = true
ORDER BY auto_fix_timestamp DESC;
```

### SMS Notifications

You'll receive texts for:
```
🤖 Auto-fixed and deployed!

Error: Cannot read properties of undefined

Fix: Added optional chaining

Deployment starting...
```

## Cost

**Anthropic API:**
- ~$0.003 per 1K tokens
- Typical fix: ~2K tokens = $0.006
- 100 fixes/month ≈ $0.60

**GitHub Actions:**
- Free tier: 2,000 minutes/month
- Each deployment: 3 minutes
- ~666 free deployments/month

**Twilio SMS:**
- $0.0075 per SMS
- 2 SMS per fix (trigger + confirm)
- 100 fixes/month ≈ $1.50

**Total:** ~$2.10/month for 100 autonomous fixes

## Troubleshooting

### "AI analysis failed"

**Problem:** Anthropic API key invalid or rate limited

**Solution:**
1. Verify API key: https://console.anthropic.com/
2. Check rate limits
3. Ensure ANTHROPIC_API_KEY is set

### "Failed to apply fix"

**Problem:** old_code didn't match exactly (file changed)

**Solution:**
- This is expected - the healer will try again on next poll
- Source file might have been edited since error occurred

### "Confidence too low"

**Problem:** Claude isn't confident enough to fix (< 80%)

**Solution:**
- You'll get an SMS to review manually
- This is a safety feature - complex errors need human review

### Fixes Not Deploying

**Problem:** Self-hosted runner not picking up changes

**Solution:**
1. Check runner is running: `ps aux | grep Runner.Listener`
2. Restart runner: `cd ~/actions-runner && ./run.sh`
3. Check GitHub Actions: https://github.com/geverist/chi-pins/actions

## Disabling Autonomous Mode

**Temporary (this session):**
Press Ctrl+C in the terminal running the healer

**Permanent:**
```bash
# If using PM2
pm2 stop autonomous-healer
pm2 delete autonomous-healer

# If using nohup
pkill -f autonomous-healer
```

Remove from `.env`:
```bash
# Comment out or set to false
AUTO_FIX_ENABLED=false
```

## Advanced: Webhook Integration

For real-time fixes (no polling), trigger on webhook:

```javascript
// In api/webhook-processor.js
if (severity === 'CRITICAL' && process.env.AUTO_FIX_ENABLED === 'true') {
  // Trigger autonomous-healer immediately
  exec('node scripts/autonomous-healer.js --once');
}
```

---

## Summary

**You now have a kiosk that heals itself.**

- Detects errors automatically
- Fixes code with AI
- Deploys fixes within minutes
- Notifies you via SMS
- Runs 24/7 unattended

**The future is autonomous.** 🤖🚀
