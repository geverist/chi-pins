#!/usr/bin/env node
// Check autonomous tasks status
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTasks() {
  log('\n🤖 Autonomous Tasks Status\n', 'cyan');

  try {
    // Get all tasks ordered by most recent first
    const { data: tasks, error } = await supabase
      .from('autonomous_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      log('No tasks found', 'yellow');
      return;
    }

    log(`Found ${tasks.length} task(s):\n`, 'blue');

    tasks.forEach((task, i) => {
      const created = new Date(task.created_at).toLocaleString();
      const statusColor =
        task.status === 'completed' ? 'green' :
        task.status === 'processing' || task.status === 'confirmed' ? 'yellow' :
        task.status === 'failed' ? 'red' :
        task.status === 'awaiting_confirmation' ? 'cyan' :
        'reset';

      log(`${i + 1}. [${task.status.toUpperCase()}] ${task.request_text.slice(0, 70)}`, statusColor);
      log(`   Created: ${created}`, 'reset');
      log(`   Type: ${task.task_type || 'unknown'}`, 'reset');
      log(`   Complexity: ${task.estimated_complexity || 'unknown'}`, 'reset');
      log(`   Confidence: ${task.ai_confidence || 'N/A'}%`, 'reset');

      if (task.ai_plan) {
        log(`   Plan: ${task.ai_plan.slice(0, 100)}...`, 'reset');
      }

      if (task.error_message) {
        log(`   Error: ${task.error_message}`, 'red');
      }

      if (task.git_commits && task.git_commits.length > 0) {
        log(`   Commits: ${task.git_commits.join(', ')}`, 'green');
      }

      log('', 'reset');
    });

    // Summary by status
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    log('📊 Status Summary:', 'blue');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const color =
        status === 'completed' ? 'green' :
        status === 'failed' ? 'red' :
        'yellow';
      log(`   ${status}: ${count}`, color);
    });

  } catch (err) {
    log(`❌ Error: ${err.message}`, 'red');
    process.exit(1);
  }
}

checkTasks();
