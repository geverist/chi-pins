# Fully Kiosk Browser - Remote Admin Guide

## Yes, Fully Kiosk has Remote Admin!

Fully Kiosk Browser includes a powerful remote administration web interface that lets you control the tablet from any browser.

## Enabling Remote Admin

### Step 1: Access Fully Kiosk Settings

**Default unlock methods:**
- **Pattern unlock**: Draw a specific pattern on screen
  - Default pattern: Start bottom-left, go to top-right
  - Or try: Tap corners in sequence (bottom-left → top-right → bottom-right → top-left)

- **Password unlock**:
  - Default password: Often blank or "1234"
  - Try tapping the screen 5 times rapidly to bring up password prompt

- **Volume button trick**:
  - Press Volume Up 3 times quickly
  - Then Volume Down 2 times
  - (Pattern may vary by configuration)

- **If locked out**:
  - Connect tablet to computer via USB
  - Enable USB debugging (if possible)
  - Or factory reset Fully Kiosk app data

### Step 2: Enable Remote Administration

Once in settings:

1. Scroll down to **"Remote Administration"**
2. Toggle **"Enable Remote Administration"** → ON
3. Note the settings:
   - **Port**: Default is 2323
   - **Password**: Set a password (required for security)
   - **Remote Admin URL**: Shows as `http://TABLET-IP:2323`

### Step 3: Find Your Tablet's IP Address

Still in Fully Kiosk settings:

1. Go to **"Device Info"** or **"Status"**
2. Look for **"IP Address"** - will be something like:
   - `192.168.1.xxx` (home/office network)
   - `10.0.0.xxx` (some networks)
3. Write this down

Or check your router's DHCP client list for the device.

## Accessing Remote Admin

### From Any Computer/Phone on Same Network

1. Open any web browser
2. Go to: `http://TABLET-IP:2323`
   - Example: `http://192.168.1.150:2323`
3. Enter the password you set
4. You're in! 🎉

## Remote Admin Features

### Dashboard
- **Screenshot**: See current screen in real-time
- **Reload**: Refresh the current page
- **Clear Cache**: Clear browser cache
- **Restart App**: Restart Fully Kiosk Browser
- **Reboot Device**: Reboot entire tablet

### Settings
- Change any Fully Kiosk setting remotely
- Update the URL
- Adjust screen brightness
- Configure screensaver
- Set reload schedules

### Commands
Send commands via REST API:

```bash
# Reload page
curl "http://TABLET-IP:2323/?cmd=loadUrl&url=https://chicagomikes.us&password=YOUR_PASSWORD"

# Clear cache and reload
curl "http://TABLET-IP:2323/?cmd=clearCache&password=YOUR_PASSWORD"
curl "http://TABLET-IP:2323/?cmd=reload&password=YOUR_PASSWORD"

# Reboot device
curl "http://TABLET-IP:2323/?cmd=rebootDevice&password=YOUR_PASSWORD"

# Get device info
curl "http://TABLET-IP:2323/?cmd=deviceInfo&password=YOUR_PASSWORD&type=json"

# Set brightness (0-255)
curl "http://TABLET-IP:2323/?cmd=setStringSetting&key=screenBrightness&value=200&password=YOUR_PASSWORD"

# Take screenshot
curl "http://TABLET-IP:2323/?cmd=getScreenshot&password=YOUR_PASSWORD" > screenshot.jpg

# Start/stop screensaver
curl "http://TABLET-IP:2323/?cmd=startScreensaver&password=YOUR_PASSWORD"
curl "http://TABLET-IP:2323/?cmd=stopScreensaver&password=YOUR_PASSWORD"
```

### Logs
- View real-time logs
- See JavaScript console errors
- Monitor crashes

### File Manager
- Browse tablet files
- Upload files
- Download files
- Useful for uploading new APKs or content

## Remote Admin via Fully Remote Admin App

### Download the companion app (easier than web interface)

**Fully Remote Admin** (separate app):
1. Install on your phone from Play Store:
   - Search "Fully Remote Admin"
   - By Fully Kiosk Browser team
2. Add your kiosk tablets:
   - Tap "+"
   - Enter IP address and password
   - Name the device
3. Control multiple kiosks from one app!

## Fully Kiosk Plus (Paid Features)

For $15 one-time per device, you get:

**Advanced Remote Features:**
- Remote camera access
- Motion detection triggers
- Advanced REST API
- Custom JavaScript injection
- No ads in settings

**Kiosk Features:**
- App launcher control
- Advanced lockdown
- Custom boot actions
- Scheduled tasks

**Worth it for serious kiosk deployments!**

Purchase: Fully Kiosk Settings → "Purchase Plus License"

## Securing Remote Admin

### 1. Set Strong Password
Settings → Remote Administration → Password
- Use 12+ character password
- Include numbers and symbols

### 2. Change Default Port
Settings → Remote Administration → Port
- Change from 2323 to something random
- Example: 8472

### 3. Restrict Access
If your router supports it:
- Create VLAN for kiosk tablets
- Only allow specific IPs to access port
- Use firewall rules

### 4. HTTPS (Plus only)
Fully Kiosk Plus can enable HTTPS:
- Settings → Remote Administration → "Use HTTPS"
- Upload SSL certificate

## Common Remote Admin Commands

### For Your Chi-Pins Kiosk

```bash
# Store these in variables
KIOSK_IP="192.168.1.150"  # Replace with your tablet's IP
KIOSK_PORT="2323"
PASSWORD="your_password"
BASE_URL="http://$KIOSK_IP:$KIOSK_PORT"

# Quick reload Chi-Pins
curl "$BASE_URL/?cmd=reload&password=$PASSWORD"

# Clear cache and force reload (after deploy)
curl "$BASE_URL/?cmd=clearCache&password=$PASSWORD"
curl "$BASE_URL/?cmd=reload&password=$PASSWORD"

# Check if tablet is online
curl "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json"

# Screen on/off (power saving)
curl "$BASE_URL/?cmd=screenOn&password=$PASSWORD"
curl "$BASE_URL/?cmd=screenOff&password=$PASSWORD"

# Enable/disable screensaver
curl "$BASE_URL/?cmd=enableScreensaver&password=$PASSWORD"
curl "$BASE_URL/?cmd=disableScreensaver&password=$PASSWORD"

# Play sound (test audio)
curl "$BASE_URL/?cmd=playSound&url=https://www.soundjay.com/button/beep-07.mp3&password=$PASSWORD"

# Take screenshot (troubleshooting)
curl "$BASE_URL/?cmd=getScreenshot&password=$PASSWORD" > kiosk-screenshot.jpg

# Restart Fully Kiosk app (if frozen)
curl "$BASE_URL/?cmd=restartApp&password=$PASSWORD"

# Reboot tablet (nuclear option)
curl "$BASE_URL/?cmd=rebootDevice&password=$PASSWORD"
```

## Automated Monitoring Script

Create `monitor-kiosk.sh`:

```bash
#!/bin/bash
KIOSK_IP="192.168.1.150"
PASSWORD="your_password"
BASE_URL="http://$KIOSK_IP:2323"

# Check if kiosk is responding
if curl -s "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json" > /dev/null; then
    echo "✅ Kiosk is online"
else
    echo "❌ Kiosk is offline or unreachable"
    # Send alert email/SMS
fi

# Check battery level (if tablet)
BATTERY=$(curl -s "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json" | jq -r '.batteryLevel')
echo "🔋 Battery: $BATTERY%"

if [ "$BATTERY" -lt 20 ]; then
    echo "⚠️  Low battery!"
fi

# Auto-reload daily at 3 AM
HOUR=$(date +%H)
if [ "$HOUR" = "03" ]; then
    echo "🔄 Daily reload"
    curl -s "$BASE_URL/?cmd=clearCache&password=$PASSWORD"
    curl -s "$BASE_URL/?cmd=reload&password=$PASSWORD"
fi
```

Run via cron:
```bash
# Check every 5 minutes
*/5 * * * * /path/to/monitor-kiosk.sh
```

## Troubleshooting Remote Admin

### Can't access web interface

1. **Check IP address is correct**
   - May have changed if using DHCP
   - Set static IP in router

2. **Check port is correct**
   - Default: 2323
   - May have been changed in settings

3. **Check firewall**
   - Tablet may be blocking incoming connections
   - Try disabling tablet firewall temporarily

4. **Check same network**
   - Must be on same WiFi network
   - Or VPN into network

5. **Check Remote Admin is enabled**
   - May have been disabled
   - Need physical access to re-enable

### Password not working

1. Try blank password (if not set)
2. Reset password:
   - Physical access to tablet
   - Settings → Remote Administration → Reset Password
3. Factory reset Fully Kiosk app data (last resort)

## Integration with Chi-Pins

You can trigger remote commands from your web app:

```javascript
// Add to your admin panel
async function reloadKiosk() {
  const kioskIP = 'your-kiosk-ip';
  const password = 'your-password';

  try {
    const response = await fetch(
      `http://${kioskIP}:2323/?cmd=reload&password=${password}`
    );

    if (response.ok) {
      alert('Kiosk reloaded successfully!');
    }
  } catch (error) {
    console.error('Failed to reload kiosk:', error);
  }
}
```

## Next Steps

1. **Access settings now**: Try the unlock methods above
2. **Enable remote admin**: Follow Step 2
3. **Test from browser**: Access http://TABLET-IP:2323
4. **Set up monitoring**: Use the monitoring script
5. **Consider Fully Plus**: Worth it for serious deployments

Need help accessing the settings? Let me know what happens when you try the unlock methods!
