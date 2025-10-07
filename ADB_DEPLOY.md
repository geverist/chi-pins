# Direct APK Deployment via ADB

This allows you to push new APK versions directly to the kiosk without downloading manually.

## One-Time Setup on Kiosk

1. **Enable Developer Options:**
   - Open Settings
   - Go to "About tablet/phone"
   - Tap "Build number" 7 times
   - Go back to Settings, find "Developer options"

2. **Enable USB Debugging:**
   - In Developer options, enable "USB debugging"

3. **Enable Wireless Debugging (Android 11+):**
   - In Developer options, enable "Wireless debugging"
   - Tap "Wireless debugging" to see the IP and port
   - Note the IP address (should be 192.168.1.202)
   - Port is usually 5555

## Connect to Kiosk (First Time)

```bash
npm run android:connect
```

This will prompt you to allow the connection on the kiosk. Tap "Allow" on the popup.

## Deploy New APK (Every Update)

**Single command to build and deploy:**

```bash
npm run android:deploy
```

This will:
1. Build the React app
2. Sync with Capacitor
3. Build the APK
4. Install it directly to the kiosk via WiFi

The kiosk will show a notification when the new version is installed.

## Individual Commands

If you need more control:

```bash
# Just build the APK
npm run android:build

# Just install (if APK already built)
npm run android:install

# Reconnect to kiosk
npm run android:connect
```

## Troubleshooting

### "device unauthorized"
- Check kiosk for USB debugging prompt and tap "Allow"
- Tap "Always allow from this computer" for future convenience

### "device offline"
- Run `npm run android:connect` again
- Make sure kiosk is on same WiFi network

### "no devices/emulators found"
- Enable Wireless debugging on kiosk
- Run `npm run android:connect`
- Check IP address matches (192.168.1.202)

### Check connected devices
```bash
/opt/homebrew/share/android-commandlinetools/platform-tools/adb devices
```

### Disconnect
```bash
/opt/homebrew/share/android-commandlinetools/platform-tools/adb disconnect
```
