-- Add self-healing columns to autonomous_tasks table
-- These columns track retry attempts and self-healing status

ALTER TABLE autonomous_tasks
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS self_healed BOOLEAN DEFAULT FALSE;

-- Add comment explaining the columns
COMMENT ON COLUMN autonomous_tasks.retry_count IS 'Number of times this task has been retried by the self-healing system';
COMMENT ON COLUMN autonomous_tasks.retry_started_at IS 'When the self-healing retry was initiated';
COMMENT ON COLUMN autonomous_tasks.self_healed IS 'Whether this task was successfully completed by the self-healing system after initial failure';

-- Create index for querying failed tasks without retries
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_self_healing
  ON autonomous_tasks(status, retry_count)
  WHERE status = 'failed' AND retry_count IS NULL;
