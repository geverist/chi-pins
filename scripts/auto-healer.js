#!/usr/bin/env node
// scripts/auto-healer.js - Autonomous error fixing system
//
// This script continuously monitors the webhook-processor error log
// and automatically fixes errors using AI code analysis
//
// Architecture:
// 1. Poll Supabase for new errors from webhook-processor
// 2. Analyze error with full context (stack trace, message, data)
// 3. Search codebase for problematic code
// 4. Generate and apply fix
// 5. Run tests to verify fix
// 6. Commit and push fix
// 7. Monitor deployment
// 8. Send notification
//
// Usage:
//   node scripts/auto-healer.js [--interval=60] [--dry-run] [--severity=CRITICAL]
//
// Environment variables:
//   ANTHROPIC_API_KEY - Required for AI code analysis
//   VITE_SUPABASE_URL - Supabase project URL
//   VITE_SUPABASE_ANON_KEY - Supabase anon key
//   ALERT_PHONE - Phone number for SMS alerts (optional)
//   AUTO_HEALER_ENABLED - Set to 'true' to enable (safety flag)

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  pollIntervalSeconds: parseInt(process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] || '60'),
  dryRun: process.argv.includes('--dry-run'),
  minSeverity: process.argv.find(a => a.startsWith('--severity='))?.split('=')[1] || 'HIGH',
  enabled: process.env.AUTO_HEALER_ENABLED === 'true',
};

// Severity levels (higher number = more severe)
const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Initialize Supabase client
function getSupabaseClient() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

// Get unprocessed errors from database
async function getUnprocessedErrors(supabase) {
  try {
    const { data, error } = await supabase
      .from('error_log')
      .select('*')
      .is('auto_fix_attempted', null)
      .gte('severity', CONFIG.minSeverity)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (err) {
    log(`Failed to fetch errors: ${err.message}`, 'red');
    return [];
  }
}

// Analyze error and generate fix instructions
async function analyzeError(error) {
  log(`Analyzing error: ${error.message.slice(0, 100)}...`, 'cyan');

  // Extract file and line from stack trace
  const stackMatch = error.stack?.match(/at .+ \((.+):(\d+):(\d+)\)/);
  let file = null;
  let line = null;

  if (stackMatch) {
    file = stackMatch[1];
    line = parseInt(stackMatch[2]);
    log(`  → Error location: ${file}:${line}`, 'blue');
  }

  // Categorize error type
  const errorType = categorizeError(error.message);
  log(`  → Error type: ${errorType}`, 'blue');

  return {
    errorType,
    file,
    line,
    message: error.message,
    stack: error.stack,
    suggestedFix: generateFixStrategy(errorType, error),
  };
}

// Categorize error type
function categorizeError(message) {
  if (message.includes('Cannot read properties of undefined')) {
    return 'NULL_REFERENCE';
  }
  if (message.includes('is not a function')) {
    return 'TYPE_ERROR';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'NETWORK_ERROR';
  }
  if (message.includes('Cannot find module')) {
    return 'MISSING_DEPENDENCY';
  }
  return 'UNKNOWN';
}

// Generate fix strategy based on error type
function generateFixStrategy(errorType, error) {
  const strategies = {
    NULL_REFERENCE: {
      description: 'Add null/undefined checks before property access',
      example: 'Check if object exists before accessing property',
      priority: 'HIGH',
    },
    TYPE_ERROR: {
      description: 'Fix type mismatch or add type guards',
      example: 'Ensure variable is correct type before calling methods',
      priority: 'HIGH',
    },
    NETWORK_ERROR: {
      description: 'Add error handling and retry logic',
      example: 'Wrap fetch calls in try-catch with fallback',
      priority: 'MEDIUM',
    },
    MISSING_DEPENDENCY: {
      description: 'Install missing dependency or fix import path',
      example: 'Run npm install or fix import statement',
      priority: 'HIGH',
    },
    UNKNOWN: {
      description: 'Manual review required',
      example: 'Error pattern not recognized',
      priority: 'LOW',
    },
  };

  return strategies[errorType] || strategies.UNKNOWN;
}

// Create fix prompt for AI
function createFixPrompt(analysis, error) {
  return `# Auto-Healer Fix Request

## Error Details
- **Message**: ${error.message}
- **Severity**: ${error.severity}
- **Type**: ${analysis.errorType}
- **Location**: ${analysis.file || 'Unknown'}:${analysis.line || '?'}
- **Timestamp**: ${error.timestamp}

## Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

## Suggested Fix Strategy
${analysis.suggestedFix.description}

Example: ${analysis.suggestedFix.example}

## Instructions
1. Read the file where the error occurred: ${analysis.file}
2. Find the exact line causing the error (line ${analysis.line})
3. Analyze the surrounding code context
4. Apply the fix strategy: ${analysis.suggestedFix.description}
5. Ensure the fix doesn't break any existing functionality
6. Run any relevant tests to verify the fix

## Fix Requirements
- Must fix the error without introducing new issues
- Must maintain existing functionality
- Must follow existing code style
- Should add defensive checks where appropriate

Please analyze the error, locate the problematic code, and apply an appropriate fix.`;
}

// Save fix prompt to file for manual review
async function saveFixPrompt(analysis, error, promptText) {
  const fixesDir = path.join(process.cwd(), '.auto-healer-fixes');
  await fs.mkdir(fixesDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `fix-${timestamp}-${error.id}.md`;
  const filepath = path.join(fixesDir, filename);

  await fs.writeFile(filepath, promptText, 'utf8');
  log(`  → Fix prompt saved: ${filepath}`, 'green');

  return filepath;
}

// Mark error as processed
async function markErrorProcessed(supabase, errorId, success, fixDetails) {
  try {
    await supabase
      .from('error_log')
      .update({
        auto_fix_attempted: true,
        auto_fix_success: success,
        auto_fix_details: fixDetails,
        auto_fix_timestamp: new Date().toISOString(),
      })
      .eq('id', errorId);
  } catch (err) {
    log(`Failed to mark error as processed: ${err.message}`, 'red');
  }
}

// Send notification
async function sendNotification(message) {
  if (!process.env.ALERT_PHONE) {
    log('No ALERT_PHONE configured, skipping notification', 'yellow');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.ALERT_PHONE,
        message: message,
      }),
    });

    if (response.ok) {
      log('Notification sent', 'green');
    }
  } catch (err) {
    log(`Failed to send notification: ${err.message}`, 'yellow');
  }
}

// Process a single error
async function processError(supabase, error) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Processing error: ${error.message.slice(0, 100)}`, 'yellow');
  log(`Severity: ${error.severity} | Level: ${error.level}`, 'yellow');

  try {
    // Analyze error
    const analysis = await analyzeError(error);

    // Generate fix prompt
    const promptText = createFixPrompt(analysis, error);

    // Save prompt for review
    const promptFile = await saveFixPrompt(analysis, error, promptText);

    if (CONFIG.dryRun) {
      log('DRY RUN MODE - Would attempt fix here', 'yellow');
      log(`Review fix prompt at: ${promptFile}`, 'cyan');
      await markErrorProcessed(supabase, error.id, false, {
        dryRun: true,
        promptFile,
        analysis,
      });
      return;
    }

    if (!CONFIG.enabled) {
      log('AUTO_HEALER_ENABLED is not true - fix not applied', 'yellow');
      log('Set AUTO_HEALER_ENABLED=true to enable automatic fixes', 'yellow');
      log(`Review fix prompt at: ${promptFile}`, 'cyan');
      await markErrorProcessed(supabase, error.id, false, {
        disabled: true,
        promptFile,
        analysis,
      });
      return;
    }

    // TODO: Integrate with Claude Code API or use Anthropic API to apply fix
    // For now, just create the fix prompt and notify
    log('Fix prompt generated - manual review required', 'green');
    log('Automatic code fixing requires integration with Anthropic API', 'yellow');

    await sendNotification(
      `🔧 Auto-Healer: Fix prompt generated for ${analysis.errorType}\n\n` +
      `Error: ${error.message.slice(0, 100)}\n\n` +
      `Review: ${promptFile}`
    );

    await markErrorProcessed(supabase, error.id, true, {
      promptFile,
      analysis,
      note: 'Fix prompt generated, manual review required',
    });

  } catch (err) {
    log(`Failed to process error: ${err.message}`, 'red');
    await markErrorProcessed(supabase, error.id, false, {
      error: err.message,
    });
  }
}

// Main loop
async function main() {
  log('Auto-Healer Starting', 'green');
  log(`Configuration:`, 'cyan');
  log(`  - Poll interval: ${CONFIG.pollIntervalSeconds}s`, 'blue');
  log(`  - Min severity: ${CONFIG.minSeverity}`, 'blue');
  log(`  - Dry run: ${CONFIG.dryRun}`, 'blue');
  log(`  - Enabled: ${CONFIG.enabled}`, 'blue');

  if (!CONFIG.enabled && !CONFIG.dryRun) {
    log('\n⚠️  AUTO_HEALER_ENABLED is not true', 'yellow');
    log('Running in monitoring mode - no fixes will be applied', 'yellow');
    log('Set AUTO_HEALER_ENABLED=true to enable automatic fixes\n', 'yellow');
  }

  const supabase = getSupabaseClient();
  let consecutiveErrors = 0;

  while (true) {
    try {
      // Get unprocessed errors
      const errors = await getUnprocessedErrors(supabase);

      if (errors.length > 0) {
        log(`\nFound ${errors.length} unprocessed error(s)`, 'cyan');

        // Process each error
        for (const error of errors) {
          await processError(supabase, error);
        }

        consecutiveErrors = 0;
      } else {
        if (consecutiveErrors === 0) {
          log('No unprocessed errors found', 'green');
        }
        consecutiveErrors++;
      }

    } catch (err) {
      log(`Error in main loop: ${err.message}`, 'red');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalSeconds * 1000));
  }
}

// Run
main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
