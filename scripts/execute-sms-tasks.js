#!/usr/bin/env node
// Execute pending SMS tasks from Supabase
// This script fetches tasks created by the AI task manager via SMS
// and outputs them for execution by Claude Code

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
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getNextTask() {
  log('\n🔍 Checking for pending tasks from SMS...', 'cyan');

  try {
    // Get next task that's awaiting confirmation or confirmed
    const { data: tasks, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .in('status', ['awaiting_confirmation', 'confirmed'])
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      log('✅ No pending tasks found', 'green');
      return null;
    }

    const task = tasks[0];
    log(`\n📋 Found Task #${task.id}`, 'bold');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');
    log(`Status: ${task.status}`, 'yellow');
    log(`Created: ${new Date(task.created_at).toLocaleString()}`, 'reset');
    log(`Type: ${task.task_type || 'unknown'}`, 'reset');
    log(`Complexity: ${task.estimated_complexity || 'unknown'}`, 'reset');
    log(`Confidence: ${task.ai_confidence || 'N/A'}%`, 'reset');
    log(`\n📝 Request:`, 'bold');
    log(task.request_text, 'reset');

    if (task.ai_plan) {
      log(`\n🎯 AI Plan:`, 'bold');
      log(task.ai_plan, 'cyan');
    }

    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'blue');
    log(`\n✨ Ready to execute! Use these commands:`, 'green');
    log(`\n  Mark as processing:`, 'yellow');
    log(`  node scripts/update-task-status.js ${task.id} processing`, 'reset');
    log(`\n  Mark as completed:`, 'green');
    log(`  node scripts/update-task-status.js ${task.id} completed "commit-hash" "success message"`, 'reset');
    log(`\n  Mark as failed:`, 'red');
    log(`  node scripts/update-task-status.js ${task.id} failed "error message"`, 'reset');

    // Output JSON for programmatic use
    if (process.argv.includes('--json')) {
      log('\n📄 JSON Output:', 'blue');
      console.log(JSON.stringify(task, null, 2));
    }

    return task;
  } catch (err) {
    log(`❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

async function main() {
  const task = await getNextTask();

  if (task) {
    // Return task ID for shell scripts
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
