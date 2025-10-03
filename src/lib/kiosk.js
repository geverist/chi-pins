// src/lib/kiosk.js
let wakeLock;

export async function enterFullscreen(el = document.documentElement) {
  if (!document.fullscreenElement && el?.requestFullscreen) {
    try {
      await el.requestFullscreen(); // must be in a user gesture on many browsers
    } catch (e) {
      // swallow; caller will decide whether to show a fallback UI
      console.warn('[kiosk] requestFullscreen failed:', e);
      throw e;
    }
  }
}

export async function ensureWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener?.('release', () => {
        wakeLock = null;
      });
    }
  } catch (e) {
    console.warn('[kiosk] Wake Lock not available:', e);
  }
}

export async function exitFullscreenAndWake() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch (e) {
    console.warn('[kiosk] exitFullscreen failed:', e);
  }
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) {
    console.warn('[kiosk] wake lock release failed:', e);
  }
}

export function onFullscreenChange(cb) {
  const handler = () => cb(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}
