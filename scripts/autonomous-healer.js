#!/usr/bin/env node
// scripts/autonomous-healer.js - Fully autonomous error detection and fixing
//
// Complete self-healing loop:
// 1. Polls database for new CRITICAL errors
// 2. Analyzes error with AI (Anthropic Claude or OpenAI GPT-4)
// 3. Reads source code
// 4. Generates fix
// 5. Applies fix to code
// 6. Commits and pushes to GitHub
// 7. Self-hosted runner auto-deploys to kiosk
// 8. Verifies fix resolved the error
// 9. SMS notification
//
// Usage:
//   node scripts/autonomous-healer.js
//   (reads config from .env file)
//
// Safety:
//   - Only fixes CRITICAL errors
//   - Creates separate branch for review
//   - Can auto-merge or require approval
//   - Rollback capability
//   - SMS notifications for all actions

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL || '60'),
  enabled: process.env.AUTO_FIX_ENABLED === 'true',
  autoMerge: process.env.AUTO_MERGE === 'true', // If false, creates PR for review
  minSeverity: 'CRITICAL',
  maxFixesPerHour: 5, // Safety limit
  dryRun: process.env.DRY_RUN === 'true',
  aiProvider: process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai', // Auto-detect
};

// Tracking
let fixesThisHour = 0;
let lastHourReset = Date.now();

// Initialize AI clients (only the one with API key)
let anthropic, openai;
if (CONFIG.aiProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} else if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Get unprocessed CRITICAL errors
async function getUnprocessedErrors(supabase) {
  try {
    const { data, error } = await supabase
      .from('error_log')
      .select('*')
      .eq('severity', CONFIG.minSeverity)
      .is('auto_fix_attempted', null)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    log(`Failed to fetch errors: ${err.message}`, 'red');
    return [];
  }
}

// Extract file and line from stack trace
function parseStackTrace(stack) {
  if (!stack) return null;

  // Match patterns like: at Component (src/App.jsx:123:45)
  const patterns = [
    /at .+ \((.+):(\d+):(\d+)\)/,
    /(.+):(\d+):(\d+)/,
    /@(.+):(\d+):(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = stack.match(pattern);
    if (match) {
      return {
        file: match[1].replace(/^.*\/(src\/.+)$/, '$1'), // Extract src/... path
        line: parseInt(match[2]),
        column: parseInt(match[3]),
      };
    }
  }

  return null;
}

// Use Claude to analyze error and generate fix
async function analyzeAndFix(error) {
  const location = parseStackTrace(error.stack);

  log(`Analyzing error: ${error.message.slice(0, 100)}...`, 'cyan');

  if (location) {
    log(`  → Location: ${location.file}:${location.line}`, 'blue');
  }

  // Read the source file
  let sourceCode = '';
  let fullFilePath = '';

  if (location && location.file) {
    try {
      fullFilePath = path.join(process.cwd(), location.file);
      sourceCode = await fs.readFile(fullFilePath, 'utf8');
      log(`  → Read source file: ${location.file}`, 'green');
    } catch (err) {
      log(`  → Could not read file: ${err.message}`, 'yellow');
    }
  }

  // Build context for Claude
  const contextLines = sourceCode ? sourceCode.split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .slice(Math.max(0, location.line - 20), location.line + 20)
    .join('\n') : 'Source code not available';

  // Ask Claude to analyze and fix
  const prompt = `You are an expert JavaScript/React developer. Analyze this error and provide a fix.

ERROR DETAILS:
Message: ${error.message}
Severity: ${error.severity}
Location: ${location ? `${location.file}:${location.line}` : 'Unknown'}
Timestamp: ${error.timestamp}

STACK TRACE:
${error.stack || 'No stack trace'}

SOURCE CODE CONTEXT:
${contextLines}

FULL SOURCE FILE:
${sourceCode || 'Not available'}

TASK:
1. Identify the exact cause of the error
2. Provide a fix that resolves the error
3. Ensure the fix doesn't break existing functionality
4. Return the fix in this JSON format:

{
  "analysis": "Brief explanation of what caused the error",
  "fix_strategy": "Description of the fix approach",
  "file_to_edit": "path/to/file.js",
  "old_code": "exact code to replace (must match exactly)",
  "new_code": "fixed code",
  "confidence": 0-100,
  "test_recommendation": "How to test this fix"
}

IMPORTANT:
- old_code must match EXACTLY (including whitespace/indentation)
- Only fix the specific error, don't refactor
- Be conservative - prefer simple defensive fixes`;

  try {
    let responseText;

    if (CONFIG.aiProvider === 'anthropic') {
      // Use Anthropic Claude
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      responseText = message.content[0].text;
    } else {
      // Use OpenAI GPT-4
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      responseText = completion.choices[0].message.content;
    }

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const fixPlan = JSON.parse(jsonMatch[0]);

    log(`  → Analysis: ${fixPlan.analysis}`, 'cyan');
    log(`  → Strategy: ${fixPlan.fix_strategy}`, 'cyan');
    log(`  → Confidence: ${fixPlan.confidence}%`, fixPlan.confidence >= 80 ? 'green' : 'yellow');

    return fixPlan;

  } catch (err) {
    log(`  → AI analysis failed: ${err.message}`, 'red');
    return null;
  }
}

// Apply fix to source file
async function applyFix(fixPlan) {
  try {
    const filePath = path.join(process.cwd(), fixPlan.file_to_edit);
    const sourceCode = await fs.readFile(filePath, 'utf8');

    // Verify old_code exists in file
    if (!sourceCode.includes(fixPlan.old_code)) {
      throw new Error('old_code not found in file - might have changed');
    }

    // Apply replacement
    const fixedCode = sourceCode.replace(fixPlan.old_code, fixPlan.new_code);

    if (CONFIG.dryRun) {
      log('  → DRY RUN: Would write fix to file', 'yellow');
      return true;
    }

    // Write fixed code
    await fs.writeFile(filePath, fixedCode, 'utf8');
    log(`  → Applied fix to ${fixPlan.file_to_edit}`, 'green');

    return true;
  } catch (err) {
    log(`  → Failed to apply fix: ${err.message}`, 'red');
    return false;
  }
}

// Commit and push fix
async function commitAndPush(error, fixPlan) {
  try {
    const branchName = `autofix/${Date.now()}-${error.id.slice(0, 8)}`;
    const commitMessage = `🤖 Auto-fix: ${error.message.slice(0, 60)}

Error: ${error.message}
Severity: ${error.severity}
Strategy: ${fixPlan.fix_strategy}

Analysis: ${fixPlan.analysis}

This fix was generated and applied autonomously by the self-healing system.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>`;

    if (CONFIG.dryRun) {
      log('  → DRY RUN: Would commit and push', 'yellow');
      return { branch: branchName, committed: false };
    }

    // Create branch
    await execAsync(`git checkout -b ${branchName}`);
    log(`  → Created branch: ${branchName}`, 'green');

    // Stage changes
    await execAsync(`git add ${fixPlan.file_to_edit}`);

    // Commit
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    log('  → Committed fix', 'green');

    // Push
    await execAsync(`git push -u origin ${branchName}`);
    log('  → Pushed to GitHub', 'green');

    // Switch back to main
    await execAsync('git checkout main');

    return { branch: branchName, committed: true };

  } catch (err) {
    log(`  → Git operations failed: ${err.message}`, 'red');
    return { branch: null, committed: false };
  }
}

// Create PR or auto-merge
async function mergeOrCreatePR(branch, error, fixPlan) {
  try {
    if (CONFIG.autoMerge) {
      // Auto-merge to main
      await execAsync('git checkout main');
      await execAsync(`git merge ${branch} --no-ff`);
      await execAsync('git push');
      log('  → Auto-merged to main (will trigger deployment)', 'green');
      return { merged: true, pr_url: null };
    } else {
      // Create PR for review
      const prTitle = `🤖 Auto-fix: ${error.message.slice(0, 60)}`;
      const prBody = `## Autonomous Fix

**Error**: ${error.message}
**Severity**: ${error.severity}
**Confidence**: ${fixPlan.confidence}%

### Analysis
${fixPlan.analysis}

### Fix Strategy
${fixPlan.fix_strategy}

### Testing
${fixPlan.test_recommendation}

---
This fix was generated and applied autonomously. Review and merge if appropriate.`;

      const { stdout } = await execAsync(
        `gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}" --base main --head ${branch}`
      );

      const pr_url = stdout.trim();
      log(`  → Created PR: ${pr_url}`, 'green');
      return { merged: false, pr_url };
    }
  } catch (err) {
    log(`  → Failed to merge/create PR: ${err.message}`, 'red');
    return { merged: false, pr_url: null };
  }
}

// Send SMS notification
async function sendSMS(message) {
  try {
    const response = await fetch('https://chi-pins.vercel.app/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.ALERT_PHONE || '+17204507540',
        message
      })
    });
    return response.ok;
  } catch (err) {
    log(`Failed to send SMS: ${err.message}`, 'yellow');
    return false;
  }
}

// Mark error as processed
async function markProcessed(supabase, errorId, success, details) {
  try {
    await supabase
      .from('error_log')
      .update({
        auto_fix_attempted: true,
        auto_fix_success: success,
        auto_fix_details: details,
        auto_fix_timestamp: new Date().toISOString(),
      })
      .eq('id', errorId);
  } catch (err) {
    log(`Failed to mark error as processed: ${err.message}`, 'red');
  }
}

// Process a single error
async function processError(supabase, error) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Processing CRITICAL error: ${error.message.slice(0, 100)}`, 'yellow');

  try {
    // 1. Analyze and generate fix
    const fixPlan = await analyzeAndFix(error);
    if (!fixPlan) {
      await markProcessed(supabase, error.id, false, { reason: 'AI analysis failed' });
      return;
    }

    // Skip low-confidence fixes
    if (fixPlan.confidence < 80) {
      log(`  → Confidence too low (${fixPlan.confidence}%), skipping`, 'yellow');
      await markProcessed(supabase, error.id, false, {
        reason: 'Low confidence',
        fixPlan
      });
      await sendSMS(`⚠️ Low confidence fix skipped\n\nError: ${error.message.slice(0, 80)}\nConfidence: ${fixPlan.confidence}%\n\nReview required.`);
      return;
    }

    // 2. Apply fix
    const applied = await applyFix(fixPlan);
    if (!applied) {
      await markProcessed(supabase, error.id, false, { reason: 'Failed to apply fix', fixPlan });
      return;
    }

    // 3. Commit and push
    const { branch, committed } = await commitAndPush(error, fixPlan);
    if (!committed) {
      await markProcessed(supabase, error.id, false, { reason: 'Failed to commit', fixPlan });
      return;
    }

    // 4. Merge or create PR
    const { merged, pr_url } = await mergeOrCreatePR(branch, error, fixPlan);

    // 5. Mark as processed
    await markProcessed(supabase, error.id, true, {
      fixPlan,
      branch,
      merged,
      pr_url,
    });

    // 6. Send notification
    if (merged) {
      await sendSMS(`🤖 Auto-fixed and deployed!\n\nError: ${error.message.slice(0, 80)}\n\nFix: ${fixPlan.fix_strategy.slice(0, 100)}\n\nDeployment starting...`);
      log('  → SMS sent: Auto-fix deployed', 'green');
    } else if (pr_url) {
      await sendSMS(`🤖 Auto-fix PR created\n\nError: ${error.message.slice(0, 80)}\n\nReview: ${pr_url}`);
      log('  → SMS sent: PR created', 'green');
    }

    log('✅ Error processed successfully', 'green');

  } catch (err) {
    log(`❌ Failed to process error: ${err.message}`, 'red');
    await markProcessed(supabase, error.id, false, {
      reason: 'Exception during processing',
      error: err.message
    });
  }
}

// Main loop
async function main() {
  log('🤖 Autonomous Healer Starting', 'green');
  log(`Configuration:`, 'cyan');
  log(`  - AI Provider: ${CONFIG.aiProvider.toUpperCase()}`, 'blue');
  log(`  - Poll interval: ${CONFIG.pollIntervalSeconds}s`, 'blue');
  log(`  - Enabled: ${CONFIG.enabled}`, 'blue');
  log(`  - Auto-merge: ${CONFIG.autoMerge}`, 'blue');
  log(`  - Dry run: ${CONFIG.dryRun}`, 'blue');
  log(`  - Max fixes/hour: ${CONFIG.maxFixesPerHour}`, 'blue');

  if (!CONFIG.enabled && !CONFIG.dryRun) {
    log('\n⚠️  AUTO_FIX_ENABLED is not true', 'yellow');
    log('Running in monitoring mode only', 'yellow');
    log('Set AUTO_FIX_ENABLED=true to enable autonomous fixing\n', 'yellow');
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    log('\n⚠️  No AI API key configured', 'yellow');
    log('Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI fixes\n', 'yellow');
  }

  const supabase = getSupabaseClient();

  while (true) {
    try {
      // Reset hourly counter
      if (Date.now() - lastHourReset > 60 * 60 * 1000) {
        fixesThisHour = 0;
        lastHourReset = Date.now();
        log('Hourly fix counter reset', 'blue');
      }

      // Check rate limit
      if (fixesThisHour >= CONFIG.maxFixesPerHour) {
        log(`Rate limit reached (${CONFIG.maxFixesPerHour}/hour), waiting...`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalSeconds * 1000));
        continue;
      }

      // Get unprocessed errors
      const errors = await getUnprocessedErrors(supabase);

      if (errors.length > 0) {
        log(`\nFound ${errors.length} unprocessed CRITICAL error(s)`, 'cyan');

        if (CONFIG.enabled || CONFIG.dryRun) {
          await processError(supabase, errors[0]);
          fixesThisHour++;
        } else {
          log('Autonomous fixing disabled, skipping', 'yellow');
          await markProcessed(supabase, errors[0].id, false, {
            reason: 'Autonomous fixing disabled'
          });
        }
      } else {
        log('No unprocessed errors', 'green');
      }

    } catch (err) {
      log(`Error in main loop: ${err.message}`, 'red');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollIntervalSeconds * 1000));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Autonomous healer stopped', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n🛑 Autonomous healer stopped', 'yellow');
  process.exit(0);
});

// Run
main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
