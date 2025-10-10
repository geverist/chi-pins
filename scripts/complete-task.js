#!/usr/bin/env node
// Mark the weather widget task as completed
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function completeTask() {
  // Get the failed weather widget task
  const { data: tasks, error } = await supabase
    .from('autonomous_tasks')
    .select('*')
    .eq('status', 'failed')
    .ilike('request_text', '%weather%widget%')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !tasks || tasks.length === 0) {
    console.log('No failed weather widget task found');
    return;
  }

  const task = tasks[0];
  console.log(`Found task: ${task.request_text}`);

  // Update to completed
  const { error: updateError } = await supabase
    .from('autonomous_tasks')
    .update({
      status: 'completed',
      success: true,
      completed_at: new Date().toISOString(),
      git_commits: ['3aa1b13'],
      error_message: null,
      code_changes: {
        description: 'Manually completed after autonomous healer file path error',
        changes: [
          {
            file: 'Supabase settings table',
            description: 'Updated showWeatherWidget from true to false'
          }
        ]
      }
    })
    .eq('id', task.id);

  if (updateError) {
    console.error('❌ Failed to update task:', updateError);
  } else {
    console.log('✅ Task marked as completed');
  }
}

completeTask();
