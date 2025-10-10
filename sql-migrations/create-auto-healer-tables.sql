-- sql-migrations/create-auto-healer-tables.sql
-- Database tables for auto-healing system

-- Error log table (stores all errors from webhook-processor)
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  level TEXT NOT NULL,  -- 'error', 'warn', 'info', 'log'
  severity TEXT NOT NULL,  -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  source TEXT,  -- 'chi-pins-kiosk', etc.
  tenant_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB,

  -- Auto-healer fields
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  auto_fix_success BOOLEAN,
  auto_fix_details JSONB,
  auto_fix_timestamp TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_log_timestamp ON error_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_severity ON error_log(severity);
CREATE INDEX IF NOT EXISTS idx_error_log_auto_fix ON error_log(auto_fix_attempted) WHERE auto_fix_attempted IS NULL;
CREATE INDEX IF NOT EXISTS idx_error_log_tenant ON error_log(tenant_id);

-- Auto-fix requests table (tracks fix attempts)
CREATE TABLE IF NOT EXISTS auto_fix_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fix_id TEXT UNIQUE NOT NULL,
  error_details JSONB NOT NULL,
  source TEXT,
  tenant_id TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed'
  fix_prompt TEXT,
  fix_applied TEXT,  -- Description of the fix
  commit_hash TEXT,  -- Git commit hash if fix was committed
  deploy_url TEXT,   -- Vercel deployment URL

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  success BOOLEAN,
  error_message TEXT,
  verification_status TEXT  -- 'verified', 'failed', 'pending'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_fix_requests_status ON auto_fix_requests(status);
CREATE INDEX IF NOT EXISTS idx_auto_fix_requests_created ON auto_fix_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_fix_requests_fix_id ON auto_fix_requests(fix_id);

-- Error patterns table (learns common errors)
CREATE TABLE IF NOT EXISTS error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  error_type TEXT NOT NULL,  -- 'NULL_REFERENCE', 'TYPE_ERROR', etc.
  occurrences INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  auto_fix_success_rate DECIMAL,
  fix_strategy JSONB,  -- Store the fix strategy that worked

  UNIQUE(pattern, error_type)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_error_patterns_type ON error_patterns(error_type);
CREATE INDEX IF NOT EXISTS idx_error_patterns_occurrences ON error_patterns(occurrences DESC);

-- System health log (tracks overall system health)
CREATE TABLE IF NOT EXISTS system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,  -- 'healthy', 'degraded', 'unhealthy'
  checks JSONB NOT NULL,  -- All health check results
  response_time_ms INTEGER,
  errors_last_hour INTEGER,
  auto_fixes_last_hour INTEGER,
  deployment_version TEXT
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_health_log_timestamp ON system_health_log(timestamp DESC);

-- Create view for error dashboard
CREATE OR REPLACE VIEW error_dashboard AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  severity,
  COUNT(*) as error_count,
  COUNT(CASE WHEN auto_fix_attempted THEN 1 END) as fix_attempts,
  COUNT(CASE WHEN auto_fix_success THEN 1 END) as fix_successes
FROM error_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour, severity
ORDER BY hour DESC, severity;

-- Enable Row Level Security (RLS)
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_fix_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_log ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - tighten in production)
CREATE POLICY "Allow all operations on error_log" ON error_log FOR ALL USING (true);
CREATE POLICY "Allow all operations on auto_fix_requests" ON auto_fix_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on error_patterns" ON error_patterns FOR ALL USING (true);
CREATE POLICY "Allow all operations on system_health_log" ON system_health_log FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON error_log TO anon, authenticated;
GRANT ALL ON auto_fix_requests TO anon, authenticated;
GRANT ALL ON error_patterns TO anon, authenticated;
GRANT ALL ON system_health_log TO anon, authenticated;
GRANT SELECT ON error_dashboard TO anon, authenticated;
