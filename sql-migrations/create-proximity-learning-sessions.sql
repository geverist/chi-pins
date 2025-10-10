-- Create proximity_learning_sessions table for adaptive ML learning
-- This table stores session data for training the engagement prediction model

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_proximity_learning_tenant (tenant_id),
  INDEX idx_proximity_learning_outcome (outcome),
  INDEX idx_proximity_learning_created (created_at DESC),
  INDEX idx_proximity_learning_time_patterns (tenant_id, hour_of_day, day_of_week)
);

-- Add Row Level Security (RLS)
ALTER TABLE proximity_learning_sessions ENABLE ROW LEVEL SECURITY;

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

-- Create view for learning analytics
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
  AVG(CASE WHEN feedback_was_correct = true THEN 100.0 ELSE 0 END) as accuracy_percent
FROM proximity_learning_sessions
GROUP BY tenant_id, DATE_TRUNC('day', created_at), hour_of_day, day_of_week;

COMMENT ON TABLE proximity_learning_sessions IS 'Stores proximity detection sessions for adaptive ML learning and threshold optimization';
COMMENT ON VIEW proximity_learning_analytics IS 'Aggregated analytics for proximity learning performance by time and location';
