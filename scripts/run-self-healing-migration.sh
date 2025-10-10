#!/bin/bash
# Display SQL migration for self-healing columns

echo "═══════════════════════════════════════════════════════════════════"
echo "  Self-Healing Migration SQL"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new"
echo ""
echo "───────────────────────────────────────────────────────────────────"
cat << 'EOF'

-- Add self-healing columns to autonomous_tasks table
ALTER TABLE autonomous_tasks
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS self_healed BOOLEAN DEFAULT FALSE;

-- Add index for querying failed tasks without retries
CREATE INDEX IF NOT EXISTS idx_autonomous_tasks_self_healing
  ON autonomous_tasks(status, retry_count)
  WHERE status = 'failed' AND retry_count IS NULL;

EOF
echo "───────────────────────────────────────────────────────────────────"
echo ""
echo "After running the SQL, restart the autonomous healer:"
echo "  pm2 restart autonomous-healer"
echo ""
