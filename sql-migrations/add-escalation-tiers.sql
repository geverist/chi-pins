-- Add escalation tier system columns to autonomous_tasks table
-- This enables the 3-tier escalation system:
--   Tier 1 (80-100% confidence): Auto-implement and deploy
--   Tier 2 (60-79% confidence):  Specialized agent with full codebase access → PR review
--   Tier 3 (<60% confidence):    Human guidance via SMS

ALTER TABLE autonomous_tasks
  ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalation_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier2_agent_notes TEXT;

-- Add comments explaining the columns
COMMENT ON COLUMN autonomous_tasks.tier IS 'Escalation tier: 1=auto-implement, 2=specialized agent, 3=human review';
COMMENT ON COLUMN autonomous_tasks.escalation_reason IS 'Reason for escalating to higher tier (e.g., medium/low confidence)';
COMMENT ON COLUMN autonomous_tasks.escalation_timestamp IS 'When task was escalated to Tier 2 or Tier 3';
COMMENT ON COLUMN autonomous_tasks.tier2_agent_notes IS 'Notes from Tier 2 specialized agent about implementation';

-- Create index for querying by tier
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_tier
  ON autonomous_tasks(tier, status);

-- Add new status values for tier processing
-- tier2_processing: Task is being handled by Tier 2 specialized agent
-- tier2_completed: Tier 2 agent completed and created PR
COMMENT ON COLUMN autonomous_tasks.status IS 'Task status: pending, confirmed, implementing, tier2_processing, tier2_completed, awaiting_user_input, retrying, completed, deployed, failed, cancelled';
