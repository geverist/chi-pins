# Chi-Pins Native Android App

This guide explains how to build and deploy Chi-Pins as a native Android app using Capacitor.

## Prerequisites

- **Node.js** 18+ (already installed)
- **Android Studio** - Download from https://developer.android.com/studio
- **Java JDK** 17+ (usually included with Android Studio)

## Development Workflow

### Continue Developing in Browser
```bash
npm run dev
# Your normal React development workflow stays the same!
```

### Build and Sync to Android
```bash
npm run android:sync
# This builds your React app and syncs to Android
```

### Open in Android Studio
```bash
npm run android:open
# Opens the Android project in Android Studio
```

## Building the APK

### Option 1: Using Android Studio (Recommended for first build)

1. Open the project in Android Studio:
   ```bash
   npm run android:open
   ```

2. In Android Studio:
   - Wait for Gradle sync to complete
   - Click **Build > Build Bundle(s)/APK(s) > Build APK(s)**
   - Wait for build to complete
   - Click "locate" to find the APK

3. The APK will be at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option 2: Command Line Build

```bash
npm run android:build
```

This will create a release APK at:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

**Note:** For production, you'll need to sign the APK (see Signing section below).

## Installing on Kiosk Tablet

### Method 1: ADB over USB

1. Enable Developer Mode on tablet:
   - Settings > About Tablet
   - Tap "Build Number" 7 times
   - Enable "USB Debugging" in Developer Options

2. Connect tablet via USB and install:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 2: ADB over WiFi (No USB Cable)

1. Enable Developer Mode and USB Debugging on tablet (same as above)

2. Connect tablet to WiFi on same network as your computer

3. On tablet, find IP address:
   - Settings > About Tablet > Status > IP Address
   - Example: `192.168.1.202`

4. First time: Connect via USB and enable WiFi debugging:
   ```bash
   adb tcpip 5555
   ```

5. Disconnect USB cable, then connect over WiFi:
   ```bash
   adb connect 192.168.1.202:5555
   ```

6. Install APK:
   ```bash
   npm run android:install
   # Or manually:
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 3: Download from Local Server

1. Copy APK to web directory:
   ```bash
   cp android/app/build/outputs/apk/debug/app-debug.apk public/chi-pins.apk
   ```

2. Start local server:
   ```bash
   npm run start
   # Or use any HTTP server
   ```

3. On tablet browser, navigate to:
   ```
   http://YOUR_COMPUTER_IP:4173/chi-pins.apk
   ```

4. Download and install (you'll need to enable "Install from Unknown Sources")

### Method 4: Manual Transfer

1. Copy APK to USB drive or email to yourself
2. On tablet, download and tap APK file
3. Enable "Install from Unknown Sources" when prompted
4. Install the app

## Kiosk Mode Setup

After installing the APK:

1. **Grant Permissions**
   - Open Chi-Pins app
   - Grant all requested permissions (camera, microphone, location, storage)

2. **Set as Kiosk**
   - Use a kiosk launcher app (like "Kiosk Browser" or "Fully Kiosk Browser")
   - Or set Chi-Pins as default launcher
   - Or use Android's built-in kiosk mode (if supported)

3. **Enable Auto-Start**
   - Settings > Apps > Chi-Pins > Set as default for HOME
   - Or configure in your kiosk launcher app

## Performance Improvements

The native Android app provides several performance benefits over the web browser:

1. **Hardware Acceleration** - Full GPU access for map rendering
2. **Better Caching** - Native file system storage for map tiles
3. **No Browser Overhead** - Direct WebView without browser chrome
4. **Offline Support** - Service Worker works better in native context
5. **Native Permissions** - Direct access to camera, microphone, location

## Configuration

### App Settings
Edit `capacitor.config.ts` to change:
- App name
- Package ID
- Background color
- Debug settings

### Android Manifest
Edit `android/app/src/main/AndroidManifest.xml` to change:
- Permissions
- Screen orientation (currently set to landscape)
- Hardware acceleration settings

### App Icons
Replace icons in:
- `android/app/src/main/res/mipmap-*` folders
- Or use Capacitor's asset generator

## Signing the APK (Production)

For a production release, you need to sign the APK:

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore chi-pins.keystore -alias chi-pins -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/keystore.properties`:
   ```
   storePassword=YOUR_PASSWORD
   keyPassword=YOUR_PASSWORD
   keyAlias=chi-pins
   storeFile=../chi-pins.keystore
   ```

3. Build signed release:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. APK will be at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## Troubleshooting

### Gradle Build Fails
- Open Android Studio and let it sync Gradle
- Check that JDK 17+ is installed
- Update Gradle if prompted

### APK Won't Install
- Enable "Install from Unknown Sources" on tablet
- Check that package name doesn't conflict with existing app
- Try uninstalling old version first

### Black Screen on Launch
- Check browser console in Android Studio (View > Tool Windows > Logcat)
- Ensure `npm run build` completed successfully
- Try `npm run android:sync` again

### Map Tiles Not Loading
- Check internet connection on tablet
- Verify permissions granted (Network, Storage)
- Check service worker registration in Logcat

### Performance Still Slow
- Enable hardware acceleration in Android settings
- Close other apps running on tablet
- Check tablet hardware specs (may need more RAM)
- Consider reducing map tile detail level

## Scripts Reference

```bash
npm run dev                  # Develop in browser (normal workflow)
npm run build               # Build React app for production
npm run android:sync        # Build + sync to Android
npm run android:open        # Open in Android Studio
npm run android:build       # Build release APK via Gradle
npm run android:install     # Install APK via ADB
```

## Next Steps

1. **Build the APK** using Android Studio or command line
2. **Install on tablet** using one of the methods above
3. **Test all features** (games, voice, camera, etc.)
4. **Set up kiosk mode** for auto-start
5. **Configure permissions** for unattended operation

## Support

For issues with:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio/intro
- **This app**: Check logs in Android Studio Logcat
