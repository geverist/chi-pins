// src/lib/consoleWebhook.js
/**
 * Console Webhook - Send console events to a remote webhook for monitoring
 *
 * Intercepts console.log, console.error, console.warn, console.info
 * and sends them to a configured webhook URL for remote monitoring.
 *
 * Useful for monitoring kiosk activity from a distance.
 */

let webhookUrl = null;
let webhookEnabled = false;
let originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

// Queue for batching events
let eventQueue = [];
let sendTimeout = null;
const BATCH_DELAY_MS = 2000; // Send batch every 2 seconds
const MAX_BATCH_SIZE = 50; // Max events per batch

/**
 * Initialize console webhook monitoring
 * @param {string} url - Webhook URL to send events to
 * @param {boolean} enabled - Whether to enable webhook
 * @param {Object} options - Configuration options
 */
export function initConsoleWebhook(url, enabled = true, options = {}) {
  webhookUrl = url;
  webhookEnabled = enabled && !!url;

  const {
    includeTimestamps = true,
    includeLocation = true,
    maxMessageLength = 1000,
    levels = ['log', 'error', 'warn', 'info'],
  } = options;

  if (!webhookEnabled) {
    console.info('[ConsoleWebhook] Disabled or no URL configured');
    return;
  }

  console.info('[ConsoleWebhook] Initializing with URL:', webhookUrl);

  // Intercept console methods
  levels.forEach(level => {
    console[level] = function(...args) {
      // Call original console method
      originalConsole[level].apply(console, args);

      // Send to webhook
      if (webhookEnabled && webhookUrl) {
        try {
          const message = args.map(arg => {
            if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg);
              } catch (e) {
                return String(arg);
              }
            }
            return String(arg);
          }).join(' ');

          const event = {
            level,
            message: message.slice(0, maxMessageLength),
            ...(includeTimestamps && { timestamp: new Date().toISOString() }),
            ...(includeLocation && {
              userAgent: navigator.userAgent,
              url: window.location.href,
            }),
          };

          queueEvent(event);
        } catch (err) {
          originalConsole.error('[ConsoleWebhook] Error formatting message:', err);
        }
      }
    };
  });

  // Capture global runtime errors (window.onerror)
  if (typeof window !== 'undefined') {
    originalConsole.log('[ConsoleWebhook] 🎣 Setting up window.onerror listener');
    window.addEventListener('error', (event) => {
      if (webhookEnabled && webhookUrl) {
        try {
          const { message, filename, lineno, colno, error } = event;
          const stack = error?.stack || 'No stack trace available';

          const errorEvent = {
            level: 'error',
            message: message || 'Unknown error',
            stack: stack.slice(0, maxMessageLength * 2), // Allow longer stack traces
            location: `${filename}:${lineno}:${colno}`,
            ...(includeTimestamps && { timestamp: new Date().toISOString() }),
            ...(includeLocation && {
              userAgent: navigator.userAgent,
              url: window.location.href,
            }),
          };

          originalConsole.error('[ConsoleWebhook] 🚨 Runtime error captured via window.onerror:', message);
          queueEvent(errorEvent);
        } catch (err) {
          originalConsole.error('[ConsoleWebhook] Error capturing runtime error:', err);
        }
      }
    });

    // Capture unhandled promise rejections
    originalConsole.log('[ConsoleWebhook] 🎣 Setting up unhandledrejection listener');
    window.addEventListener('unhandledrejection', (event) => {
      if (webhookEnabled && webhookUrl) {
        try {
          const message = event.reason?.message || String(event.reason) || 'Unhandled promise rejection';
          const stack = event.reason?.stack || 'No stack trace available';

          const errorEvent = {
            level: 'error',
            message: `Unhandled Promise Rejection: ${message}`,
            stack: stack.slice(0, maxMessageLength * 2),
            ...(includeTimestamps && { timestamp: new Date().toISOString() }),
            ...(includeLocation && {
              userAgent: navigator.userAgent,
              url: window.location.href,
            }),
          };

          originalConsole.error('[ConsoleWebhook] 🚨 Unhandled rejection captured:', message);
          queueEvent(errorEvent);
        } catch (err) {
          originalConsole.error('[ConsoleWebhook] Error capturing unhandled rejection:', err);
        }
      }
    });
  }

  console.info('[ConsoleWebhook] ✅ Initialized - console events and runtime errors will be sent to webhook');
}

/**
 * Queue an event for batched sending
 */
function queueEvent(event) {
  eventQueue.push(event);
  originalConsole.log(`[ConsoleWebhook] 📥 Event queued (${event.level}): ${event.message?.substring(0, 80)}... | Queue size: ${eventQueue.length}`);

  // Send immediately if queue is full
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    originalConsole.log(`[ConsoleWebhook] 🚀 Queue full (${eventQueue.length}), sending batch immediately`);
    sendBatch();
    return;
  }

  // Otherwise, schedule a batched send
  if (!sendTimeout) {
    originalConsole.log(`[ConsoleWebhook] ⏰ Scheduling batch send in ${BATCH_DELAY_MS}ms`);
    sendTimeout = setTimeout(() => {
      sendBatch();
    }, BATCH_DELAY_MS);
  }
}

/**
 * Send batched events to webhook
 */
function sendBatch() {
  if (!webhookUrl || eventQueue.length === 0) {
    originalConsole.log('[ConsoleWebhook] ⏭️  Batch send skipped (no URL or empty queue)');
    return;
  }

  const batch = [...eventQueue];
  eventQueue = [];

  if (sendTimeout) {
    clearTimeout(sendTimeout);
    sendTimeout = null;
  }

  const payload = {
    source: 'chi-pins-kiosk',
    tenantId: getTenantId(),
    events: batch,
    batchTimestamp: new Date().toISOString(),
  };

  originalConsole.log(`[ConsoleWebhook] 📤 Sending batch of ${batch.length} events to ${webhookUrl}`);
  originalConsole.log(`[ConsoleWebhook] 📦 Batch payload:`, payload);

  // Send via fetch (fire and forget)
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(response => {
      if (response.ok) {
        originalConsole.log(`[ConsoleWebhook] ✅ Batch sent successfully (${response.status})`);
      } else {
        originalConsole.error(`[ConsoleWebhook] ❌ Batch failed with status: ${response.status}`);
      }
    })
    .catch(err => {
      originalConsole.error('[ConsoleWebhook] ❌ Failed to send batch:', err);
    });
}

/**
 * Get tenant ID from localStorage or default
 */
function getTenantId() {
  try {
    const settings = localStorage.getItem('admin_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.tenantId || 'chicago-mikes';
    }
  } catch {}
  return 'chicago-mikes';
}

/**
 * Disable console webhook
 */
export function disableConsoleWebhook() {
  webhookEnabled = false;

  // Restore original console methods
  Object.keys(originalConsole).forEach(level => {
    console[level] = originalConsole[level];
  });

  console.info('[ConsoleWebhook] Disabled');
}

/**
 * Update webhook URL
 */
export function updateWebhookUrl(url) {
  webhookUrl = url;
  webhookEnabled = !!url;
  console.info('[ConsoleWebhook] URL updated:', url);
}

/**
 * Send a test event to verify webhook is working
 * @returns {Promise<boolean>} Promise that resolves to true if successful
 */
export async function sendTestEvent() {
  if (!webhookUrl) {
    originalConsole.error('[ConsoleWebhook] No webhook URL configured');
    return false;
  }

  originalConsole.log('[ConsoleWebhook] Sending test event to:', webhookUrl);

  const testEvent = {
    level: 'info',
    message: '🧪 Test event from Chi-Pins Console Webhook',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    test: true,
  };

  const payload = {
    source: 'chi-pins-kiosk',
    tenantId: getTenantId(),
    events: [testEvent],
    batchTimestamp: new Date().toISOString(),
    test: true,
  };

  originalConsole.log('[ConsoleWebhook] Sending payload:', payload);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      mode: 'cors', // Explicitly set CORS mode
    });

    originalConsole.log('[ConsoleWebhook] Response status:', response.status);
    originalConsole.log('[ConsoleWebhook] Response ok:', response.ok);

    if (response.ok) {
      originalConsole.info('[ConsoleWebhook] ✅ Test event sent successfully');
      return true;
    } else {
      originalConsole.error('[ConsoleWebhook] ❌ Test event failed with status:', response.status);
      return false;
    }
  } catch (err) {
    originalConsole.error('[ConsoleWebhook] ❌ Test event failed:', err);
    originalConsole.error('[ConsoleWebhook] Error details:', err.message, err.stack);
    return false;
  }
}

/**
 * Get current webhook status
 */
export function getWebhookStatus() {
  return {
    enabled: webhookEnabled,
    url: webhookUrl,
    queueSize: eventQueue.length,
  };
}
