// src/lib/demoMode.js
/**
 * Demo Mode Management
 *
 * Provides complete isolation between demo and production environments.
 * Demo mode is read-only and uses separate database to prevent any
 * impact on the live restaurant kiosk.
 */

export const isDemoMode = () => {
  return import.meta.env.VITE_DEMO_MODE === 'true' ||
         window.location.hostname.includes('demo');
};

export const getEnvironment = () => {
  return import.meta.env.VITE_ENVIRONMENT || 'production';
};

export const getDemoConfig = () => {
  if (!isDemoMode()) return null;

  return {
    readOnly: true,
    autoResetInterval: parseInt(import.meta.env.VITE_AUTO_RESET_INTERVAL) || 3600000,
    maxPins: parseInt(import.meta.env.VITE_MAX_DEMO_PINS) || 50,
    sessionTimeout: parseInt(import.meta.env.VITE_DEMO_SESSION_TIMEOUT) || 300000,
    showWatermark: import.meta.env.VITE_DEMO_WATERMARK === 'true',
    bannerText: import.meta.env.VITE_DEMO_BANNER_TEXT || 'DEMO MODE',

    // Disabled features in demo
    disabledFeatures: {
      ordering: import.meta.env.VITE_ENABLE_ORDERING !== 'true',
      payments: import.meta.env.VITE_ENABLE_PAYMENTS !== 'true',
      sms: import.meta.env.VITE_ENABLE_SMS !== 'true',
      email: import.meta.env.VITE_ENABLE_EMAIL !== 'true',
      pinCreation: import.meta.env.VITE_ALLOW_PIN_CREATION !== 'true',
      dataModification: import.meta.env.VITE_ALLOW_DATA_MODIFICATION !== 'true',
      vestaboard: true,
      facebookShare: true,
      notifications: true,
      externalAPIs: true
    }
  };
};

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = (feature) => {
  const demoConfig = getDemoConfig();

  if (!demoConfig) {
    // Production mode - all features enabled
    return true;
  }

  // Demo mode - check if feature is disabled
  return !demoConfig.disabledFeatures[feature];
};

/**
 * Get the appropriate Supabase configuration based on environment
 */
export const getSupabaseConfig = () => {
  if (isDemoMode()) {
    return {
      url: import.meta.env.VITE_SUPABASE_DEMO_URL || import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_DEMO_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
      isDemo: true
    };
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    isDemo: false
  };
};

/**
 * Intercept write operations in demo mode
 */
export const safeDemoOperation = async (operation, fallbackMessage = 'This action is disabled in demo mode') => {
  const demoConfig = getDemoConfig();

  if (demoConfig && demoConfig.readOnly) {
    console.warn('[DEMO MODE] Blocked write operation:', operation);

    // Show user-friendly message
    if (typeof window !== 'undefined') {
      alert(fallbackMessage);
    }

    return {
      success: false,
      error: 'Demo mode - read only',
      isDemo: true
    };
  }

  // Production mode or write allowed - execute operation
  return await operation();
};

/**
 * Auto-reset demo data periodically
 */
let resetTimer = null;

export const initDemoAutoReset = async (resetFunction) => {
  const demoConfig = getDemoConfig();

  if (!demoConfig || demoConfig.autoResetInterval === 0) {
    return; // Not in demo mode or auto-reset disabled
  }

  // Clear existing timer
  if (resetTimer) {
    clearInterval(resetTimer);
  }

  // Set up periodic reset
  resetTimer = setInterval(async () => {
    console.log('[DEMO MODE] Auto-resetting demo data...');
    await resetFunction();
  }, demoConfig.autoResetInterval);

  // Also reset on page load
  await resetFunction();
};

/**
 * Reset demo data to initial state
 */
export const resetDemoData = async (supabase) => {
  if (!isDemoMode()) {
    console.error('Cannot reset data - not in demo mode');
    return;
  }

  try {
    // Call demo reset endpoint
    const { error } = await supabase.functions.invoke('reset-demo-data', {
      body: { locationId: import.meta.env.VITE_DEMO_LOCATION_ID }
    });

    if (error) throw error;

    console.log('[DEMO MODE] Demo data reset successfully');

    // Reload page to show fresh data
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (error) {
    console.error('[DEMO MODE] Error resetting demo data:', error);
  }
};

/**
 * Get demo session timeout
 */
export const getDemoSessionTimeout = () => {
  const demoConfig = getDemoConfig();
  return demoConfig?.sessionTimeout || 0;
};

/**
 * Log demo analytics (separate from production)
 */
export const logDemoEvent = (eventName, properties = {}) => {
  if (!isDemoMode()) return;

  // Send to demo-specific analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
      demo_mode: true,
      environment: 'demo'
    });
  }

  console.log('[DEMO ANALYTICS]', eventName, properties);
};

/**
 * Get location ID based on environment
 */
export const getLocationId = () => {
  if (isDemoMode()) {
    return import.meta.env.VITE_DEMO_LOCATION_ID || 'demo-location';
  }
  return import.meta.env.VITE_LOCATION_ID || 'chicago-mikes';
};

/**
 * Demo watermark component data
 */
export const getDemoWatermark = () => {
  const demoConfig = getDemoConfig();

  if (!demoConfig || !demoConfig.showWatermark) {
    return null;
  }

  return {
    text: demoConfig.bannerText,
    position: 'top',
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      textAlign: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }
  };
};

/**
 * Check if user can perform action
 */
export const canPerformAction = (action) => {
  const allowedActions = [
    'view',
    'browse',
    'search',
    'filter',
    'zoom',
    'pan'
  ];

  const demoConfig = getDemoConfig();

  if (!demoConfig) {
    // Production - all actions allowed
    return true;
  }

  // Demo - only specific actions allowed
  return allowedActions.includes(action);
};

/**
 * Sanitize data for demo environment
 */
export const sanitizeDemoData = (data) => {
  if (!isDemoMode()) return data;

  // Remove PII and sensitive data
  const sanitized = { ...data };

  // Remove phone numbers
  if (sanitized.phone) sanitized.phone = '555-DEMO';

  // Remove emails
  if (sanitized.email) sanitized.email = 'demo@example.com';

  // Remove addresses
  if (sanitized.address) sanitized.address = '123 Demo St';

  // Remove payment info
  if (sanitized.payment) delete sanitized.payment;

  return sanitized;
};
