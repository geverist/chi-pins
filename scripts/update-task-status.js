#!/usr/bin/env node
// Update task status in Supabase
// Usage: node scripts/update-task-status.js <task_id> <status> [commit_hash] [message]

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

let twilioClient = null;
// Try to load Twilio, but don't fail if it's not available
try {
  const twilioModule = await import('twilio');
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilioModule.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch (err) {
  console.log('⚠️  Twilio not available, SMS updates disabled');
}

const taskId = process.argv[2];
const status = process.argv[3];
const commitHash = process.argv[4];
const message = process.argv[5];

if (!taskId || !status) {
  console.error('❌ Usage: node scripts/update-task-status.js <task_id> <status> [commit_hash] [message]');
  console.error('   Statuses: processing, completed, failed');
  process.exit(1);
}

async function updateTask() {
  console.log(`📝 Updating task ${taskId} to status: ${status}`);

  const updates = {
    status,
  };

  if (status === 'processing') {
    updates.started_at = new Date().toISOString();
  }

  if (status === 'completed') {
    updates.success = true;
    updates.completed_at = new Date().toISOString();
    if (commitHash) {
      updates.git_commits = [commitHash];
    }
    if (message) {
      updates.completion_message = message;
    }
  }

  if (status === 'failed') {
    updates.success = false;
    updates.completed_at = new Date().toISOString();
    if (message) {
      updates.error_message = message;
    }
  }

  const { data, error } = await supabase
    .from('autonomous_tasks')
    .update(updates)
    .eq('id', taskId)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Task ${taskId} updated to ${status}`);
  if (data && data.length > 0) {
    console.log('📄 Updated task:', JSON.stringify(data[0], null, 2));

    // Send SMS update if task is completed or failed
    if ((status === 'completed' || status === 'failed') && twilioClient) {
      const task = data[0];
      let smsMessage = '';

      if (status === 'completed') {
        smsMessage = `✅ Task completed: ${task.request_text.slice(0, 100)}`;
        if (commitHash) {
          smsMessage += `\n\nCommit: ${commitHash}`;
        }
        if (message) {
          smsMessage += `\n${message}`;
        }
      } else if (status === 'failed') {
        smsMessage = `❌ Task failed: ${task.request_text.slice(0, 100)}`;
        if (message) {
          smsMessage += `\n\nError: ${message}`;
        }
      }

      try {
        const toNumber = process.env.ALERT_PHONE || '+17204507540';
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        await twilioClient.messages.create({
          body: smsMessage,
          from: fromNumber,
          to: toNumber
        });

        console.log(`📱 SMS update sent to ${toNumber}`);
      } catch (smsError) {
        console.error('⚠️  Failed to send SMS update:', smsError.message);
      }
    }
  }
}

updateTask();
