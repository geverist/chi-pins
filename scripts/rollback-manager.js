#!/usr/bin/env node
// scripts/rollback-manager.js
// Rollback mechanism for failed autonomous fixes
//
// Features:
// - Creates git snapshots before applying fixes
// - Detects if fixes made things worse
// - Automatically reverts to last good state
// - Tracks rollback history in Supabase
// - SMS notifications for rollbacks
//
// Usage:
//   node scripts/rollback-manager.js create-snapshot "description"
//   node scripts/rollback-manager.js rollback <snapshot-id>
//   node scripts/rollback-manager.js verify-fix <fix-id>

import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

/**
 * Create a snapshot before applying a fix
 */
async function createSnapshot(description, metadata = {}) {
  log('📸 Creating rollback snapshot...', 'cyan');

  try {
    // Get current branch and commit
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    const { stdout: commit } = await execAsync('git rev-parse HEAD');
    const { stdout: diff } = await execAsync('git diff HEAD');

    const snapshot = {
      id: `snapshot-${Date.now()}`,
      branch: branch.trim(),
      commit: commit.trim(),
      description,
      has_uncommitted_changes: diff.trim().length > 0,
      uncommitted_diff: diff.trim() || null,
      created_at: new Date().toISOString(),
      metadata,
    };

    // If there are uncommitted changes, stash them
    if (snapshot.has_uncommitted_changes) {
      log('  → Stashing uncommitted changes...', 'yellow');
      await execAsync(`git stash push -m "Rollback snapshot: ${snapshot.id}"`);
      snapshot.stash_id = snapshot.id;
    }

    // Save snapshot to Supabase
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('rollback_snapshots')
      .insert({
        snapshot_id: snapshot.id,
        git_branch: snapshot.branch,
        git_commit: snapshot.commit,
        description: snapshot.description,
        has_uncommitted_changes: snapshot.has_uncommitted_changes,
        uncommitted_diff: snapshot.uncommitted_diff,
        stash_id: snapshot.stash_id || null,
        metadata: snapshot.metadata,
        created_at: snapshot.created_at,
      });

    if (error) {
      log(`  → Warning: Could not save snapshot to database: ${error.message}`, 'yellow');
    }

    log(`  ✓ Snapshot created: ${snapshot.id}`, 'green');
    log(`  → Branch: ${snapshot.branch}`, 'cyan');
    log(`  → Commit: ${snapshot.commit.substring(0, 8)}`, 'cyan');
    log(`  → Uncommitted changes: ${snapshot.has_uncommitted_changes ? 'Yes (stashed)' : 'No'}`, 'cyan');

    return snapshot;

  } catch (err) {
    log(`  ✗ Failed to create snapshot: ${err.message}`, 'red');
    throw err;
  }
}

/**
 * Rollback to a specific snapshot
 */
async function rollbackToSnapshot(snapshotId) {
  log(`🔄 Rolling back to snapshot: ${snapshotId}...`, 'cyan');

  try {
    // Get snapshot from database
    const supabase = getSupabaseClient();
    const { data: snapshot, error } = await supabase
      .from('rollback_snapshots')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .single();

    if (error || !snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    log(`  → Target commit: ${snapshot.git_commit.substring(0, 8)}`, 'cyan');
    log(`  → Target branch: ${snapshot.git_branch}`, 'cyan');

    // Discard any uncommitted changes
    log('  → Discarding current uncommitted changes...', 'yellow');
    await execAsync('git reset --hard HEAD');
    await execAsync('git clean -fd');

    // Checkout the target commit
    log(`  → Checking out commit ${snapshot.git_commit.substring(0, 8)}...`, 'cyan');
    await execAsync(`git checkout ${snapshot.git_commit}`);

    // If snapshot had uncommitted changes, restore them from stash
    if (snapshot.has_uncommitted_changes && snapshot.stash_id) {
      log('  → Restoring uncommitted changes from stash...', 'cyan');
      try {
        // Find the stash entry
        const { stdout: stashList } = await execAsync('git stash list');
        const stashEntry = stashList.split('\n').find(line => line.includes(snapshot.stash_id));

        if (stashEntry) {
          const stashIndex = stashEntry.match(/^stash@\{(\d+)\}/)[1];
          await execAsync(`git stash apply stash@{${stashIndex}}`);
          log('  ✓ Uncommitted changes restored', 'green');
        } else {
          log('  ⚠️  Stash not found, skipping restore', 'yellow');
        }
      } catch (err) {
        log(`  ⚠️  Could not restore stash: ${err.message}`, 'yellow');
      }
    }

    // Record rollback in database
    await supabase
      .from('rollback_history')
      .insert({
        snapshot_id: snapshotId,
        rolled_back_at: new Date().toISOString(),
        rolled_back_from_commit: (await execAsync('git rev-parse HEAD@{1}')).stdout.trim(),
        reason: 'Manual rollback',
      });

    log('  ✓ Rollback complete', 'green');
    log(`  → You are now at commit ${snapshot.git_commit.substring(0, 8)}`, 'cyan');

    return snapshot;

  } catch (err) {
    log(`  ✗ Rollback failed: ${err.message}`, 'red');
    throw err;
  }
}

/**
 * Verify if a fix improved or worsened the situation
 */
async function verifyFix(fixId, beforeSnapshot, afterState) {
  log(`🔍 Verifying fix ${fixId}...`, 'cyan');

  const metrics = {
    lint_errors_before: 0,
    lint_errors_after: 0,
    build_succeeded_before: false,
    build_succeeded_after: false,
    new_errors_introduced: [],
    fix_effective: false,
    should_rollback: false,
  };

  try {
    // Run ESLint to check for errors
    log('  → Running ESLint...', 'cyan');
    try {
      const { stdout: lintOutput } = await execAsync('npm run lint 2>&1', { timeout: 30000 });
      metrics.lint_errors_after = (lintOutput.match(/error/gi) || []).length;
      log(`  → ESLint errors: ${metrics.lint_errors_after}`, 'cyan');
    } catch (err) {
      // ESLint non-zero exit = errors found
      metrics.lint_errors_after = (err.stdout?.match(/error/gi) || []).length;
      log(`  → ESLint errors: ${metrics.lint_errors_after}`, 'yellow');
    }

    // Try to build
    log('  → Testing build...', 'cyan');
    try {
      await execAsync('npm run build', { timeout: 120000 });
      metrics.build_succeeded_after = true;
      log('  ✓ Build successful', 'green');
    } catch (err) {
      metrics.build_succeeded_after = false;
      log('  ✗ Build failed', 'red');
      metrics.new_errors_introduced.push({
        type: 'build_failure',
        message: err.message,
      });
    }

    // Compare with before state (if available)
    if (beforeSnapshot && beforeSnapshot.metadata) {
      metrics.lint_errors_before = beforeSnapshot.metadata.lint_errors || 0;
      metrics.build_succeeded_before = beforeSnapshot.metadata.build_succeeded || false;

      // Determine if fix was effective
      const errorsReduced = metrics.lint_errors_after < metrics.lint_errors_before;
      const buildImproved = metrics.build_succeeded_after && !metrics.build_succeeded_before;
      const buildBroken = !metrics.build_succeeded_after && metrics.build_succeeded_before;

      metrics.fix_effective = errorsReduced || buildImproved;
      metrics.should_rollback = buildBroken || (metrics.lint_errors_after > metrics.lint_errors_before);

      log(`  → Errors before: ${metrics.lint_errors_before}, after: ${metrics.lint_errors_after}`, 'cyan');
      log(`  → Build before: ${metrics.build_succeeded_before ? 'OK' : 'FAIL'}, after: ${metrics.build_succeeded_after ? 'OK' : 'FAIL'}`, 'cyan');

      if (metrics.should_rollback) {
        log('  ⚠️  Fix made things WORSE - rollback recommended', 'yellow');
      } else if (metrics.fix_effective) {
        log('  ✓ Fix improved the situation', 'green');
      } else {
        log('  → No significant change', 'cyan');
      }
    }

    // Save verification results
    const supabase = getSupabaseClient();
    await supabase
      .from('autonomous_fixes')
      .update({
        verification_status: metrics.fix_effective ? 'success' : (metrics.should_rollback ? 'failed' : 'neutral'),
        verification_metrics: metrics,
        verified_at: new Date().toISOString(),
      })
      .eq('id', fixId);

    return metrics;

  } catch (err) {
    log(`  ✗ Verification failed: ${err.message}`, 'red');
    metrics.verification_error = err.message;
    return metrics;
  }
}

/**
 * Automatic rollback if fix verification fails
 */
async function autoRollbackIfNeeded(fixId, snapshotId) {
  log('🤖 Checking if automatic rollback is needed...', 'cyan');

  try {
    // Get snapshot
    const supabase = getSupabaseClient();
    const { data: snapshot } = await supabase
      .from('rollback_snapshots')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .single();

    if (!snapshot) {
      log('  → Snapshot not found, skipping auto-rollback', 'yellow');
      return false;
    }

    // Verify the fix
    const metrics = await verifyFix(fixId, snapshot, null);

    if (metrics.should_rollback) {
      log('  → Fix verification FAILED - initiating automatic rollback', 'yellow');

      // Perform rollback
      await rollbackToSnapshot(snapshotId);

      // Send SMS notification
      await sendRollbackSMS(fixId, snapshotId, metrics);

      // Update fix record
      await supabase
        .from('autonomous_fixes')
        .update({
          status: 'rolled_back',
          rollback_reason: 'Automatic rollback - fix made things worse',
          rollback_snapshot_id: snapshotId,
          rollback_timestamp: new Date().toISOString(),
        })
        .eq('id', fixId);

      log('  ✓ Automatic rollback completed', 'green');
      return true;
    }

    log('  ✓ Fix verification passed - no rollback needed', 'green');
    return false;

  } catch (err) {
    log(`  ✗ Auto-rollback check failed: ${err.message}`, 'red');
    return false;
  }
}

/**
 * Send SMS notification about rollback
 */
async function sendRollbackSMS(fixId, snapshotId, metrics) {
  try {
    const message = `🔄 Automatic Rollback

Fix ID: ${fixId.slice(0, 8)}

Reason: Fix made things worse
- Lint errors: ${metrics.lint_errors_before} → ${metrics.lint_errors_after}
- Build: ${metrics.build_succeeded_before ? 'OK' : 'FAIL'} → ${metrics.build_succeeded_after ? 'OK' : 'FAIL'}

Rolled back to snapshot ${snapshotId.slice(0, 12)}

Manual intervention may be needed.`;

    const response = await fetch('https://chi-pins.vercel.app/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.ALERT_PHONE || '+17204507540',
        message,
      }),
    });

    if (response.ok) {
      log('  → SMS notification sent', 'green');
    }
  } catch (err) {
    log(`  → SMS notification failed: ${err.message}`, 'yellow');
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'create-snapshot': {
        const description = args[1] || 'Manual snapshot';
        const snapshot = await createSnapshot(description);
        console.log(JSON.stringify(snapshot, null, 2));
        break;
      }

      case 'rollback': {
        const snapshotId = args[1];
        if (!snapshotId) {
          throw new Error('Usage: rollback-manager.js rollback <snapshot-id>');
        }
        await rollbackToSnapshot(snapshotId);
        break;
      }

      case 'verify-fix': {
        const fixId = args[1];
        if (!fixId) {
          throw new Error('Usage: rollback-manager.js verify-fix <fix-id>');
        }
        const metrics = await verifyFix(fixId, null, null);
        console.log(JSON.stringify(metrics, null, 2));
        break;
      }

      case 'auto-rollback': {
        const fixId = args[1];
        const snapshotId = args[2];
        if (!fixId || !snapshotId) {
          throw new Error('Usage: rollback-manager.js auto-rollback <fix-id> <snapshot-id>');
        }
        const rolledBack = await autoRollbackIfNeeded(fixId, snapshotId);
        console.log(JSON.stringify({ rolled_back: rolledBack }, null, 2));
        break;
      }

      default:
        console.log(`
Rollback Manager for Autonomous Healer

Usage:
  node scripts/rollback-manager.js create-snapshot "description"
  node scripts/rollback-manager.js rollback <snapshot-id>
  node scripts/rollback-manager.js verify-fix <fix-id>
  node scripts/rollback-manager.js auto-rollback <fix-id> <snapshot-id>

Commands:
  create-snapshot    Create a rollback point before applying fixes
  rollback          Revert to a previous snapshot
  verify-fix        Check if a fix improved or worsened the code
  auto-rollback     Automatically rollback if fix verification fails
        `);
        process.exit(0);
    }
  } catch (err) {
    log(`Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Export functions for use in autonomous healer
export {
  createSnapshot,
  rollbackToSnapshot,
  verifyFix,
  autoRollbackIfNeeded,
};

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
