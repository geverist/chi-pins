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

  console.info('[ConsoleWebhook] ✅ Initialized - console events will be sent to webhook');
}

/**
 * Queue an event for batched sending
 */
function queueEvent(event) {
  eventQueue.push(event);

  // Send immediately if queue is full
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    sendBatch();
    return;
  }

  // Otherwise, schedule a batched send
  if (!sendTimeout) {
    sendTimeout = setTimeout(() => {
      sendBatch();
    }, BATCH_DELAY_MS);
  }
}

/**
 * Send batched events to webhook
 */
function sendBatch() {
  if (!webhookUrl || eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  if (sendTimeout) {
    clearTimeout(sendTimeout);
    sendTimeout = null;
  }

  // Send via fetch (fire and forget)
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'chi-pins-kiosk',
      tenantId: getTenantId(),
      events: batch,
      batchTimestamp: new Date().toISOString(),
    }),
  }).catch(err => {
    originalConsole.error('[ConsoleWebhook] Failed to send batch:', err);
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
 */
export function sendTestEvent() {
  if (!webhookUrl) {
    originalConsole.error('[ConsoleWebhook] No webhook URL configured');
    return false;
  }

  const testEvent = {
    level: 'info',
    message: '🧪 Test event from Chi-Pins Console Webhook',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    test: true,
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'chi-pins-kiosk',
      tenantId: getTenantId(),
      events: [testEvent],
      batchTimestamp: new Date().toISOString(),
      test: true,
    }),
  })
    .then(() => {
      originalConsole.info('[ConsoleWebhook] ✅ Test event sent successfully');
    })
    .catch(err => {
      originalConsole.error('[ConsoleWebhook] ❌ Test event failed:', err);
    });

  return true;
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
