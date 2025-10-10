# 📱 Two-Way SMS Control System

Control your kiosk system via text message! Send commands and receive instant responses.

## Setup in Twilio

### 1. Configure Incoming SMS Webhook

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your kiosk phone number (+17207022122)
4. Scroll to **Messaging Configuration**
5. Under "A MESSAGE COMES IN":
   - Set webhook URL to: `https://chi-pins.vercel.app/api/sms-webhook`
   - Method: **HTTP POST**
6. Click **Save**

That's it! Now you can text your kiosk number and it will respond.

## Available Commands

### System Status
```
status
```
Get 24-hour overview: error count, critical errors, auto-fixes

**Example Response:**
```
📊 System Status (24h)

🐛 Errors: 3 total
🔴 Critical: 1
🔧 Auto-fixes: 2

Send "health" for detailed check
Send "errors" for recent errors
```

### Health Check
```
health
```
Run comprehensive health check on all systems

**Example Response:**
```
✅ System Healthy

Database: ✅
Settings: ✅
Memory: Heap usage: 42.3%
Response: 234ms
```

### Recent Errors
```
errors
errors 1h
errors 24h
errors 7d
```
Get recent errors with optional time range (default: 1 hour)

**Example Response:**
```
🐛 Recent Errors (1h)

1. [2:34 PM] CRITICAL: Cannot read properties of undefined...
2. [2:15 PM] HIGH: TypeError: x.map is not a function...

Send "fix" to auto-fix last error
Send "details" for more info
```

### Recent Logs
```
logs
logs 20
logs 50
```
Get recent log entries (default: 10)

**Example Response:**
```
📝 Recent Logs (10)

🔴 [2:34 PM] FATAL ERROR: App crashed
🟡 [2:30 PM] Warning: Slow network detected
🔵 [2:25 PM] User placed pin successfully
```

### Auto-Fix Error
```
fix
```
Trigger auto-fix for the most recent critical error

**Example Response:**
```
🔧 Auto-fix triggered

Error: Cannot read properties of undefined...
Fix ID: fix-1728573892-manual

The auto-healer will process this shortly.
```

### Deployment Info
```
deploy
```
Get current deployment information

**Example Response:**
```
🚀 Deployment Info

Version: 0.1.0
Environment: production
Status: healthy
Response Time: 156ms

Last deployed: 10/10/2025, 2:30 PM
```

### Error Details
```
details
info
```
Get detailed information about the last error

**Example Response:**
```
🔍 Error Details

Message: Cannot read properties of undefined
Severity: CRITICAL
Level: error
Time: 10/10/2025, 2:34 PM
Source: chi-pins-kiosk

Stack: at Component.render...

Send "fix" to auto-fix
Send "ignore" to skip
```

### Approve/Reject Actions
```
yes
approve

no
reject
```
Approve or reject pending actions (like auto-fixes)

### Ignore Error
```
ignore
```
Mark the last error as ignored (won't be auto-fixed)

**Example Response:**
```
✅ Last error ignored

The error will not be auto-fixed.
```

### Help
```
help
```
Get list of available commands

## Example Conversations

### Scenario 1: Error Alert & Fix
```
🤖: 🚨 CRITICAL ERROR

Error: Cannot read properties of undefined

Send "fix" to auto-fix
Send "details" for more info

You: details

🤖: 🔍 Error Details

Message: Cannot read properties of undefined...
[full details]

You: fix

🤖: 🔧 Auto-fix triggered

Fix ID: fix-1728573892-manual
The auto-healer will process this shortly.
```

### Scenario 2: System Check
```
You: status

🤖: 📊 System Status (24h)

🐛 Errors: 0 total
🔴 Critical: 0
🔧 Auto-fixes: 0

Send "health" for detailed check

You: health

🤖: ✅ System Healthy

Database: ✅
Settings: ✅
Memory: Heap usage: 38.2%
Response: 178ms
```

### Scenario 3: Review Recent Issues
```
You: errors 24h

🤖: 🐛 Recent Errors (24h)

1. [2:34 PM] CRITICAL: Cannot read properties...
2. [1:15 PM] HIGH: TypeError: x.map is not...
3. [12:05 PM] MEDIUM: Warning: Slow query

You: logs 5

🤖: 📝 Recent Logs (5)

🔴 [2:34 PM] FATAL ERROR: App crashed
🟡 [2:30 PM] Warning: Network latency high
🔵 [2:25 PM] User placed pin successfully
🟢 [2:20 PM] Database sync complete
🔵 [2:15 PM] Health check passed
```

## Security

- **Phone Number Verification**: Only authorized phone number (+17204507540) can send commands
- **TwiML Responses**: Uses Twilio's secure TwiML format
- **Environment Variables**: All credentials stored in Vercel
- **No Sensitive Data**: Responses never include API keys or passwords
- **Rate Limiting**: Twilio handles rate limiting on their side

## Tips

- Commands are case-insensitive: `STATUS`, `status`, and `Status` all work
- You can abbreviate time ranges: `1h`, `24h`, `7d`
- Multiple commands in sequence work great
- Responses are limited to 1600 characters (SMS limit)
- Commands execute instantly (usually < 1 second)

## Troubleshooting

### Not Receiving Responses

1. Check Twilio webhook is configured correctly
2. Verify phone number matches `ALERT_PHONE` in Vercel env vars
3. Check Vercel function logs for errors
4. Test webhook URL manually:
   ```bash
   curl -X POST https://chi-pins.vercel.app/api/sms-webhook \
     -d "From=+17204507540&Body=status"
   ```

### "Unauthorized" Response

The phone number you're texting from doesn't match `ALERT_PHONE` environment variable. Update in Vercel settings.

### Commands Not Working

- Ensure message contains only the command (no extra text)
- Commands are matched exactly, check spelling
- Send "help" to see available commands
- Check Vercel logs for errors

## Future Enhancements

- [ ] Natural language processing (send any question)
- [ ] Photo uploads (send screenshots)
- [ ] Voice commands via Twilio Voice
- [ ] Multi-user support with role-based permissions
- [ ] Command history and undo
- [ ] Scheduled commands (remind me in 1 hour)
- [ ] Integration with Slack/Discord for team visibility

## Cost

**Twilio SMS**:
- Incoming: ~$0.0075 per SMS
- Outgoing: ~$0.0075 per SMS
- Total per conversation: ~$0.015 - $0.03

This is extremely cost-effective compared to the value of instant system control and monitoring.

---

**You now have a complete conversational interface to your kiosk system!** 🎉

Text your kiosk number and start controlling the system from anywhere.
