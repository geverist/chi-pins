// src/utils/remoteLogger.js
// Utility to send console logs to server for remote debugging

class RemoteLogger {
  constructor() {
    this.logs = [];
    this.sessionId = this.generateSessionId();
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    this.setupInterceptors();
    this.startAutoFlush();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setupInterceptors() {
    // Intercept console.log
    const originalLog = console.log;
    console.log = (...args) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };

    // Intercept console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };

    // Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };
  }

  addLog(level, args) {
    const logEntry = {
      level,
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' '),
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Auto-flush if batch size reached
    if (this.logs.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = [];

    try {
      await fetch('/api/debug-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      // Silently fail - don't want to break the app
      console.error('Failed to send logs to server:', error);
    }
  }

  startAutoFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

// Only enable in production or when explicitly enabled
let logger = null;

export function initRemoteLogger() {
  if (!logger && (import.meta.env.PROD || window.location.search.includes('debug=true'))) {
    logger = new RemoteLogger();
    console.log('[RemoteLogger] Initialized - logs will be sent to server');
  }
}

export function getRemoteLogger() {
  return logger;
}
