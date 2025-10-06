# Fully Kiosk Browser - Step-by-Step Setup Guide

## Step 1: Access Fully Kiosk Settings

You need to unlock the settings. Try these methods in order:

### Method 1: Touch Pattern (Most Common)
1. Draw a pattern on the screen
2. **Try these common patterns:**
   - Start at bottom-left corner → drag to top-right corner
   - Draw an "L" shape
   - Tap corners: bottom-left → top-right → bottom-right → top-left

### Method 2: Rapid Taps
1. Tap the screen **5 times rapidly** in the center
2. A password prompt should appear
3. Default passwords to try: (blank), `1234`, `0000`

### Method 3: Volume Buttons
1. Press **Volume Up 3 times** quickly
2. Then press **Volume Down 2 times**
3. Settings should open

### Method 4: Settings Icon
1. Look for a small settings gear icon (usually hidden)
2. Often appears in corners or after specific tap sequence
3. Try swiping from edges of screen

### If All Else Fails:
1. Connect tablet to computer via USB
2. Enable USB debugging (if accessible)
3. Or, uninstall and reinstall Fully Kiosk Browser app

---

## Step 2: Enable Remote Administration

Once you're in Fully Kiosk settings:

1. **Scroll down** to find **"Remote Administration"** section
2. **Toggle ON**: "Enable Remote Administration"
3. **Set a password** (write this down!):
   - Tap on "Password"
   - Enter a strong password
   - Example: `MyKiosk2024!`
4. **Note the port**: Default is `2323` (leave as-is)
5. **Find your IP address** (shown in this section):
   - Will be something like `192.168.1.150` or `10.0.0.25`
   - **Write this down!**

**Screenshot of where to find it:**
```
Settings
  └── Remote Administration
        ├── [✓] Enable Remote Administration
        ├── Password: ••••••••••
        ├── Port: 2323
        └── IP Address: 192.168.1.150
```

---

## Step 3: Configure Your Admin Script

On your computer, edit the script:

```bash
cd /Users/gileseverist/Dev/kiosk/chi-pins
nano fully-kiosk-admin.sh
```

Update these two lines at the top:
```bash
TABLET_IP="192.168.1.150"  # Your tablet's IP from Step 2
PASSWORD="MyKiosk2024!"     # Your password from Step 2
```

Save and exit (Ctrl+X, then Y, then Enter)

---

## Step 4: Test the Connection

Run the admin script:

```bash
cd /Users/gileseverist/Dev/kiosk/chi-pins
./fully-kiosk-admin.sh
```

From the menu, select:
- **Option 10**: Test Connection

You should see:
```
✓ Tablet is reachable
✓ Fully Kiosk Remote Admin is working
```

If it works, **you're all set!** 🎉

---

## Step 5: Common Remote Admin Commands

### Quick Commands from Terminal:

```bash
# Store your config
TABLET_IP="192.168.1.150"
PASSWORD="MyKiosk2024!"
BASE_URL="http://$TABLET_IP:2323"

# Reload page
curl "$BASE_URL/?cmd=reload&password=$PASSWORD"

# Clear cache and reload (after deploying updates)
curl "$BASE_URL/?cmd=clearCache&password=$PASSWORD"
curl "$BASE_URL/?cmd=reload&password=$PASSWORD"

# Take screenshot
curl "$BASE_URL/?cmd=getScreenshot&password=$PASSWORD" > screenshot.jpg

# Get device info (battery, IP, etc.)
curl "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD&type=json"

# Restart Fully Kiosk app
curl "$BASE_URL/?cmd=restartApp&password=$PASSWORD"

# Reboot entire device
curl "$BASE_URL/?cmd=rebootDevice&password=$PASSWORD"
```

### Or Use the Interactive Script:

```bash
./fully-kiosk-admin.sh
```

Then select from the menu:
1. Reload Page
2. Clear Cache & Reload
3. Take Screenshot
4. Restart App
5. Reboot Device
6. Get Device Info
7. Screen On/Off
9. Open Web Admin in Browser

---

## Step 6: Open Web Admin Interface

The easiest way to manage the kiosk:

**From the script:**
```bash
./fully-kiosk-admin.sh
# Choose option 9
```

**Or manually:**
1. Open any web browser on your computer
2. Go to: `http://YOUR-TABLET-IP:2323`
   - Example: `http://192.168.1.150:2323`
3. Enter your password
4. You now have full control! 🎮

**What you can do in web admin:**
- See live screenshot of kiosk
- Reload page with one click
- Clear cache
- Restart app
- Change settings
- View logs
- Upload files

---

## Troubleshooting

### "Connection refused" or "Cannot reach tablet"

**Check 1: Are you on the same WiFi network?**
- Computer and tablet must be on same network
- Check WiFi settings on both devices

**Check 2: Is the IP address correct?**
```bash
# On your computer, try to ping the tablet
ping 192.168.1.150

# Should show:
# 64 bytes from 192.168.1.150: icmp_seq=0 ttl=64 time=2.3 ms
```

**Check 3: Is Remote Admin enabled?**
- Go back into Fully Kiosk settings
- Check "Remote Administration" is ON
- Verify the port is 2323

**Check 4: Firewall blocking?**
- Some tablets have firewall
- Temporarily disable to test

### "Wrong password" or "401 Unauthorized"

- Double-check the password you set in Step 2
- Try resetting the password in Fully Kiosk settings

### IP Address keeps changing

**Set a static IP on your router:**
1. Log into your router admin panel
2. Find DHCP settings
3. Reserve IP for tablet's MAC address
4. Tablet will always get same IP

**Or use mDNS/Bonjour (if supported):**
```bash
# Instead of IP, try:
http://android-tablet.local:2323
```

---

## Step 7: Set Up Auto-Refresh Schedule

In Fully Kiosk settings:

1. Go to **"Web Content Settings"**
2. Find **"Reload Page Periodically"**
3. Enable and set schedule:
   - Example: Every day at 3:00 AM
   - This will auto-reload after updates

Or via remote command:
```bash
# Set reload schedule (reload at 3 AM daily)
curl "$BASE_URL/?cmd=setStringSetting&key=timeReloadPage&value=03:00&password=$PASSWORD"
```

---

## Step 8: Update Chi-Pins Remotely

When you deploy a new version:

```bash
# Method 1: Use the admin script
./fully-kiosk-admin.sh
# Select option 2 (Clear Cache & Reload)

# Method 2: Use curl
curl "http://$TABLET_IP:2323/?cmd=clearCache&password=$PASSWORD"
sleep 2
curl "http://$TABLET_IP:2323/?cmd=reload&password=$PASSWORD"

# Method 3: Touch all four corners on the tablet
# (If you're standing in front of it)
```

---

## Bonus: Monitor Kiosk Health

Create a monitoring script that runs every 5 minutes:

```bash
# Save as monitor-kiosk.sh
#!/bin/bash
TABLET_IP="192.168.1.150"
PASSWORD="MyKiosk2024!"
BASE_URL="http://$TABLET_IP:2323"

# Check if online
if curl -s "$BASE_URL/?cmd=deviceInfo&password=$PASSWORD" > /dev/null; then
    echo "$(date): ✓ Kiosk is online"
else
    echo "$(date): ✗ Kiosk is OFFLINE - sending alert!"
    # Add notification here (email, SMS, Slack, etc.)
fi
```

Add to crontab:
```bash
crontab -e
# Add this line:
*/5 * * * * /path/to/monitor-kiosk.sh >> /var/log/kiosk-monitor.log 2>&1
```

---

## Quick Reference Card

Print this and keep near your kiosk:

```
╔═══════════════════════════════════════════╗
║   Fully Kiosk Remote Admin Cheat Sheet   ║
╠═══════════════════════════════════════════╣
║ Tablet IP: 192.168.1.___                  ║
║ Password:  ________________                ║
║ Web Admin: http://tablet-ip:2323          ║
╠═══════════════════════════════════════════╣
║ QUICK COMMANDS                            ║
╠═══════════════════════════════════════════╣
║ Reload:                                   ║
║ curl "http://IP:2323/?cmd=reload&         ║
║       password=PASS"                      ║
╠═══════════════════════════════════════════╣
║ Clear Cache & Reload:                     ║
║ curl "http://IP:2323/?cmd=clearCache&     ║
║       password=PASS"                      ║
║ curl "http://IP:2323/?cmd=reload&         ║
║       password=PASS"                      ║
╠═══════════════════════════════════════════╣
║ TOUCH SEQUENCES (on tablet)               ║
╠═══════════════════════════════════════════╣
║ Refresh: Touch all 4 corners              ║
║ Admin: Touch all 4 quadrants              ║
║ Kiosk Mode: Double-tap opposite corners   ║
╚═══════════════════════════════════════════╝
```

---

## Next Steps

1. ✅ Complete Steps 1-4 to enable remote admin
2. ✅ Test the connection
3. ✅ Bookmark the web admin URL in your browser
4. ✅ Set up auto-reload schedule
5. ✅ Create monitoring script (optional)

Need help? Check the troubleshooting section above.
