// lib/immersiveMode.js
// Enable Android immersive mode to hide navigation/status bars

import { Capacitor } from '@capacitor/core';

/**
 * Enable immersive mode on Android to hide system UI bars
 * This maximizes screen space for the kiosk
 */
export async function enableImmersiveMode() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    console.log('[ImmersiveMode] Not on Android, skipping');
    return;
  }

  try {
    // Try to use native Capacitor Plugin API for AndroidFullScreen if available
    if (window.plugins && window.plugins.fullscreen) {
      await window.plugins.fullscreen.immersiveMode();
      console.log('[ImmersiveMode] Enabled successfully via plugin');
    } else {
      // Fallback: Use native JavaScript method
      enableImmersiveModeFallback();
    }
  } catch (error) {
    console.warn('[ImmersiveMode] Plugin not available, using fallback:', error);
    enableImmersiveModeFallback();
  }
}

/**
 * Fallback method using native Android WebView JavaScript interface
 */
function enableImmersiveModeFallback() {
  if (typeof window !== 'undefined' && window.AndroidFullScreen) {
    try {
      window.AndroidFullScreen.immersiveMode();
      console.log('[ImmersiveMode] Fallback enabled');
    } catch (error) {
      console.warn('[ImmersiveMode] Fallback failed:', error);
    }
  }

  // Additional fallback: CSS viewport height fix for navigation bar
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
      /* Fix for Android navigation bar */
      html, body {
        height: 100vh;
        height: 100svh; /* Small viewport height - excludes nav bar */
        overflow: hidden;
      }

      /* Ensure map container fills screen */
      #root {
        height: 100vh;
        height: 100svh;
      }
    `;
    document.head.appendChild(style);
    console.log('[ImmersiveMode] CSS fallback applied');
  }
}

/**
 * Re-enable immersive mode after user interaction
 * Android exits immersive mode when user swipes from edge
 */
export function maintainImmersiveMode() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  // Re-enable immersive mode when user taps (after Android exits it)
  let timeout;
  const reEnable = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      enableImmersiveMode();
    }, 500); // Debounce to avoid excessive calls
  };

  window.addEventListener('resize', reEnable);
  window.addEventListener('focus', reEnable);

  // Re-enable every 5 seconds as a safety net
  setInterval(enableImmersiveMode, 5000);

  console.log('[ImmersiveMode] Auto-maintain enabled');
}
