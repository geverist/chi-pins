-- Create autonomous_fixes table for tracking all autonomous healing attempts
-- This provides a complete archive for reporting, notifications, and analytics

CREATE TABLE IF NOT EXISTS autonomous_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the error that triggered this fix
  error_id UUID REFERENCES error_log(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'analyzing', 'generating_fix', 'applying_fix', 'testing', 'committing', 'success', 'failed')),

  -- AI Analysis
  ai_provider TEXT DEFAULT 'anthropic', -- anthropic, openai, etc.
  ai_model TEXT, -- e.g., claude-sonnet-4-20250514
  ai_analysis TEXT, -- The AI's analysis of the error
  ai_strategy TEXT, -- The strategy the AI chose to fix the error
  ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100), -- AI's confidence in the fix (0-100)

  -- Fix details
  fix_description TEXT, -- Human-readable description of what was fixed
  files_modified JSONB, -- Array of files that were modified: [{path: "src/App.jsx", changes: 5}]
  code_changes TEXT, -- The actual code changes (diff format)

  -- Git integration
  commit_hash TEXT, -- Git commit SHA if successful
  commit_message TEXT, -- The commit message
  pr_number INTEGER, -- GitHub PR number if created
  pr_url TEXT, -- GitHub PR URL if created
  branch_name TEXT, -- Git branch name if created

  -- Notifications
  sms_sent BOOLEAN DEFAULT false, -- Was SMS notification sent?
  sms_timestamp TIMESTAMPTZ, -- When was SMS sent?
  sms_recipients JSONB, -- Array of phone numbers that received SMS

  -- Failure tracking
  failure_reason TEXT, -- Why did the fix fail?
  failure_stage TEXT, -- Which stage failed? (analysis, generation, application, commit, etc.)
  failure_stack TEXT, -- Stack trace if applicable
  retry_count INTEGER DEFAULT 0, -- Number of times this fix was retried

  -- Timing & performance
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER, -- Total duration in milliseconds
  ai_request_duration_ms INTEGER, -- Time spent on AI API request

  -- Metadata
  healer_version TEXT, -- Version of autonomous healer that created this fix
  dry_run BOOLEAN DEFAULT false, -- Was this a dry run?
  tenant_id TEXT, -- Tenant/customer identifier

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_error_id ON autonomous_fixes(error_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_status ON autonomous_fixes(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_created_at ON autonomous_fixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_tenant_id ON autonomous_fixes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_commit_hash ON autonomous_fixes(commit_hash);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_autonomous_fixes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Auto-calculate duration_ms when completed
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER autonomous_fixes_updated_at
  BEFORE UPDATE ON autonomous_fixes
  FOR EACH ROW
  EXECUTE FUNCTION update_autonomous_fixes_updated_at();

-- Create a view for analytics
CREATE OR REPLACE VIEW autonomous_fixes_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as fix_count,
  AVG(duration_ms) as avg_duration_ms,
  AVG(ai_confidence) as avg_confidence,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failure_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM autonomous_fixes
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY date DESC, status;

-- Grant permissions (adjust as needed for your setup)
-- ALTER TABLE autonomous_fixes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY autonomous_fixes_policy ON autonomous_fixes FOR ALL USING (true);

COMMENT ON TABLE autonomous_fixes IS 'Archive of all autonomous healing attempts for reporting, notifications, and analytics';
COMMENT ON COLUMN autonomous_fixes.status IS 'Current status of the fix attempt';
COMMENT ON COLUMN autonomous_fixes.ai_confidence IS 'AI confidence score (0-100) in the proposed fix';
COMMENT ON COLUMN autonomous_fixes.duration_ms IS 'Total time from start to completion in milliseconds';
COMMENT ON VIEW autonomous_fixes_analytics IS 'Daily analytics view for autonomous healing success rates and performance';
