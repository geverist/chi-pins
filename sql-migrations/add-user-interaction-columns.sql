-- Add user interaction columns to autonomous_tasks table
-- These columns enable the system to prompt users for guidance when confidence is low

ALTER TABLE autonomous_tasks
  ADD COLUMN IF NOT EXISTS user_prompt TEXT,
  ADD COLUMN IF NOT EXISTS user_response TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Add comments explaining the columns
COMMENT ON COLUMN autonomous_tasks.user_prompt IS 'SMS prompt sent to user requesting guidance when confidence is low';
COMMENT ON COLUMN autonomous_tasks.user_response IS 'User response with guidance/hints or CANCEL to skip task';
COMMENT ON COLUMN autonomous_tasks.ai_analysis IS 'JSON storage of AI analysis for context preservation (failure_analysis, correction_strategy, confidence, found_files)';

-- Create index for querying tasks awaiting user response
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_user_response
  ON autonomous_tasks(status)
  WHERE status = 'awaiting_user_input' AND user_response IS NOT NULL;
