-- COMBINED MIGRATION: Proximity Learning Sessions with Multi-Person Tracking
-- Run this entire file in Supabase SQL Editor
-- It will create the table and add per-person tracking columns

-- ============================================================================
-- PART 1: Create proximity_learning_sessions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS proximity_learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',

  -- Session input data (features for ML model)
  proximity_level INTEGER NOT NULL, -- 0-100
  intent TEXT, -- 'approaching', 'stopped', 'passing', 'ambient'
  confidence INTEGER, -- 0-100
  baseline INTEGER, -- Baseline proximity level
  threshold INTEGER, -- Threshold that was used

  -- Time-of-day patterns for environment-specific learning
  hour_of_day INTEGER, -- 0-23
  day_of_week INTEGER, -- 0-6 (Sunday=0)

  -- Action taken
  triggered_action TEXT, -- 'walkup', 'ambient', 'stare', null

  -- Session outcome (label for supervised learning)
  outcome TEXT, -- 'engaged', 'abandoned', 'converted'
  engaged_duration_ms INTEGER, -- How long they interacted
  converted BOOLEAN DEFAULT FALSE, -- Did they complete an action (pin placement, etc)
  total_duration_ms INTEGER, -- Total session duration

  -- User feedback (optional)
  feedback_was_correct BOOLEAN, -- User feedback on trigger timing

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE proximity_learning_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to proximity_learning_sessions" ON proximity_learning_sessions;
DROP POLICY IF EXISTS "Users can view their tenant's learning sessions" ON proximity_learning_sessions;
DROP POLICY IF EXISTS "Users can insert learning sessions for their tenant" ON proximity_learning_sessions;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to proximity_learning_sessions"
  ON proximity_learning_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read their tenant's sessions
CREATE POLICY "Users can view their tenant's learning sessions"
  ON proximity_learning_sessions
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM admin_settings WHERE id = 1 LIMIT 1));

-- Policy: Allow authenticated users to insert sessions for their tenant
CREATE POLICY "Users can insert learning sessions for their tenant"
  ON proximity_learning_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM admin_settings WHERE id = 1 LIMIT 1));

-- Add columns to admin_settings for adaptive learning configuration
ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS proximity_learning_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS learning_aggressiveness INTEGER DEFAULT 50, -- 1-100
ADD COLUMN IF NOT EXISTS passive_learning_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS passive_learning_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS passive_learning_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS auto_threshold_adjustment BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- PART 2: Add per-person tracking fields
-- ============================================================================

-- Add person tracking columns
ALTER TABLE proximity_learning_sessions
ADD COLUMN IF NOT EXISTS person_id TEXT, -- Unique person ID from multi-person tracker
ADD COLUMN IF NOT EXISTS is_looking_at_kiosk BOOLEAN DEFAULT NULL, -- Was person looking at kiosk?
ADD COLUMN IF NOT EXISTS head_pose_yaw INTEGER, -- Head yaw angle (-90 to +90 degrees)
ADD COLUMN IF NOT EXISTS head_pose_pitch INTEGER, -- Head pitch angle
ADD COLUMN IF NOT EXISTS head_pose_roll INTEGER, -- Head roll/tilt angle
ADD COLUMN IF NOT EXISTS gaze_confidence REAL, -- Confidence of gaze detection (0-1)
ADD COLUMN IF NOT EXISTS distance_score INTEGER, -- 0-100 distance from kiosk
ADD COLUMN IF NOT EXISTS trajectory_data JSONB, -- Movement trajectory: [{x, y, timestamp, distance}]
ADD COLUMN IF NOT EXISTS velocity_x REAL, -- Horizontal velocity
ADD COLUMN IF NOT EXISTS velocity_y REAL; -- Vertical velocity

-- ============================================================================
-- PART 3: Create indexes
-- ============================================================================

-- Base indexes
CREATE INDEX IF NOT EXISTS idx_proximity_learning_tenant ON proximity_learning_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proximity_learning_outcome ON proximity_learning_sessions(outcome);
CREATE INDEX IF NOT EXISTS idx_proximity_learning_created ON proximity_learning_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proximity_learning_time_patterns ON proximity_learning_sessions(tenant_id, hour_of_day, day_of_week);

-- Per-person tracking indexes
CREATE INDEX IF NOT EXISTS idx_proximity_learning_person ON proximity_learning_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_proximity_learning_gaze ON proximity_learning_sessions(tenant_id, is_looking_at_kiosk) WHERE is_looking_at_kiosk IS NOT NULL;

-- ============================================================================
-- PART 4: Create analytics view
-- ============================================================================

CREATE OR REPLACE VIEW proximity_learning_analytics AS
SELECT
  tenant_id,
  DATE_TRUNC('day', created_at) as date,
  hour_of_day,
  day_of_week,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN outcome = 'engaged' THEN 1 END) as engaged_count,
  COUNT(CASE WHEN outcome = 'abandoned' THEN 1 END) as abandoned_count,
  COUNT(CASE WHEN outcome = 'converted' THEN 1 END) as converted_count,
  AVG(proximity_level) as avg_proximity,
  AVG(engaged_duration_ms) as avg_engagement_duration,
  AVG(CASE WHEN feedback_was_correct = true THEN 100.0 ELSE 0 END) as accuracy_percent,
  -- Gaze metrics
  COUNT(CASE WHEN is_looking_at_kiosk = true THEN 1 END) as looking_at_kiosk_count,
  COUNT(CASE WHEN is_looking_at_kiosk = false THEN 1 END) as looking_away_count,
  AVG(CASE WHEN is_looking_at_kiosk = true AND outcome = 'engaged' THEN 100.0 ELSE 0 END) as engagement_rate_when_looking,
  AVG(CASE WHEN is_looking_at_kiosk = false AND outcome = 'engaged' THEN 100.0 ELSE 0 END) as engagement_rate_when_not_looking,
  AVG(distance_score) as avg_distance_score,
  COUNT(DISTINCT person_id) as unique_people_count
FROM proximity_learning_sessions
GROUP BY tenant_id, DATE_TRUNC('day', created_at), hour_of_day, day_of_week;

-- ============================================================================
-- PART 5: Add comments
-- ============================================================================

COMMENT ON TABLE proximity_learning_sessions IS 'Stores proximity detection sessions for adaptive ML learning with multi-person tracking and gaze detection';
COMMENT ON VIEW proximity_learning_analytics IS 'Aggregated analytics including gaze metrics and multi-person tracking';

COMMENT ON COLUMN proximity_learning_sessions.person_id IS 'Unique ID from multi-person tracker (person-1, person-2, etc)';
COMMENT ON COLUMN proximity_learning_sessions.is_looking_at_kiosk IS 'True if person was facing/looking at the kiosk (head pose within threshold)';
COMMENT ON COLUMN proximity_learning_sessions.trajectory_data IS 'JSON array of movement data: [{x, y, timestamp, distance}]';
COMMENT ON COLUMN proximity_learning_sessions.head_pose_yaw IS 'Head yaw angle: -90 (looking left) to +90 (looking right)';
COMMENT ON COLUMN proximity_learning_sessions.head_pose_pitch IS 'Head pitch angle: negative (looking down) to positive (looking up)';
COMMENT ON COLUMN proximity_learning_sessions.head_pose_roll IS 'Head roll/tilt angle';

-- Done!
SELECT 'Migration completed successfully! ✅' as status;
