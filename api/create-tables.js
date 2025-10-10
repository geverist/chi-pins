// api/create-tables.js - One-time table creation endpoint
// Visit: https://chi-pins.vercel.app/api/create-tables?secret=YOUR_SECRET
// This creates the autonomous_tasks table in Supabase

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

export default async function handler(req, res) {
  // Security: require secret parameter
  const secret = req.query.secret;
  const expectedSecret = process.env.SETUP_SECRET || 'please-set-SETUP_SECRET';

  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // We'll use the autonomous-healer pattern - check if table exists first
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Try to select from table
    const { error: checkError } = await supabase
      .from('autonomous_tasks')
      .select('id')
      .limit(1);

    if (!checkError) {
      return res.status(200).json({
        message: 'Table already exists',
        table: 'autonomous_tasks',
      });
    }

    // Table doesn't exist - we need to create it
    // Since Supabase client can't execute DDL, return SQL for manual execution
    const sql = `-- Autonomous Tasks Table
CREATE TABLE IF NOT EXISTS autonomous_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_text TEXT NOT NULL,
  request_source TEXT NOT NULL DEFAULT 'sms',
  requester_phone TEXT,
  requester_name TEXT,
  task_type TEXT,
  estimated_complexity TEXT,
  affected_files TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  ai_provider TEXT DEFAULT 'anthropic',
  ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  ai_plan TEXT,
  ai_confidence INTEGER,
  requires_confirmation BOOLEAN DEFAULT true,
  confirmation_sent_at TIMESTAMPTZ,
  confirmation_received_at TIMESTAMPTZ,
  confirmation_response TEXT,
  code_changes JSONB,
  git_branch TEXT,
  git_commits TEXT[],
  deployment_url TEXT,
  success BOOLEAN,
  error_message TEXT,
  error_details JSONB,
  sms_notifications JSONB,
  tenant_id TEXT DEFAULT 'chicago-mikes',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_status ON autonomous_tasks(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_created_at ON autonomous_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_requester ON autonomous_tasks(requester_phone);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_tenant ON autonomous_tasks(tenant_id);

ALTER TABLE autonomous_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON autonomous_tasks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON autonomous_tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON autonomous_tasks
  FOR UPDATE USING (true);`;

    return res.status(200).json({
      message: 'Table does not exist',
      action: 'Please run this SQL in Supabase SQL Editor',
      sql_url: `https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.match(/\/\/(.+?)\.supabase/)?.[1]}/sql/new`,
      sql: sql,
      note: 'Copy the SQL above and run it in the Supabase SQL Editor, then deploy this app',
    });

  } catch (error) {
    console.error('[CreateTables] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
