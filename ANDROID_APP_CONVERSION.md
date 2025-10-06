# Converting Chi-Pins to Android App with Capacitor

## Why Capacitor?

- Keep your existing React/Vite codebase 100% intact
- Add native Android features progressively
- Better performance than browser
- Native kiosk mode support
- Local caching and offline support
- Deploy to Google Play Store

## Installation Steps

### 1. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

When prompted:
- App name: `Chi-Pins Kiosk`
- App ID: `com.chicagomikes.kipins` (or your preference)
- Web asset directory: `dist`

### 2. Add Android Platform

```bash
npm install @capacitor/android
npx cap add android
```

### 3. Update package.json Scripts

```json
{
  "scripts": {
    "build": "vite build",
    "sync": "npm run build && npx cap sync",
    "android": "npm run sync && npx cap open android"
  }
}
```

### 4. Configure Capacitor

Edit `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chicagomikes.kipins',
  appName: 'Chi-Pins Kiosk',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.chicagomikes.local',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#3b82f6",
      showSpinner: false
    }
  }
};

export default config;
```

### 5. Install Essential Plugins

```bash
# Core kiosk functionality
npm install @capacitor/app
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/filesystem
npm install @capacitor/camera
npm install @capacitor/geolocation

# Speech/Voice
npm install @capacitor-community/speech-recognition

# Network status for offline detection
npm install @capacitor/network

# Local storage/caching
npm install @capacitor/preferences
```

### 6. Add Kiosk Mode Plugin

```bash
npm install capacitor-plugin-kiosk-mode
```

Or use this in your Android MainActivity:

```java
// android/app/src/main/java/com/chicagomikes/kipins/MainActivity.java
import android.view.WindowManager;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Full screen kiosk mode
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

    // Hide navigation bar
    View decorView = getWindow().getDecorView();
    int uiOptions = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                  | View.SYSTEM_UI_FLAG_FULLSCREEN
                  | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
    decorView.setSystemUiVisibility(uiOptions);
  }
}
```

### 7. Update AndroidManifest.xml

Add kiosk permissions and settings:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest>
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />

  <application
    android:usesCleartextTraffic="true"
    android:hardwareAccelerated="true">

    <activity
      android:name=".MainActivity"
      android:launchMode="singleTask"
      android:screenOrientation="landscape"
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
      android:theme="@style/AppTheme.NoActionBarLaunch">

      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
        <category android:name="android.intent.category.HOME" />
        <category android:name="android.intent.category.DEFAULT" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

## Build and Deploy

### Development Build

```bash
npm run build
npx cap sync
npx cap open android
```

This opens Android Studio where you can:
- Run on connected device
- Debug with Chrome DevTools
- Build APK for testing

### Production APK

In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select APK
3. Create or use existing keystore
4. Build release APK

Or via command line:
```bash
cd android
./gradlew assembleRelease
```

APK will be in: `android/app/build/outputs/apk/release/app-release.apk`

## Performance Improvements

### 1. Add Offline Support

Create `src/service-worker.js`:

```javascript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Cache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache map tiles
registerRoute(
  /https:\/\/.*\.tile\.openstreetmap\.org/,
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      {
        cacheWillUpdate: async ({ request, response }) => {
          return response.status === 200 ? response : null;
        },
      },
    ],
  })
);

// Cache API responses
registerRoute(
  /\/api\//,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
  })
);
```

### 2. Enable Hardware Acceleration

Update your Android gradle.properties:
```properties
android.enableJetifier=true
android.useAndroidX=true
android.defaults.buildfeatures.buildconfig=true
```

### 3. Optimize Map Performance

In your MapShell component, detect if running in native app:

```javascript
import { Capacitor } from '@capacitor/core';

const isNativeApp = Capacitor.isNativePlatform();

// Use faster rendering on native
const mapOptions = {
  preferCanvas: isNativeApp, // Use canvas renderer (faster on native)
  zoomAnimation: isNativeApp,
  markerZoomAnimation: isNativeApp,
};
```

## Testing

### Enable USB Debugging

1. On Android tablet: Settings → About → Tap "Build Number" 7 times
2. Settings → Developer Options → Enable USB Debugging
3. Connect via USB to your computer

### Run on Device

```bash
npm run android
```

Or in Android Studio: Run → Run 'app'

### Remote Debugging

Chrome DevTools:
1. Chrome → `chrome://inspect`
2. Select your device
3. Inspect WebView

## Deployment Options

### Option 1: Direct APK Install (Recommended for Kiosk)
- Share APK file directly
- Install on kiosk tablets
- No app store needed
- Easier updates for internal deployment

### Option 2: Google Play Store (Internal Track)
- Upload to Play Console
- Use internal testing track
- Limited distribution
- Automatic updates

### Option 3: MDM (Mobile Device Management)
- Use MDM solution (Meraki, AirWatch, etc.)
- Push app updates remotely
- Lock down kiosk devices
- Best for multiple locations

## Estimated Timeline

- **Initial setup**: 1 day
- **Kiosk mode configuration**: 1 day
- **Testing and optimization**: 2 days
- **Production build and deployment**: 1 day

**Total**: ~5 days for full conversion

## Next Steps

Would you like me to:
1. Start the Capacitor conversion now?
2. Create a performance comparison (web vs native)?
3. Set up the kiosk mode configuration?
