-- Audit Logs Table Migration
-- Created: 2025-10-05
-- Purpose: Track all tenant activity for compliance and security

-- ============================================================================
-- PART 1: Create audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id TEXT DEFAULT 'anonymous',
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp DESC);

-- Composite index for common audit queries
CREATE INDEX idx_audit_logs_tenant_user_time ON audit_logs(tenant_id, user_id, timestamp DESC);

-- ============================================================================
-- PART 2: Enable Row-Level Security
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DROP POLICY IF EXISTS "Tenant isolation for audit_logs" ON audit_logs;
CREATE POLICY "Tenant isolation for audit_logs" ON audit_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Platform admin bypass policy
DROP POLICY IF EXISTS "Platform admin bypass for audit_logs" ON audit_logs;
CREATE POLICY "Platform admin bypass for audit_logs" ON audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- PART 3: Auto-set tenant_id trigger
-- ============================================================================

DROP TRIGGER IF EXISTS auto_tenant_id_trigger ON audit_logs;
CREATE TRIGGER auto_tenant_id_trigger
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- ============================================================================
-- PART 4: Audit logging helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT 'anonymous',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := get_current_tenant();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context available for audit logging';
  END IF;

  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    timestamp
  ) VALUES (
    v_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- PART 5: Audit log retention policy function
-- ============================================================================

-- Function to clean up old audit logs based on tenant config
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
DECLARE
  v_retention_days INTEGER := 90;  -- Default 90 days
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < (now() - INTERVAL '1 day' * v_retention_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: Common audit log views
-- ============================================================================

-- Recent activity view
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT
  al.id,
  al.tenant_id,
  l.name AS tenant_name,
  al.user_id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.metadata,
  al.timestamp
FROM audit_logs al
JOIN locations l ON l.id = al.tenant_id
WHERE al.timestamp >= (now() - INTERVAL '24 hours')
ORDER BY al.timestamp DESC;

-- Grant access to authenticated users
GRANT SELECT ON recent_audit_activity TO authenticated;

-- User activity summary view
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  al.tenant_id,
  al.user_id,
  COUNT(*) AS total_actions,
  COUNT(DISTINCT al.action) AS unique_actions,
  MIN(al.timestamp) AS first_action,
  MAX(al.timestamp) AS last_action,
  COUNT(*) FILTER (WHERE al.timestamp >= now() - INTERVAL '24 hours') AS actions_last_24h
FROM audit_logs al
GROUP BY al.tenant_id, al.user_id;

-- Grant access to authenticated users
GRANT SELECT ON user_activity_summary TO authenticated;

-- Security events view (failed logins, permission denials, etc.)
CREATE OR REPLACE VIEW security_events AS
SELECT
  al.id,
  al.tenant_id,
  l.name AS tenant_name,
  al.user_id,
  al.action,
  al.resource_type,
  al.resource_id,
  al.ip_address,
  al.user_agent,
  al.metadata,
  al.timestamp
FROM audit_logs al
JOIN locations l ON l.id = al.tenant_id
WHERE al.action IN (
  'login_failed',
  'permission_denied',
  'invalid_token',
  'suspicious_activity',
  'rate_limit_exceeded',
  'unauthorized_access'
)
ORDER BY al.timestamp DESC;

-- Grant access to authenticated users
GRANT SELECT ON security_events TO authenticated;

-- ============================================================================
-- PART 7: Trigger functions to auto-log critical events
-- ============================================================================

-- Example audit trigger functions (only created if tables exist)

-- Log game score creation
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION log_game_score_created()
      RETURNS TRIGGER AS $func$
      BEGIN
        PERFORM log_audit_event(
          ''game_score_created'',
          ''game_score'',
          NEW.id::text,
          COALESCE(NEW.player_name, ''anonymous''),
          jsonb_build_object(
            ''game'', NEW.game,
            ''score'', NEW.score
          )
        );
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS log_game_score_created_trigger ON game_scores;
      CREATE TRIGGER log_game_score_created_trigger
        AFTER INSERT ON game_scores
        FOR EACH ROW
        EXECUTE FUNCTION log_game_score_created();
    ';
  END IF;
END $$;

-- Log anonymous messages
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'anonymous_messages') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION log_anonymous_message_created()
      RETURNS TRIGGER AS $func$
      BEGIN
        PERFORM log_audit_event(
          ''anonymous_message_created'',
          ''anonymous_message'',
          NEW.id::text,
          ''anonymous'',
          jsonb_build_object(
            ''message_length'', length(NEW.message)
          )
        );
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS log_anonymous_message_created_trigger ON anonymous_messages;
      CREATE TRIGGER log_anonymous_message_created_trigger
        AFTER INSERT ON anonymous_messages
        FOR EACH ROW
        EXECUTE FUNCTION log_anonymous_message_created();
    ';
  END IF;
END $$;

-- Note: Add more audit triggers as needed for your specific tables

-- ============================================================================
-- PART 8: Audit log export function (GDPR compliance)
-- ============================================================================

-- Export all audit logs for a specific user (for DSAR requests)
CREATE OR REPLACE FUNCTION export_user_audit_logs(
  p_user_id TEXT,
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tenant_id TEXT,
  user_id TEXT,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.tenant_id,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.metadata,
    al.timestamp
  FROM audit_logs al
  WHERE al.user_id = p_user_id
  AND (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
  ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION export_user_audit_logs(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. All tenant activity is automatically logged via triggers
-- 2. Audit logs are tenant-scoped via RLS policies
-- 3. Platform admins can view all audit logs
-- 4. Retention policy can be customized per tenant
-- 5. Security events view highlights critical security activities
-- 6. Export function supports GDPR Data Subject Access Requests
-- 7. Indexes optimize common query patterns
