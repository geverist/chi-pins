import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chicagomikes.chipins',
  appName: 'Chi-Pins',
  webDir: 'dist',
  server: {
    // Allow localhost for development
    androidScheme: 'https',
    // Clear text traffic for local dev
    allowNavigation: ['*']
  },
  android: {
    // Enable hardware acceleration for better map performance
    backgroundColor: '#101114',
    // Allow mixed content for map tiles
    allowMixedContent: true,
    // Use WebView chromium for better performance
    webContentsDebuggingEnabled: true
  },
  plugins: {
    CapacitorUpdater: {
      // Auto update configuration
      autoUpdate: true,
      // Server URL for updates (you can host on your own server or use Capgo cloud)
      updateUrl: 'https://api.capgo.app/updates',
      // Check for updates on app startup
      autoUpdateCheckOnStart: true,
      // Reset to built-in version if update fails
      resetWhenUpdate: false,
      // Notification for updates
      directUpdate: true,
    }
  }
};

export default config;
