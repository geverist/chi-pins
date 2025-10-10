-- Autonomous Tasks Table
-- Stores free-form development requests received via SMS
-- Allows AI to autonomously implement features, not just fix bugs

CREATE TABLE IF NOT EXISTS autonomous_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  request_text TEXT NOT NULL,
  request_source TEXT NOT NULL DEFAULT 'sms', -- sms, api, webhook, etc
  requester_phone TEXT, -- Phone number of requester (for SMS)
  requester_name TEXT, -- Optional: name of requester

  -- Task classification (AI-determined)
  task_type TEXT, -- feature, bug_fix, refactor, docs, config, etc
  estimated_complexity TEXT, -- simple, medium, complex, very_complex
  affected_files TEXT[], -- Array of files AI expects to modify

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, analyzing, awaiting_confirmation, confirmed, planning, implementing, testing, committing, deployed, failed, cancelled

  -- AI analysis
  ai_provider TEXT DEFAULT 'anthropic',
  ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  ai_plan TEXT, -- AI's implementation plan
  ai_confidence INTEGER, -- 0-100 confidence score

  -- Confirmation flow
  requires_confirmation BOOLEAN DEFAULT true,
  confirmation_sent_at TIMESTAMPTZ,
  confirmation_received_at TIMESTAMPTZ,
  confirmation_response TEXT, -- YES, NO, CANCEL, etc

  -- Implementation tracking
  code_changes JSONB, -- Array of {file, old_content, new_content, diff}
  git_branch TEXT,
  git_commits TEXT[], -- Array of commit hashes
  deployment_url TEXT,

  -- Results
  success BOOLEAN,
  error_message TEXT,
  error_details JSONB,

  -- SMS notifications
  sms_notifications JSONB, -- Array of {timestamp, message, status}

  -- Metadata
  tenant_id TEXT DEFAULT 'chicago-mikes',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_status ON autonomous_tasks(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_created_at ON autonomous_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_requester ON autonomous_tasks(requester_phone);
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_tenant ON autonomous_tasks(tenant_id);

-- RLS policies
ALTER TABLE autonomous_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON autonomous_tasks
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON autonomous_tasks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON autonomous_tasks
  FOR UPDATE USING (true);

COMMENT ON TABLE autonomous_tasks IS 'Stores autonomous development task requests from SMS, webhooks, or API';
COMMENT ON COLUMN autonomous_tasks.status IS 'Task lifecycle: pending → analyzing → awaiting_confirmation → confirmed → planning → implementing → testing → committing → deployed';
COMMENT ON COLUMN autonomous_tasks.ai_confidence IS 'AI confidence score 0-100. Tasks below 70 require manual confirmation.';
COMMENT ON COLUMN autonomous_tasks.code_changes IS 'Full record of all code modifications with diffs';
