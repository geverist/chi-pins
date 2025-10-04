// src/lib/logger.js
// Centralized logging utility with environment-based controls

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Set log level based on environment
const currentLogLevel = isProduction ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  error(...args) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(`[${this.context}]`, ...args);
    }
  }

  warn(...args) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(`[${this.context}]`, ...args);
    }
  }

  info(...args) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.info(`[${this.context}]`, ...args);
    }
  }

  debug(...args) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(`[${this.context}]`, ...args);
    }
  }

  // Convenience method for component lifecycle events
  lifecycle(event, data = {}) {
    this.debug(`${event}:`, data);
  }

  // Convenience method for API calls
  api(method, endpoint, data = {}) {
    this.debug(`API ${method} ${endpoint}:`, data);
  }
}

// Factory function to create loggers with context
export function createLogger(context) {
  return new Logger(context);
}

// Default logger
export const logger = new Logger();

export default logger;
