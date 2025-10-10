#!/usr/bin/env node
// Clean up old/fixed error log entries
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getErrorStats() {
  try {
    // Total errors
    const { count: totalCount } = await supabase
      .from('error_log')
      .select('*', { count: 'exact', head: true });

    // Successfully fixed errors
    const { count: fixedCount } = await supabase
      .from('error_log')
      .select('*', { count: 'exact', head: true })
      .eq('auto_fix_success', true);

    // Failed fix attempts
    const { count: failedFixCount } = await supabase
      .from('error_log')
      .select('*', { count: 'exact', head: true })
      .eq('auto_fix_attempted', true)
      .eq('auto_fix_success', false);

    // Old errors (>7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: oldCount } = await supabase
      .from('error_log')
      .select('*', { count: 'exact', head: true })
      .lt('timestamp', sevenDaysAgo);

    return {
      total: totalCount || 0,
      fixed: fixedCount || 0,
      failedFix: failedFixCount || 0,
      old: oldCount || 0,
    };
  } catch (err) {
    log(`Error getting stats: ${err.message}`, 'red');
    return null;
  }
}

async function cleanupFixed() {
  log('\n📋 Cleaning up successfully fixed errors...', 'blue');

  try {
    const { data: errors, error } = await supabase
      .from('error_log')
      .select('id, message, timestamp, auto_fix_timestamp')
      .eq('auto_fix_success', true)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (!errors || errors.length === 0) {
      log('No fixed errors to clean up', 'green');
      return 0;
    }

    log(`\nFound ${errors.length} successfully fixed errors`, 'cyan');
    log('Sample:', 'yellow');
    errors.slice(0, 5).forEach((e, i) => {
      const errorTime = new Date(e.timestamp).toLocaleString();
      const fixTime = e.auto_fix_timestamp ? new Date(e.auto_fix_timestamp).toLocaleString() : 'N/A';
      log(`  ${i + 1}. ${e.message.slice(0, 60)}... (${errorTime} → Fixed: ${fixTime})`, 'cyan');
    });

    // Delete successfully fixed errors
    const { error: deleteError } = await supabase
      .from('error_log')
      .delete()
      .eq('auto_fix_success', true);

    if (deleteError) throw deleteError;

    log(`\n✅ Deleted ${errors.length} successfully fixed errors`, 'green');
    return errors.length;

  } catch (err) {
    log(`Failed to clean up fixed errors: ${err.message}`, 'red');
    return 0;
  }
}

async function cleanupOld(daysOld = 7) {
  log(`\n📋 Cleaning up errors older than ${daysOld} days...`, 'blue');

  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    // Get old non-CRITICAL errors (keep CRITICAL for analysis)
    const { data: errors, error } = await supabase
      .from('error_log')
      .select('id, message, severity, timestamp')
      .lt('timestamp', cutoffDate)
      .neq('severity', 'CRITICAL')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (!errors || errors.length === 0) {
      log(`No old errors (>${daysOld} days) to clean up`, 'green');
      return 0;
    }

    log(`\nFound ${errors.length} old errors (non-CRITICAL)`, 'cyan');
    log('Sample:', 'yellow');
    errors.slice(0, 5).forEach((e, i) => {
      const errorTime = new Date(e.timestamp).toLocaleString();
      log(`  ${i + 1}. [${e.severity}] ${e.message.slice(0, 50)}... (${errorTime})`, 'cyan');
    });

    // Delete old non-CRITICAL errors
    const { error: deleteError } = await supabase
      .from('error_log')
      .delete()
      .lt('timestamp', cutoffDate)
      .neq('severity', 'CRITICAL');

    if (deleteError) throw deleteError;

    log(`\n✅ Deleted ${errors.length} old errors`, 'green');
    return errors.length;

  } catch (err) {
    log(`Failed to clean up old errors: ${err.message}`, 'red');
    return 0;
  }
}

async function cleanupFailedAttempts() {
  log('\n📋 Cleaning up old failed fix attempts (keeping recent)...', 'blue');

  try {
    // Keep last 30 days of failed attempts for learning
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: errors, error } = await supabase
      .from('error_log')
      .select('id, message, timestamp, auto_fix_details')
      .eq('auto_fix_attempted', true)
      .eq('auto_fix_success', false)
      .lt('timestamp', cutoffDate)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    if (!errors || errors.length === 0) {
      log('No old failed fix attempts to clean up', 'green');
      return 0;
    }

    log(`\nFound ${errors.length} old failed fix attempts (>30 days)`, 'cyan');

    // Delete old failed attempts
    const { error: deleteError } = await supabase
      .from('error_log')
      .delete()
      .eq('auto_fix_attempted', true)
      .eq('auto_fix_success', false)
      .lt('timestamp', cutoffDate);

    if (deleteError) throw deleteError;

    log(`\n✅ Deleted ${errors.length} old failed attempts`, 'green');
    return errors.length;

  } catch (err) {
    log(`Failed to clean up failed attempts: ${err.message}`, 'red');
    return 0;
  }
}

async function main() {
  log('\n🧹 Error Log Cleanup Utility\n', 'cyan');

  // Show current stats
  log('📊 Current Error Log Stats:', 'blue');
  const stats = await getErrorStats();

  if (stats) {
    log(`   Total errors: ${stats.total}`, 'cyan');
    log(`   Successfully fixed: ${stats.fixed}`, 'green');
    log(`   Failed fix attempts: ${stats.failedFix}`, 'yellow');
    log(`   Older than 7 days: ${stats.old}`, 'yellow');
  }

  // Run cleanup operations
  let totalDeleted = 0;

  totalDeleted += await cleanupFixed();
  totalDeleted += await cleanupOld(7);
  totalDeleted += await cleanupFailedAttempts();

  // Show final stats
  log('\n📊 Cleanup Summary:', 'blue');
  log(`   Total deleted: ${totalDeleted} errors`, 'green');

  const finalStats = await getErrorStats();
  if (finalStats) {
    log(`   Remaining: ${finalStats.total} errors`, 'cyan');
  }

  log('\n✅ Cleanup complete!\n', 'green');
}

main();
