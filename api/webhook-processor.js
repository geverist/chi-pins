// api/webhook-processor.js - Intelligent webhook processor
// Receives console events, analyzes errors, and can trigger auto-fixes
//
// Features:
// - Error pattern detection and deduplication
// - Severity classification
// - Auto-fix triggering (when enabled)
// - SMS alerts for critical errors
// - Error history tracking
//
// Setup:
// 1. Set this as your Console Webhook URL in admin panel:
//    https://chi-pins.vercel.app/api/webhook-processor
// 2. Configure ANTHROPIC_API_KEY in Vercel env vars (for auto-fix)
// 3. Enable auto-fix mode with ?autofix=true query param (optional)

import { createClient } from '@supabase/supabase-js';

// In-memory error tracking (consider moving to Redis for production)
let errorHistory = [];
const MAX_HISTORY = 100;
const DUPLICATE_WINDOW_MS = 60000; // 1 minute

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const autoFixEnabled = req.query.autofix === 'true';

    // Validate payload
    if (!payload.events || !Array.isArray(payload.events)) {
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    console.log(`[WebhookProcessor] Received ${payload.events.length} events`);

    // Process each event
    const results = {
      processed: 0,
      errors: 0,
      warnings: 0,
      duplicates: 0,
      autoFixTriggered: [],
      alertsSent: [],
    };

    for (const event of payload.events) {
      results.processed++;

      // Skip non-error events unless they're warnings
      if (event.level !== 'error' && event.level !== 'warn') {
        continue;
      }

      if (event.level === 'error') {
        results.errors++;
      } else {
        results.warnings++;
      }

      // Check for duplicates
      const isDuplicate = checkDuplicate(event);
      if (isDuplicate) {
        results.duplicates++;
        console.log('[WebhookProcessor] Duplicate error, skipping:', event.message.slice(0, 100));
        continue;
      }

      // Add to history
      addToHistory(event, payload);

      // Classify severity
      const severity = classifySeverity(event);
      console.log(`[WebhookProcessor] ${severity} error:`, event.message.slice(0, 100));

      // Send SMS alert for critical errors
      if (severity === 'CRITICAL') {
        const alertSent = await sendSmsAlert(event, payload);
        if (alertSent) {
          results.alertsSent.push(event.message.slice(0, 50));
        }
      }

      // Trigger auto-fix if enabled
      if (autoFixEnabled && (severity === 'CRITICAL' || severity === 'HIGH')) {
        const fixResult = await triggerAutoFix(event, payload);
        if (fixResult) {
          results.autoFixTriggered.push({
            error: event.message.slice(0, 100),
            fixId: fixResult.fixId,
          });
        }
      }

      // Store error in database for tracking
      await storeError(event, payload, severity);
    }

    // Return results
    return res.status(200).json({
      success: true,
      message: 'Events processed',
      results: results,
      autoFixEnabled: autoFixEnabled,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[WebhookProcessor] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Check if this error was already seen recently
function checkDuplicate(event) {
  const now = Date.now();
  const recentErrors = errorHistory.filter(e => now - e.timestamp < DUPLICATE_WINDOW_MS);

  return recentErrors.some(e =>
    e.message === event.message &&
    e.level === event.level &&
    e.stack === event.stack
  );
}

// Add error to history
function addToHistory(event, payload) {
  errorHistory.push({
    message: event.message,
    level: event.level,
    stack: event.stack,
    timestamp: Date.now(),
    source: payload.source,
    tenantId: payload.tenantId,
  });

  // Trim history if too large
  if (errorHistory.length > MAX_HISTORY) {
    errorHistory = errorHistory.slice(-MAX_HISTORY);
  }
}

// Classify error severity
function classifySeverity(event) {
  const message = event.message.toLowerCase();
  const stack = (event.stack || '').toLowerCase();

  // Critical patterns
  const criticalPatterns = [
    'fatal',
    'crash',
    'cannot read properties of undefined',
    'cannot read property',
    'is not a function',
    'database connection failed',
    'network error',
    'failed to fetch',
    'uncaught',
  ];

  // High severity patterns
  const highPatterns = [
    'typeerror',
    'referenceerror',
    'rangeerror',
    'syntaxerror',
    'failed',
    'error:',
  ];

  // Medium severity patterns
  const mediumPatterns = [
    'warning',
    'deprecated',
    'timeout',
  ];

  for (const pattern of criticalPatterns) {
    if (message.includes(pattern) || stack.includes(pattern)) {
      return 'CRITICAL';
    }
  }

  for (const pattern of highPatterns) {
    if (message.includes(pattern) || stack.includes(pattern)) {
      return 'HIGH';
    }
  }

  for (const pattern of mediumPatterns) {
    if (message.includes(pattern) || stack.includes(pattern)) {
      return 'MEDIUM';
    }
  }

  return 'LOW';
}

// Send SMS alert for critical errors
async function sendSmsAlert(event, payload) {
  try {
    const alertMessage = `🚨 CRITICAL ERROR on ${payload.source || 'kiosk'}

Error: ${event.message.slice(0, 150)}

Time: ${new Date(event.timestamp).toLocaleString()}

Check webhook processor logs for details.`;

    const response = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: process.env.ALERT_PHONE || '+17204507540',
        message: alertMessage,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('[WebhookProcessor] Failed to send SMS alert:', err);
    return false;
  }
}

// Trigger auto-fix workflow
async function triggerAutoFix(event, payload) {
  try {
    console.log('[WebhookProcessor] Auto-fix triggered for:', event.message);

    // Generate fix ID
    const fixId = `fix-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Extract error details
    const errorDetails = {
      message: event.message,
      stack: event.stack,
      level: event.level,
      timestamp: event.timestamp,
      url: event.url,
      userAgent: event.userAgent,
      data: event.data,
    };

    // Store fix request in database
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    await supabase.from('auto_fix_requests').insert({
      fix_id: fixId,
      error_details: errorDetails,
      source: payload.source,
      tenant_id: payload.tenantId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // TODO: Trigger Claude Code agent to analyze and fix
    // This would require a separate service or GitHub Actions workflow
    // that can run Claude Code commands and commit fixes
    console.log(`[WebhookProcessor] Fix request stored: ${fixId}`);
    console.log('[WebhookProcessor] Note: Actual code fix requires separate automation service');

    return { fixId };
  } catch (err) {
    console.error('[WebhookProcessor] Failed to trigger auto-fix:', err);
    return null;
  }
}

// Store error in database for tracking
async function storeError(event, payload, severity) {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    await supabase.from('error_log').insert({
      message: event.message,
      level: event.level,
      severity: severity,
      stack: event.stack,
      url: event.url,
      user_agent: event.userAgent,
      source: payload.source,
      tenant_id: payload.tenantId,
      timestamp: event.timestamp || new Date().toISOString(),
      data: event.data,
    });
  } catch (err) {
    // Don't fail the request if database insert fails
    console.error('[WebhookProcessor] Failed to store error:', err);
  }
}
