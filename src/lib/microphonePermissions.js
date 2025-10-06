/**
 * Microphone permission utilities for Fully Kiosk Browser and web browsers
 */

export async function requestMicrophonePermission() {
  console.log('[Microphone] Requesting permission...');

  // Check if already granted
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      console.log('[Microphone] Current permission state:', permissionStatus.state);

      if (permissionStatus.state === 'granted') {
        console.log('[Microphone] Permission already granted');
        return true;
      }

      if (permissionStatus.state === 'denied') {
        console.warn('[Microphone] Permission denied by user');
        showPermissionInstructions();
        return false;
      }
    } catch (err) {
      console.log('[Microphone] Permission API not available, trying getUserMedia');
    }
  }

  // Try to get microphone access (this will trigger permission prompt)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Stop the stream immediately - we just wanted to request permission
    stream.getTracks().forEach(track => track.stop());

    console.log('[Microphone] Permission granted via getUserMedia');
    return true;
  } catch (err) {
    console.error('[Microphone] Permission denied:', err.name, err.message);

    if (err.name === 'NotAllowedError') {
      showPermissionInstructions();
    }

    return false;
  }
}

export function showPermissionInstructions() {
  const isFullyKiosk = /Fully/i.test(navigator.userAgent);

  if (isFullyKiosk) {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  MICROPHONE PERMISSION REQUIRED                        ║
╠════════════════════════════════════════════════════════╣
║  To use voice features in Fully Kiosk Browser:        ║
║                                                        ║
║  1. Open Fully Kiosk Settings                         ║
║  2. Go to "Web Content Settings"                      ║
║  3. Find "Website Permissions"                        ║
║  4. Enable "Microphone" permission                    ║
║  5. Reload the page                                   ║
║                                                        ║
║  Or in Android Settings:                              ║
║  1. Settings → Apps → Fully Kiosk Browser             ║
║  2. Permissions → Microphone                          ║
║  3. Set to "Allow"                                    ║
╚════════════════════════════════════════════════════════╝
    `);
  } else {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  MICROPHONE PERMISSION REQUIRED                        ║
╠════════════════════════════════════════════════════════╣
║  To use voice features:                                ║
║                                                        ║
║  1. Click the microphone icon in browser address bar  ║
║  2. Select "Allow" for microphone access              ║
║  3. Or check browser settings for site permissions    ║
╚════════════════════════════════════════════════════════╝
    `);
  }
}

export async function checkMicrophonePermission() {
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      return permissionStatus.state === 'granted';
    } catch (err) {
      console.log('[Microphone] Permission API not available');
    }
  }

  // Fallback: check if speech recognition is available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    return true; // Assume available, will fail gracefully if denied
  }

  return false;
}
