-- Add per-person tracking fields to proximity_learning_sessions
-- Enables tracking of multiple people simultaneously with gaze detection

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

-- Add index for person_id queries
CREATE INDEX IF NOT EXISTS idx_proximity_learning_person ON proximity_learning_sessions(person_id);

-- Add index for gaze analysis
CREATE INDEX IF NOT EXISTS idx_proximity_learning_gaze ON proximity_learning_sessions(tenant_id, is_looking_at_kiosk) WHERE is_looking_at_kiosk IS NOT NULL;

-- Update analytics view to include gaze metrics
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
  -- New gaze metrics
  COUNT(CASE WHEN is_looking_at_kiosk = true THEN 1 END) as looking_at_kiosk_count,
  COUNT(CASE WHEN is_looking_at_kiosk = false THEN 1 END) as looking_away_count,
  AVG(CASE WHEN is_looking_at_kiosk = true AND outcome = 'engaged' THEN 100.0 ELSE 0 END) as engagement_rate_when_looking,
  AVG(CASE WHEN is_looking_at_kiosk = false AND outcome = 'engaged' THEN 100.0 ELSE 0 END) as engagement_rate_when_not_looking,
  AVG(distance_score) as avg_distance_score,
  COUNT(DISTINCT person_id) as unique_people_count
FROM proximity_learning_sessions
GROUP BY tenant_id, DATE_TRUNC('day', created_at), hour_of_day, day_of_week;

COMMENT ON COLUMN proximity_learning_sessions.person_id IS 'Unique ID from multi-person tracker (person-1, person-2, etc)';
COMMENT ON COLUMN proximity_learning_sessions.is_looking_at_kiosk IS 'True if person was facing/looking at the kiosk (head pose within threshold)';
COMMENT ON COLUMN proximity_learning_sessions.trajectory_data IS 'JSON array of movement data: [{x, y, timestamp, distance}]';
COMMENT ON VIEW proximity_learning_analytics IS 'Aggregated analytics including gaze metrics and multi-person tracking';
