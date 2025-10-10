# Kiosk Monitoring Setup Guide

Complete guide for setting up automated monitoring and alerting for the Chi-Pins kiosk system.

## 🏥 Health Check Endpoint

### What It Does
Comprehensive health check that tests database connectivity, admin settings, Twilio, environment variables, and memory usage.

### Setup
The endpoint is automatically deployed at:
```
https://chi-pins.vercel.app/api/health
```

### Monitoring with UptimeRobot

1. Go to [UptimeRobot](https://uptimerobot.com/)
2. Create a new monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Chi-Pins Kiosk Health
   - **URL**: `https://chi-pins.vercel.app/api/health`
   - **Monitoring Interval**: 5 minutes
3. Add alert contacts (email, SMS, Discord, Slack, etc.)
4. The monitor will alert if:
   - Response status is not 200 (means unhealthy)
   - Endpoint doesn't respond within timeout
   - Any downtime detected

### Response Format
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T12:00:00.000Z",
  "responseTime": 234,
  "checks": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful",
      "responseTime": 123
    },
    "adminSettings": {
      "status": "healthy",
      "message": "Admin settings accessible",
      "hasConfig": true
    },
    "twilio": {
      "status": "healthy",
      "message": "Twilio credentials valid"
    },
    "environment": {
      "status": "healthy",
      "message": "All required environment variables set"
    },
    "memory": {
      "status": "healthy",
      "message": "Heap usage: 45.2%",
      "details": {
        "rss": 156,
        "heapTotal": 100,
        "heapUsed": 45,
        "external": 8
      }
    }
  }
}
```

---

## 📱 SMS Log Monitoring

### What It Does
Continuously monitors kiosk logs via ADB and sends SMS alerts for critical errors like crashes, network failures, and runtime errors.

### Setup

1. **Ensure ADB connection** to kiosk device:
   ```bash
   adb connect 192.168.2.112:40585
   adb devices
   ```

2. **Make script executable**:
   ```bash
   chmod +x scripts/monitor-logs.sh
   ```

3. **Run the monitor**:
   ```bash
   ./scripts/monitor-logs.sh 192.168.2.112:40585
   ```

4. **Run in background** (recommended):
   ```bash
   nohup ./scripts/monitor-logs.sh 192.168.2.112:40585 > /tmp/kiosk-monitor.log 2>&1 &
   ```

### Configuration

Edit `scripts/monitor-logs.sh` to customize:

```bash
ALERT_PHONE="+17204507540"          # Phone number for SMS alerts
CHECK_INTERVAL=5                     # Check logs every N seconds
ALERT_COOLDOWN=300                   # Don't spam (5 minute cooldown per error type)
```

### Error Patterns Monitored

The script watches for these critical errors:
- `FATAL ERROR` - App crashes
- `Cannot read properties of undefined` - JavaScript errors
- `Failed to fetch` - Network issues
- `NetworkError` - Connection failures
- `Database connection failed` - Database issues
- `Proximity detection failed` - Camera/proximity errors
- `Camera initialization failed` - Camera errors
- `Uncaught` - Unhandled exceptions
- `TypeError` - Type errors

### Alert Example
```
🚨 KIOSK ALERT

Error detected: FATAL ERROR: Uncaught TypeError: Cannot read properties of undefined

Time: 2025-10-10 14:23:15

Check logs immediately!
```

---

## 💬 Discord Webhook Integration

### What It Does
Forwards console logs to Discord in real-time with color-coded embeds for different log levels.

### Setup

#### 1. Create Discord Webhook

1. Open Discord and go to your monitoring channel
2. Click channel settings (gear icon)
3. Go to **Integrations** → **Webhooks**
4. Click **New Webhook**
5. Name it "Chi-Pins Kiosk"
6. Copy the **Webhook URL**

#### 2. Configure Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Your Discord webhook URL from step 1
   - **Environments**: Production, Preview, Development
5. Click **Save**

#### 3. Deploy Changes
```bash
# Commit and push to trigger deployment
git add .
git commit -m "Add Discord webhook monitoring"
git push
```

#### 4. Configure Kiosk Console Webhook

1. Open kiosk admin panel
2. Go to **System** tab → **Console Webhook** section
3. Set **Webhook URL** to:
   ```
   https://chi-pins.vercel.app/api/discord-webhook
   ```
4. Enable **Console Webhook**
5. Select log levels to capture (recommend: `log`, `error`, `warn`, `info`)
6. Click **Send Test Event** to verify

### Discord Message Format

Messages appear as color-coded embeds:
- 🔴 **ERROR** - Red embeds for errors
- 🟡 **WARN** - Orange embeds for warnings
- 🔵 **INFO** - Blue embeds for info
- 🟢 **LOG** - Green embeds for logs

Each embed includes:
- Timestamp
- Log message
- Stack trace (if error)
- Additional data (if present)
- Source and tenant ID in footer

---

## 🧪 Automated Smoke Tests

### What It Does
Runs automated health checks and basic functionality tests every 5 minutes to catch issues before users do.

### Setup

**Coming soon** - Automated smoke test script with:
- Health endpoint verification
- Database connectivity test
- API endpoint response checks
- Performance benchmarks
- Automatic alerts on failures

---

## 🚨 Alert Contacts

All monitoring systems send alerts to:
- **SMS**: +17204507540
- **Discord**: Your configured monitoring channel

---

## 🔧 Troubleshooting

### SMS Alerts Not Working

1. Check Twilio credentials in `.env`:
   ```bash
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

2. Test SMS endpoint manually:
   ```bash
   curl -X POST https://chi-pins.vercel.app/api/send-sms \
     -H "Content-Type: application/json" \
     -d '{"to":"+17204507540","message":"Test alert"}'
   ```

3. Check Vercel logs:
   ```bash
   vercel logs
   ```

### Discord Webhook Not Working

1. Verify `DISCORD_WEBHOOK_URL` is set in Vercel
2. Test Discord endpoint manually:
   ```bash
   curl -X POST https://chi-pins.vercel.app/api/discord-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "source": "test",
       "tenantId": "chicago-mikes",
       "events": [{
         "level": "info",
         "message": "Test message",
         "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
       }]
     }'
   ```

3. Check that the Discord webhook URL is valid:
   - Should start with `https://discord.com/api/webhooks/`
   - Test it directly with curl

### Log Monitor Not Capturing Errors

1. Check ADB connection:
   ```bash
   adb devices
   # Should show: 192.168.2.112:40585	device
   ```

2. Verify logs are flowing:
   ```bash
   adb -s 192.168.2.112:40585 logcat chromium:E *:S -t 10
   ```

3. Check monitor script is running:
   ```bash
   ps aux | grep monitor-logs
   ```

---

## 📊 Monitoring Dashboard

Recommended setup for comprehensive monitoring:

1. **UptimeRobot** - Monitor `/api/health` endpoint every 5 minutes
2. **Discord Channel** - Real-time log streaming for errors and warnings
3. **SMS Alerts** - Critical errors from log monitor script
4. **Vercel Analytics** - Built-in performance and error tracking

---

## 🔄 Maintenance

### Daily
- Check Discord channel for any errors or warnings
- Review SMS alerts (if any)

### Weekly
- Review UptimeRobot dashboard for uptime trends
- Check Vercel logs for any patterns

### Monthly
- Review and update error patterns in `monitor-logs.sh`
- Verify all monitoring services are active
- Test alert system with manual test events

---

## 📝 Notes

- All monitoring is designed to be low-maintenance and automated
- SMS alerts have 5-minute cooldown to prevent spam
- Discord embeds limited to 10 events per batch to stay within rate limits
- Health check endpoint caches responses for 60 seconds to avoid overwhelming database
