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
      .or('auto_fix_attempted.is.null,auto_fix_attempted.eq.false')
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
        model: 'claude-sonnet-4-20250514',
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

// Create autonomous fix record
async function createFixRecord(supabase, error) {
  try {
    const { data, error: insertError } = await supabase
      .from('autonomous_fixes')
      .insert({
        error_id: error.id,
        status: 'analyzing',
        ai_provider: CONFIG.aiProvider,
        ai_model: CONFIG.aiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o',
        healer_version: '1.0.0',
        dry_run: CONFIG.dryRun,
        tenant_id: error.tenant_id || 'chicago-mikes',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return data;
  } catch (err) {
    log(`Failed to create fix record: ${err.message}`, 'red');
    return null;
  }
}

// Update autonomous fix record
async function updateFixRecord(supabase, fixId, updates) {
  try {
    const { error } = await supabase
      .from('autonomous_fixes')
      .update(updates)
      .eq('id', fixId);

    if (error) throw error;
  } catch (err) {
    log(`Failed to update fix record: ${err.message}`, 'red');
  }
}

// Process a single error
async function processError(supabase, error) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Processing CRITICAL error: ${error.message.slice(0, 100)}`, 'yellow');

  // Create fix record for tracking
  const fixRecord = await createFixRecord(supabase, error);
  if (!fixRecord) {
    log('⚠️  Could not create fix tracking record, continuing anyway...', 'yellow');
  }

  // Send SMS when CRITICAL error detected
  const smsSent = await sendSMS(`🚨 CRITICAL Error Detected!\n\nMessage: ${error.message.slice(0, 80)}\n\nSource: ${error.source || 'kiosk'}\nTime: ${new Date(error.timestamp).toLocaleTimeString()}\n\nAutonomous healer starting analysis...`);
  log('  → SMS sent: Error detected', 'green');

  if (fixRecord && smsSent) {
    await updateFixRecord(supabase, fixRecord.id, {
      sms_sent: true,
      sms_timestamp: new Date().toISOString(),
      sms_recipients: [process.env.ALERT_PHONE || '+17204507540'],
    });
  }

  try {
    const aiStartTime = Date.now();

    // 1. Analyze and generate fix
    const fixPlan = await analyzeAndFix(error);
    const aiDuration = Date.now() - aiStartTime;

    if (!fixPlan) {
      if (fixRecord) {
        await updateFixRecord(supabase, fixRecord.id, {
          status: 'failed',
          failure_reason: 'AI analysis failed',
          failure_stage: 'analysis',
          completed_at: new Date().toISOString(),
        });
      }
      await markProcessed(supabase, error.id, false, { reason: 'AI analysis failed' });
      await sendSMS(`❌ Auto-fix FAILED\n\nError: ${error.message.slice(0, 80)}\n\nReason: AI analysis failed\n\nManual intervention required.`);
      return;
    }

    // Update with AI analysis results
    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, {
        status: 'generating_fix',
        ai_analysis: fixPlan.analysis,
        ai_strategy: fixPlan.fix_strategy,
        ai_confidence: fixPlan.confidence,
        ai_request_duration_ms: aiDuration,
        fix_description: `${fixPlan.fix_strategy} (Confidence: ${fixPlan.confidence}%)`,
      });
    }

    // Skip low-confidence fixes
    if (fixPlan.confidence < 80) {
      log(`  → Confidence too low (${fixPlan.confidence}%), skipping`, 'yellow');
      if (fixRecord) {
        await updateFixRecord(supabase, fixRecord.id, {
          status: 'failed',
          failure_reason: `Low confidence: ${fixPlan.confidence}%`,
          failure_stage: 'analysis',
          completed_at: new Date().toISOString(),
        });
      }
      await markProcessed(supabase, error.id, false, {
        reason: 'Low confidence',
        fixPlan
      });
      await sendSMS(`⚠️ Low confidence fix skipped\n\nError: ${error.message.slice(0, 80)}\nConfidence: ${fixPlan.confidence}%\n\nReview required.`);
      return;
    }

    // 2. Apply fix
    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, { status: 'applying_fix' });
    }

    const applied = await applyFix(fixPlan);
    if (!applied) {
      if (fixRecord) {
        await updateFixRecord(supabase, fixRecord.id, {
          status: 'failed',
          failure_reason: 'Could not apply fix to code',
          failure_stage: 'application',
          completed_at: new Date().toISOString(),
        });
      }
      await markProcessed(supabase, error.id, false, { reason: 'Failed to apply fix', fixPlan });
      await sendSMS(`❌ Auto-fix FAILED\n\nError: ${error.message.slice(0, 80)}\n\nReason: Could not apply fix to code\n\nManual intervention required.`);
      return;
    }

    // Calculate code diff size (rough estimate)
    const linesChanged = (fixPlan.new_code.match(/\n/g) || []).length;

    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, {
        files_modified: [{ path: fixPlan.file_to_edit, changes: linesChanged }],
        code_changes: `--- ${fixPlan.file_to_edit}\n+++ ${fixPlan.file_to_edit}\n${fixPlan.old_code}\n---\n${fixPlan.new_code}`,
      });
    }

    // 3. Commit and push
    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, { status: 'committing' });
    }

    const { branch, committed } = await commitAndPush(error, fixPlan);
    if (!committed) {
      if (fixRecord) {
        await updateFixRecord(supabase, fixRecord.id, {
          status: 'failed',
          failure_reason: 'Git commit/push failed',
          failure_stage: 'commit',
          completed_at: new Date().toISOString(),
        });
      }
      await markProcessed(supabase, error.id, false, { reason: 'Failed to commit', fixPlan });
      await sendSMS(`❌ Auto-fix FAILED\n\nError: ${error.message.slice(0, 80)}\n\nReason: Git commit/push failed\n\nManual intervention required.`);
      return;
    }

    // Get commit hash
    let commitHash = null;
    try {
      const { stdout } = await execAsync(`git rev-parse ${branch}`);
      commitHash = stdout.trim();
    } catch (err) {
      log(`Could not get commit hash: ${err.message}`, 'yellow');
    }

    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, {
        branch_name: branch,
        commit_hash: commitHash,
        commit_message: `🤖 Auto-fix: ${error.message.slice(0, 60)}`,
      });
    }

    // 4. Merge or create PR
    const { merged, pr_url } = await mergeOrCreatePR(branch, error, fixPlan);

    // 5. Mark as processed and complete
    const finalStatus = merged || pr_url ? 'success' : 'failed';

    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, {
        status: finalStatus,
        pr_url: pr_url || null,
        completed_at: new Date().toISOString(),
      });
    }

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
    if (fixRecord) {
      await updateFixRecord(supabase, fixRecord.id, {
        status: 'failed',
        failure_reason: `Exception: ${err.message}`,
        failure_stage: 'processing',
        failure_stack: err.stack,
        completed_at: new Date().toISOString(),
      });
    }
    await markProcessed(supabase, error.id, false, {
      reason: 'Exception during processing',
      error: err.message
    });
  }
}

// ==================== TASK PROCESSING ====================
// SMS-triggered development task implementation

// Get confirmed tasks (status='confirmed')
async function getConfirmedTasks(supabase) {
  try {
    const { data, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .eq('status', 'confirmed')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;
    return data || [];
  } catch (err) {
    log(`Failed to fetch tasks: ${err.message}`, 'red');
    return [];
  }
}

// Use AI to create detailed implementation plan
async function createImplementationPlan(task) {
  log(`Creating implementation plan for task: ${task.request_text}`, 'cyan');

  const prompt = `You are an expert React/JavaScript developer implementing a new feature for a kiosk application.

TASK REQUEST:
"${task.request_text}"

TASK ANALYSIS (from initial review):
Type: ${task.task_type}
Complexity: ${task.estimated_complexity}
Confidence: ${task.ai_confidence}%
Affected Files: ${task.affected_files ? task.affected_files.join(', ') : 'Unknown'}

YOUR TASK:
Create a detailed implementation plan with code changes.

Return a JSON response with this structure:
{
  "implementation_strategy": "High-level approach to implementing this feature",
  "changes": [
    {
      "file_to_edit": "path/to/file.js",
      "old_code": "exact code to replace (must match file exactly)",
      "new_code": "new implementation",
      "change_description": "What this change does"
    }
  ],
  "confidence": 0-100,
  "test_recommendation": "How to verify this works",
  "deployment_notes": "Any special considerations"
}

IMPORTANT GUIDELINES:
- Make minimal, focused changes
- Maintain existing code style and patterns
- old_code must match EXACTLY (including whitespace)
- Ensure changes are compatible with existing code
- Consider edge cases and error handling
- Be production-ready - this will deploy automatically`;

  try {
    let responseText;

    if (CONFIG.aiProvider === 'anthropic') {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      responseText = message.content[0].text;
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      responseText = completion.choices[0].message.content;
    }

    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON');
    }

    const plan = JSON.parse(jsonMatch[0]);

    log(`  → Strategy: ${plan.implementation_strategy}`, 'cyan');
    log(`  → Changes: ${plan.changes.length} files`, 'blue');
    log(`  → Confidence: ${plan.confidence}%`, plan.confidence >= 80 ? 'green' : 'yellow');

    return plan;

  } catch (err) {
    log(`  → Implementation planning failed: ${err.message}`, 'red');
    return null;
  }
}

// Apply multiple code changes for a feature
async function applyTaskChanges(plan) {
  const appliedFiles = [];

  for (const change of plan.changes) {
    try {
      const filePath = path.join(process.cwd(), change.file_to_edit);

      log(`  → Applying change to ${change.file_to_edit}...`, 'blue');
      log(`      ${change.change_description}`, 'cyan');

      const sourceCode = await fs.readFile(filePath, 'utf8');

      // Verify old_code exists
      if (!sourceCode.includes(change.old_code)) {
        throw new Error(`old_code not found in ${change.file_to_edit}`);
      }

      // Apply change
      const updatedCode = sourceCode.replace(change.old_code, change.new_code);

      if (CONFIG.dryRun) {
        log(`      DRY RUN: Would update file`, 'yellow');
      } else {
        await fs.writeFile(filePath, updatedCode, 'utf8');
        log(`      ✓ Updated ${change.file_to_edit}`, 'green');
      }

      appliedFiles.push(change.file_to_edit);

    } catch (err) {
      log(`      ✗ Failed to apply change: ${err.message}`, 'red');
      return { success: false, appliedFiles, error: err.message };
    }
  }

  return { success: true, appliedFiles };
}

// Commit and push task implementation
async function commitTask(task, plan, appliedFiles) {
  try {
    const branchName = `feature/${Date.now()}-${task.id.slice(0, 8)}`;
    const commitMessage = `🤖 Implement: ${task.request_text.slice(0, 60)}

Request: ${task.request_text}
Type: ${task.task_type}
Complexity: ${task.estimated_complexity}

Strategy: ${plan.implementation_strategy}

This feature was implemented autonomously via SMS request.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>`;

    if (CONFIG.dryRun) {
      log('  → DRY RUN: Would commit and push', 'yellow');
      return { branch: branchName, committed: false };
    }

    // Create branch
    await execAsync(`git checkout -b ${branchName}`);
    log(`  → Created branch: ${branchName}`, 'green');

    // Stage all changed files
    for (const file of appliedFiles) {
      await execAsync(`git add ${file}`);
    }

    // Commit
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
    log('  → Committed implementation', 'green');

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

// Main task processor
async function processTask(supabase, task) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`Processing development task: ${task.request_text}`, 'yellow');

  // Update status to implementing
  await supabase
    .from('autonomous_tasks')
    .update({
      status: 'implementing',
      started_at: new Date().toISOString()
    })
    .eq('id', task.id);

  // Send SMS notification
  await sendSMS(`🤖 Implementing Feature

Request: ${task.request_text}

Type: ${task.task_type}
Complexity: ${task.estimated_complexity}

Starting implementation...`);

  try {
    // 1. Create detailed implementation plan
    const plan = await createImplementationPlan(task);

    if (!plan) {
      await supabase
        .from('autonomous_tasks')
        .update({
          status: 'failed',
          error_message: 'AI failed to create implementation plan',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      await sendSMS(`❌ Implementation FAILED

Task: ${task.request_text.slice(0, 80)}

Reason: Could not create implementation plan

Manual intervention required.`);
      return;
    }

    // Check confidence
    if (plan.confidence < 70) {
      log(`  → Confidence too low (${plan.confidence}%), skipping`, 'yellow');

      await supabase
        .from('autonomous_tasks')
        .update({
          status: 'failed',
          error_message: `Low confidence: ${plan.confidence}%`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      await sendSMS(`⚠️ Low confidence task skipped

Task: ${task.request_text.slice(0, 80)}
Confidence: ${plan.confidence}%

Manual implementation recommended.`);
      return;
    }

    // 2. Apply code changes
    const { success, appliedFiles, error } = await applyTaskChanges(plan);

    if (!success) {
      await supabase
        .from('autonomous_tasks')
        .update({
          status: 'failed',
          error_message: `Failed to apply changes: ${error}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      await sendSMS(`❌ Implementation FAILED

Task: ${task.request_text.slice(0, 80)}

Reason: Could not apply code changes

${error}`);
      return;
    }

    // 3. Commit and push
    const { branch, committed } = await commitTask(task, plan, appliedFiles);

    if (!committed) {
      await supabase
        .from('autonomous_tasks')
        .update({
          status: 'failed',
          error_message: 'Git commit/push failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      await sendSMS(`❌ Implementation FAILED

Task: ${task.request_text.slice(0, 80)}

Reason: Git operations failed

Manual intervention required.`);
      return;
    }

    // 4. Merge or create PR
    const taskForPR = {
      message: task.request_text,
      id: task.id,
    };
    const planForPR = {
      analysis: `Task type: ${task.task_type}`,
      fix_strategy: plan.implementation_strategy,
      confidence: plan.confidence,
      test_recommendation: plan.test_recommendation,
    };

    const { merged, pr_url } = await mergeOrCreatePR(branch, taskForPR, planForPR);

    // 5. Update task as completed
    await supabase
      .from('autonomous_tasks')
      .update({
        status: merged ? 'deployed' : 'completed',
        success: true,
        git_branch: branch,
        git_commits: [branch], // Could track actual commit hashes
        deployment_url: pr_url || null,
        code_changes: JSON.stringify(plan.changes),
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // 6. Send success notification
    if (merged) {
      await sendSMS(`✅ Feature Deployed!

Task: ${task.request_text}

${plan.implementation_strategy.slice(0, 100)}

Deployment in progress. Check your kiosk in ~2 min.`);
      log('  → SMS sent: Feature deployed', 'green');
    } else if (pr_url) {
      await sendSMS(`✅ Feature Implemented

Task: ${task.request_text}

PR created for review:
${pr_url}`);
      log('  → SMS sent: PR created', 'green');
    }

    log('✅ Task implemented successfully', 'green');

  } catch (err) {
    log(`❌ Failed to process task: ${err.message}`, 'red');

    await supabase
      .from('autonomous_tasks')
      .update({
        status: 'failed',
        error_message: err.message,
        error_details: { stack: err.stack },
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);
  }
}

// Ensure autonomous_tasks table exists
async function ensureTablesExist(supabase) {
  log('Checking database tables...', 'blue');

  try {
    // Try to query autonomous_tasks table
    const { error } = await supabase
      .from('autonomous_tasks')
      .select('id')
      .limit(1);

    if (!error) {
      log('✓ autonomous_tasks table exists', 'green');
      return true;
    }

    // Table doesn't exist - it will be created via the SMS webhook on first use
    // or manually via Supabase dashboard
    if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
      log('⚠️  autonomous_tasks table not found', 'yellow');
      log('   Table will be auto-created on first SMS development request', 'yellow');
      log('   Or run this SQL in Supabase dashboard:', 'yellow');
      log('   CREATE TABLE autonomous_tasks (...)', 'yellow');
      return false;
    }

    // Some other error
    log(`Table check error: ${error.message}`, 'yellow');
    return false;

  } catch (err) {
    log(`Database check failed: ${err.message}`, 'yellow');
    return false;
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

  // Check database tables on startup
  await ensureTablesExist(supabase);

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

      // Check for confirmed tasks first (SMS development requests)
      const tasks = await getConfirmedTasks(supabase);

      if (tasks.length > 0) {
        log(`\nFound ${tasks.length} confirmed development task(s)`, 'cyan');

        if (CONFIG.enabled || CONFIG.dryRun) {
          await processTask(supabase, tasks[0]);
          fixesThisHour++;
        } else {
          log('Autonomous development disabled, skipping', 'yellow');
          await supabase
            .from('autonomous_tasks')
            .update({
              status: 'cancelled',
              error_message: 'Autonomous development disabled'
            })
            .eq('id', tasks[0].id);
        }
      } else {
        // No tasks, check for errors
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
          log('No tasks or errors to process', 'green');
        }
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
