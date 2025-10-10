-- Rollback mechanism tables for autonomous healer
-- Tracks snapshots and rollback history for failed fixes

-- Table: rollback_snapshots
-- Stores git snapshots before applying fixes
CREATE TABLE IF NOT EXISTS rollback_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id TEXT UNIQUE NOT NULL,
  git_branch TEXT NOT NULL,
  git_commit TEXT NOT NULL,
  description TEXT NOT NULL,
  has_uncommitted_changes BOOLEAN DEFAULT false,
  uncommitted_diff TEXT,
  stash_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT rollback_snapshots_snapshot_id_unique UNIQUE (snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_rollback_snapshots_created_at ON rollback_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_snapshots_git_commit ON rollback_snapshots(git_commit);

-- Table: rollback_history
-- Tracks when and why rollbacks occurred
CREATE TABLE IF NOT EXISTS rollback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id TEXT NOT NULL REFERENCES rollback_snapshots(snapshot_id),
  rolled_back_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rolled_back_from_commit TEXT NOT NULL,
  reason TEXT NOT NULL,
  triggered_by TEXT DEFAULT 'manual', -- 'manual' | 'automatic' | 'verification_failed'
  fix_id UUID REFERENCES autonomous_fixes(id),
  metadata JSONB DEFAULT '{}',

  -- Indexes
  CONSTRAINT rollback_history_snapshot_id_fk FOREIGN KEY (snapshot_id) REFERENCES rollback_snapshots(snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_rollback_history_rolled_back_at ON rollback_history(rolled_back_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_history_snapshot_id ON rollback_history(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_rollback_history_fix_id ON rollback_history(fix_id);

-- Add rollback-related columns to autonomous_fixes table
ALTER TABLE autonomous_fixes
  ADD COLUMN IF NOT EXISTS snapshot_id TEXT REFERENCES rollback_snapshots(snapshot_id),
  ADD COLUMN IF NOT EXISTS verification_status TEXT, -- 'success' | 'failed' | 'neutral' | 'pending'
  ADD COLUMN IF NOT EXISTS verification_metrics JSONB,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rollback_snapshot_id TEXT REFERENCES rollback_snapshots(snapshot_id),
  ADD COLUMN IF NOT EXISTS rollback_reason TEXT,
  ADD COLUMN IF NOT EXISTS rollback_timestamp TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_verification_status ON autonomous_fixes(verification_status);
CREATE INDEX IF NOT EXISTS idx_autonomous_fixes_verified_at ON autonomous_fixes(verified_at DESC);

-- View: Recent rollbacks with context
CREATE OR REPLACE VIEW recent_rollbacks AS
SELECT
  rh.id,
  rh.rolled_back_at,
  rh.reason,
  rh.triggered_by,
  rs.snapshot_id,
  rs.description AS snapshot_description,
  rs.git_commit,
  rs.git_branch,
  af.error_id,
  af.status AS fix_status,
  af.ai_confidence
FROM rollback_history rh
JOIN rollback_snapshots rs ON rh.snapshot_id = rs.snapshot_id
LEFT JOIN autonomous_fixes af ON rh.fix_id = af.id
ORDER BY rh.rolled_back_at DESC;

-- View: Snapshot success rate
CREATE OR REPLACE VIEW snapshot_success_rate AS
SELECT
  DATE(rs.created_at) AS date,
  COUNT(DISTINCT rs.id) AS total_snapshots,
  COUNT(DISTINCT rh.id) AS rollbacks,
  ROUND(100.0 * COUNT(DISTINCT rh.id) / NULLIF(COUNT(DISTINCT rs.id), 0), 2) AS rollback_rate_percent
FROM rollback_snapshots rs
LEFT JOIN rollback_history rh ON rs.snapshot_id = rh.snapshot_id
GROUP BY DATE(rs.created_at)
ORDER BY date DESC;

-- RLS (Row Level Security) policies
ALTER TABLE rollback_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollback_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read snapshots
CREATE POLICY "Allow read access to rollback_snapshots" ON rollback_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to rollback_snapshots" ON rollback_snapshots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access to rollback_history" ON rollback_history
  FOR SELECT USING (true);

CREATE POLICY "Allow insert access to rollback_history" ON rollback_history
  FOR INSERT WITH CHECK (true);

-- Cleanup old snapshots (keep last 100)
-- Note: Run this periodically via cron or scheduled function
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM rollback_snapshots
  WHERE id NOT IN (
    SELECT id FROM rollback_snapshots
    ORDER BY created_at DESC
    LIMIT 100
  );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE rollback_snapshots IS 'Git snapshots taken before applying autonomous fixes';
COMMENT ON TABLE rollback_history IS 'History of rollbacks performed by the autonomous healer';
COMMENT ON COLUMN rollback_snapshots.snapshot_id IS 'Unique identifier for the snapshot (timestamp-based)';
COMMENT ON COLUMN rollback_snapshots.git_commit IS 'Git commit hash at time of snapshot';
COMMENT ON COLUMN rollback_snapshots.uncommitted_diff IS 'Git diff of uncommitted changes (if any)';
COMMENT ON COLUMN rollback_snapshots.stash_id IS 'Git stash identifier for uncommitted changes';
COMMENT ON COLUMN rollback_history.triggered_by IS 'How the rollback was initiated: manual, automatic, or verification_failed';
COMMENT ON COLUMN autonomous_fixes.verification_status IS 'Result of fix verification: success, failed, neutral, or pending';
COMMENT ON COLUMN autonomous_fixes.verification_metrics IS 'Metrics collected during fix verification (lint errors, build status, etc.)';
