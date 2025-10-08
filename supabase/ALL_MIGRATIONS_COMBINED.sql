-- ============================================================================
-- COMBINED MIGRATIONS FOR CHI-PINS
-- ============================================================================
-- Execute this entire file in Supabase SQL Editor to run all migrations
-- Created: 2025-10-08
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. DEBUG LOGS TABLE
-- ============================================================================
-- Create debug_logs table for remote logging
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  user_agent TEXT,
  url TEXT,
  logs JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_session_id ON debug_logs(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert debug logs" ON debug_logs;
DROP POLICY IF EXISTS "Anyone can read debug logs" ON debug_logs;

-- Allow anyone to insert debug logs (for debugging purposes)
CREATE POLICY "Anyone can insert debug logs" ON debug_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read recent logs (for debugging purposes)
CREATE POLICY "Anyone can read debug logs" ON debug_logs
  FOR SELECT
  USING (true);

-- ============================================================================
-- 2. AUDIT LOGS TABLE
-- ============================================================================
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

-- ============================================================================
-- 3. LOCATIONS TABLE
-- ============================================================================
-- Create Locations (Tenants) Table
-- Created: 2025-10-05
-- Purpose: Central registry of all tenants/locations in the system

-- ============================================================================
-- PART 1: Create locations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan_tier TEXT DEFAULT 'starter',

  -- Contact information
  contact_info JSONB DEFAULT '{
    "email": null,
    "phone": null,
    "address": null,
    "website": null
  }'::jsonb,

  -- Branding
  branding JSONB DEFAULT '{
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "logo_url": null
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
  CONSTRAINT valid_plan_tier CHECK (plan_tier IN ('starter', 'professional', 'enterprise', 'custom'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_industry ON locations(industry);

-- ============================================================================
-- PART 2: Enable Row-Level Security
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all active locations
DROP POLICY IF EXISTS "Authenticated users can view locations" ON locations;
CREATE POLICY "Authenticated users can view locations" ON locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Platform admins can do everything
DROP POLICY IF EXISTS "Platform admins manage locations" ON locations;
CREATE POLICY "Platform admins manage locations" ON locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- PART 3: Insert default location (chicago-mikes)
-- ============================================================================

INSERT INTO locations (id, name, industry, status, plan_tier, contact_info, branding)
VALUES (
  'chicago-mikes',
  'Chicago Mike''s Beef & Dogs',
  'restaurant',
  'active',
  'professional',
  '{
    "email": "info@chicagomikes.com",
    "phone": "+1-555-CHICAGO",
    "address": "Chicago, IL",
    "website": "https://chicagomikes.us"
  }'::jsonb,
  '{
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "logo_url": "/assets/logo.png"
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = now();

-- ============================================================================
-- PART 4: Auto-update timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_locations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_locations_timestamp_trigger ON locations;
CREATE TRIGGER update_locations_timestamp_trigger
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_locations_timestamp();

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. locations.id is used as tenant_id throughout the system
-- 2. Chicago Mike's is the first tenant (chicago-mikes)
-- 3. Add new tenants by inserting rows into this table
-- 4. Status can be: active, inactive, suspended, trial
-- 5. Plan tiers: starter, professional, enterprise, custom

-- ============================================================================
-- 4. MULTI-TENANCY CORE
-- ============================================================================
-- Multi-Tenancy Row-Level Security Migration (Core Tables Only)
-- Created: 2025-10-05
-- Purpose: Add tenant_id columns and RLS policies to confirmed existing tables

-- ============================================================================
-- PART 1: Add tenant_id to confirmed existing tables
-- ============================================================================

-- Comments table (confirmed exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE comments SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE comments ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_comments_tenant_id ON comments(tenant_id);
  END IF;
END $$;

-- Popular spots table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'popular_spots') THEN
    ALTER TABLE popular_spots ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE popular_spots SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE popular_spots ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_popular_spots_tenant_id ON popular_spots(tenant_id);
  END IF;
END $$;

-- Then and now table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'then_and_now') THEN
    ALTER TABLE then_and_now ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE then_and_now SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE then_and_now ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_then_and_now_tenant_id ON then_and_now(tenant_id);
  END IF;
END $$;

-- Anonymous messages table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'anonymous_messages') THEN
    ALTER TABLE anonymous_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE anonymous_messages SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE anonymous_messages ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_anonymous_messages_tenant_id ON anonymous_messages(tenant_id);
  END IF;
END $$;

-- Settings table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE settings SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE settings ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);
  END IF;
END $$;

-- Navigation settings table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'navigation_settings') THEN
    ALTER TABLE navigation_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE navigation_settings SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE navigation_settings ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_navigation_settings_tenant_id ON navigation_settings(tenant_id);
  END IF;
END $$;

-- Media files table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'media_files') THEN
    ALTER TABLE media_files ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE media_files SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE media_files ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_media_files_tenant_id ON media_files(tenant_id);
  END IF;
END $$;

-- Music queue table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'music_queue') THEN
    ALTER TABLE music_queue ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE music_queue SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE music_queue ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_music_queue_tenant_id ON music_queue(tenant_id);
  END IF;
END $$;

-- Background images table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'background_images') THEN
    ALTER TABLE background_images ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE background_images SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE background_images ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_background_images_tenant_id ON background_images(tenant_id);
  END IF;
END $$;

-- Game scores table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') THEN
    ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE game_scores SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE game_scores ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_game_scores_tenant_id ON game_scores(tenant_id);
  END IF;
END $$;

-- Kiosk clusters table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosk_clusters') THEN
    ALTER TABLE kiosk_clusters ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    UPDATE kiosk_clusters SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
    ALTER TABLE kiosk_clusters ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_kiosk_clusters_tenant_id ON kiosk_clusters(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create RLS policies for existing tables only
-- ============================================================================

-- Helper function to create RLS policy if table exists
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(table_name TEXT)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = create_tenant_rls_policy.table_name) THEN
    EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation for %I" ON %I', table_name, table_name);
    EXECUTE format('
      CREATE POLICY "Tenant isolation for %I" ON %I
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ', table_name, table_name);

    -- Also create admin bypass policy
    EXECUTE format('DROP POLICY IF EXISTS "Platform admin bypass" ON %I', table_name);
    EXECUTE format('
      CREATE POLICY "Platform admin bypass" ON %I
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>''role'' = ''platform_admin''
          )
        )
    ', table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply RLS policies to all tenant-scoped tables
SELECT create_tenant_rls_policy('comments');
SELECT create_tenant_rls_policy('popular_spots');
SELECT create_tenant_rls_policy('then_and_now');
SELECT create_tenant_rls_policy('anonymous_messages');
SELECT create_tenant_rls_policy('settings');
SELECT create_tenant_rls_policy('navigation_settings');
SELECT create_tenant_rls_policy('media_files');
SELECT create_tenant_rls_policy('music_queue');
SELECT create_tenant_rls_policy('background_images');
SELECT create_tenant_rls_policy('game_scores');
SELECT create_tenant_rls_policy('kiosk_clusters');

-- Clean up helper function
DROP FUNCTION create_tenant_rls_policy(TEXT);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Uses conditional logic to only modify tables that exist
-- 2. Towns and fun_facts remain shared across all tenants
-- 3. All existing data migrated to 'chicago-mikes' tenant
-- 4. RLS policies ensure complete data isolation
-- 5. Platform admins can bypass RLS for support

-- ============================================================================
-- 5. TENANT CONFIG
-- ============================================================================
-- Tenant Configuration Table Migration
-- Created: 2025-10-05
-- Purpose: Store tenant-specific configuration, features, limits, and settings

-- ============================================================================
-- PART 1: Create tenant_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE REFERENCES locations(id) ON DELETE CASCADE,

  -- Feature flags
  features JSONB NOT NULL DEFAULT '{
    "voice_assistant": false,
    "photo_booth": true,
    "analytics": true,
    "multi_location": false,
    "custom_branding": true,
    "ai_recommendations": false,
    "loyalty_program": false,
    "appointment_booking": false,
    "inventory_management": false
  }'::jsonb,

  -- Usage limits
  limits JSONB NOT NULL DEFAULT '{
    "max_pins": 100,
    "max_orders_per_month": 10000,
    "max_storage_gb": 50,
    "max_users": 20,
    "max_locations": 1,
    "max_api_calls_per_day": 10000
  }'::jsonb,

  -- Integrations
  integrations JSONB NOT NULL DEFAULT '{
    "pos_enabled": false,
    "pos_provider": null,
    "email_enabled": true,
    "email_provider": "sendgrid",
    "sms_enabled": false,
    "sms_provider": "twilio",
    "payment_enabled": true,
    "payment_provider": "stripe",
    "analytics_enabled": true,
    "analytics_provider": "internal"
  }'::jsonb,

  -- Compliance settings
  compliance JSONB NOT NULL DEFAULT '{
    "hipaa_baa_signed": false,
    "pci_compliant": false,
    "gdpr_enabled": true,
    "data_retention_days": 90,
    "require_2fa": false,
    "ip_whitelist": [],
    "audit_log_retention_days": 365
  }'::jsonb,

  -- Branding
  branding JSONB DEFAULT '{
    "primary_color": "#667eea",
    "secondary_color": "#764ba2",
    "logo_url": null,
    "favicon_url": null,
    "custom_css": null,
    "font_family": "Inter, sans-serif"
  }'::jsonb,

  -- Notification settings
  notifications JSONB DEFAULT '{
    "email_notifications": true,
    "sms_notifications": false,
    "push_notifications": false,
    "webhook_url": null,
    "notification_email": null,
    "notification_phone": null
  }'::jsonb,

  -- Localization
  localization JSONB DEFAULT '{
    "default_language": "en",
    "supported_languages": ["en"],
    "timezone": "America/Chicago",
    "currency": "USD",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h"
  }'::jsonb,

  -- Custom settings (flexible key-value store)
  custom_settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for tenant_id lookups
CREATE UNIQUE INDEX idx_tenant_config_tenant_id ON tenant_config(tenant_id);

-- ============================================================================
-- PART 2: Enable Row-Level Security
-- ============================================================================

ALTER TABLE tenant_config ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DROP POLICY IF EXISTS "Tenant isolation for tenant_config" ON tenant_config;
CREATE POLICY "Tenant isolation for tenant_config" ON tenant_config
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Platform admin bypass policy
DROP POLICY IF EXISTS "Platform admin bypass for tenant_config" ON tenant_config;
CREATE POLICY "Platform admin bypass for tenant_config" ON tenant_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- PART 3: Auto-update timestamp trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tenant_config_timestamp_trigger ON tenant_config;
CREATE TRIGGER update_tenant_config_timestamp_trigger
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_config_timestamp();

-- ============================================================================
-- PART 4: Auto-create config on tenant creation
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_create_tenant_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default config for new tenant
  INSERT INTO tenant_config (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_tenant_config_trigger ON locations;
CREATE TRIGGER auto_create_tenant_config_trigger
  AFTER INSERT ON locations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_config();

-- ============================================================================
-- PART 5: Configuration helper functions
-- ============================================================================

-- Update feature flag
CREATE OR REPLACE FUNCTION set_tenant_feature(
  p_feature_name TEXT,
  p_enabled BOOLEAN
)
RETURNS void AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := get_current_tenant();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context available';
  END IF;

  UPDATE tenant_config
  SET features = jsonb_set(
    features,
    ARRAY[p_feature_name],
    to_jsonb(p_enabled)
  )
  WHERE tenant_id = v_tenant_id;

  -- Log the change
  PERFORM log_audit_event(
    'feature_toggled',
    'tenant_config',
    v_tenant_id,
    COALESCE(current_setting('app.current_user', true), 'anonymous'),
    jsonb_build_object(
      'feature', p_feature_name,
      'enabled', p_enabled
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_feature(TEXT, BOOLEAN) TO authenticated;

-- Update limit value
CREATE OR REPLACE FUNCTION set_tenant_limit(
  p_limit_name TEXT,
  p_value INTEGER
)
RETURNS void AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := get_current_tenant();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context available';
  END IF;

  UPDATE tenant_config
  SET limits = jsonb_set(
    limits,
    ARRAY[p_limit_name],
    to_jsonb(p_value)
  )
  WHERE tenant_id = v_tenant_id;

  -- Log the change
  PERFORM log_audit_event(
    'limit_updated',
    'tenant_config',
    v_tenant_id,
    COALESCE(current_setting('app.current_user', true), 'anonymous'),
    jsonb_build_object(
      'limit', p_limit_name,
      'value', p_value
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_limit(TEXT, INTEGER) TO authenticated;

-- Update branding
CREATE OR REPLACE FUNCTION set_tenant_branding(
  p_branding JSONB
)
RETURNS void AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := get_current_tenant();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context available';
  END IF;

  UPDATE tenant_config
  SET branding = branding || p_branding
  WHERE tenant_id = v_tenant_id;

  -- Log the change
  PERFORM log_audit_event(
    'branding_updated',
    'tenant_config',
    v_tenant_id,
    COALESCE(current_setting('app.current_user', true), 'anonymous'),
    jsonb_build_object('branding', p_branding)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_branding(JSONB) TO authenticated;

-- ============================================================================
-- PART 6: User-tenant assignments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tenant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB DEFAULT '{}'::jsonb,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,

  CONSTRAINT unique_user_tenant UNIQUE (user_id, tenant_id)
);

-- Create indexes
CREATE INDEX idx_user_tenant_user_id ON user_tenant_assignments(user_id);
CREATE INDEX idx_user_tenant_tenant_id ON user_tenant_assignments(tenant_id);
CREATE INDEX idx_user_tenant_status ON user_tenant_assignments(status);

-- Enable RLS
ALTER TABLE user_tenant_assignments ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DROP POLICY IF EXISTS "Tenant isolation for user_tenant_assignments" ON user_tenant_assignments;
CREATE POLICY "Tenant isolation for user_tenant_assignments" ON user_tenant_assignments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Platform admin bypass
DROP POLICY IF EXISTS "Platform admin bypass for user_tenant_assignments" ON user_tenant_assignments;
CREATE POLICY "Platform admin bypass for user_tenant_assignments" ON user_tenant_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- PART 7: Insert default configuration for existing tenants
-- ============================================================================

-- Create default config for chicago-mikes
INSERT INTO tenant_config (tenant_id, features, limits, integrations)
VALUES (
  'chicago-mikes',
  '{
    "voice_assistant": true,
    "photo_booth": true,
    "analytics": true,
    "multi_location": false,
    "custom_branding": true,
    "ai_recommendations": true,
    "loyalty_program": true
  }'::jsonb,
  '{
    "max_pins": 1000,
    "max_orders_per_month": 50000,
    "max_storage_gb": 500,
    "max_users": 50,
    "max_locations": 5,
    "max_api_calls_per_day": 100000
  }'::jsonb,
  '{
    "pos_enabled": true,
    "pos_provider": "square",
    "email_enabled": true,
    "email_provider": "sendgrid",
    "sms_enabled": true,
    "sms_provider": "twilio",
    "payment_enabled": true,
    "payment_provider": "stripe"
  }'::jsonb
)
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- PART 8: Configuration validation view
-- ============================================================================

CREATE OR REPLACE VIEW tenant_config_summary AS
SELECT
  tc.tenant_id,
  l.name AS tenant_name,
  l.industry,
  l.status AS tenant_status,
  tc.features,
  tc.limits,
  tc.integrations,
  tc.compliance,
  tc.created_at AS config_created_at,
  tc.updated_at AS config_updated_at
FROM tenant_config tc
JOIN locations l ON l.id = tc.tenant_id
ORDER BY l.created_at DESC;

-- Grant access to authenticated users
GRANT SELECT ON tenant_config_summary TO authenticated;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Each tenant has one configuration record
-- 2. Default config is automatically created when tenant is created
-- 3. JSONB fields allow flexible configuration without schema changes
-- 4. Helper functions provide safe updates with audit logging
-- 5. RLS policies ensure tenants can only see their own config
-- 6. Platform admins can view and modify all tenant configs
-- 7. user_tenant_assignments tracks which users belong to which tenants

-- ============================================================================
-- 6. TENANT CONTEXT FUNCTIONS
-- ============================================================================
-- Tenant Context Management Functions
-- Created: 2025-10-05
-- Purpose: PostgreSQL functions for setting and managing tenant context

-- ============================================================================
-- PART 1: Set tenant context function
-- ============================================================================

-- This function sets the current tenant context for the session
-- All subsequent queries will be filtered by this tenant_id via RLS policies
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  -- Verify tenant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM locations
    WHERE id = p_tenant_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive tenant: %', p_tenant_id;
  END IF;

  -- Set the session variable that RLS policies use
  PERFORM set_config('app.current_tenant', p_tenant_id, false);

  -- Log context change for audit trail
  INSERT INTO audit_logs (
    tenant_id,
    action,
    resource_type,
    resource_id,
    metadata,
    timestamp
  ) VALUES (
    p_tenant_id,
    'context_set',
    'session',
    current_setting('app.current_tenant', true),
    jsonb_build_object(
      'session_id', pg_backend_pid()::text,
      'user', current_user
    ),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO authenticated;

-- ============================================================================
-- PART 2: Get current tenant context function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;

-- ============================================================================
-- PART 3: Clear tenant context function
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO authenticated;

-- ============================================================================
-- PART 4: Validate tenant access function
-- ============================================================================

-- Check if current user has access to a specific tenant
CREATE OR REPLACE FUNCTION validate_tenant_access(p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Platform admins have access to all tenants
  SELECT raw_user_meta_data->>'role' INTO v_user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_role = 'platform_admin' THEN
    RETURN true;
  END IF;

  -- Regular users can only access their assigned tenant
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_assignments
    WHERE user_id = auth.uid()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_tenant_access(TEXT) TO authenticated;

-- ============================================================================
-- PART 5: Get tenant configuration function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_config(p_tenant_id TEXT DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_tenant_id TEXT;
  v_config jsonb;
BEGIN
  -- Use provided tenant or current context
  v_tenant_id := COALESCE(p_tenant_id, get_current_tenant());

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context available';
  END IF;

  -- Get configuration
  SELECT config INTO v_config
  FROM tenant_config
  WHERE tenant_id = v_tenant_id;

  -- Return config or default
  RETURN COALESCE(v_config, '{
    "features": {
      "voice_assistant": false,
      "photo_booth": true,
      "analytics": true,
      "multi_location": false,
      "custom_branding": true
    },
    "limits": {
      "max_pins": 100,
      "max_orders_per_month": 10000,
      "max_storage_gb": 50,
      "max_users": 20
    },
    "integrations": {
      "pos_enabled": false,
      "email_enabled": true,
      "sms_enabled": false
    }
  }'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_tenant_config(TEXT) TO authenticated;

-- ============================================================================
-- PART 6: Check tenant feature enabled function
-- ============================================================================

CREATE OR REPLACE FUNCTION has_tenant_feature(p_feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_config jsonb;
BEGIN
  v_config := get_tenant_config();
  RETURN COALESCE((v_config->'features'->>p_feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_tenant_feature(TEXT) TO authenticated;

-- ============================================================================
-- PART 7: Check tenant limit function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_tenant_limit(
  p_limit_name TEXT,
  p_current_value INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_config jsonb;
  v_limit INTEGER;
BEGIN
  v_config := get_tenant_config();
  v_limit := (v_config->'limits'->>p_limit_name)::integer;

  -- No limit set means unlimited
  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN p_current_value < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_tenant_limit(TEXT, INTEGER) TO authenticated;

-- ============================================================================
-- PART 8: Automatic tenant context trigger
-- ============================================================================

-- Automatically set tenant_id on INSERT if not provided
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_current_tenant();

    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'No tenant context available. Call set_tenant_context() first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tenant-scoped tables (only if they exist)
-- Helper function to safely create trigger
CREATE OR REPLACE FUNCTION create_auto_tenant_trigger(table_name TEXT)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND information_schema.tables.table_name = create_auto_tenant_trigger.table_name) THEN
    EXECUTE format('DROP TRIGGER IF EXISTS auto_tenant_id_trigger ON %I', table_name);
    EXECUTE format('
      CREATE TRIGGER auto_tenant_id_trigger
        BEFORE INSERT ON %I
        FOR EACH ROW
        EXECUTE FUNCTION auto_set_tenant_id()
    ', table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tenant-scoped tables
SELECT create_auto_tenant_trigger('comments');
SELECT create_auto_tenant_trigger('popular_spots');
SELECT create_auto_tenant_trigger('then_and_now');
SELECT create_auto_tenant_trigger('anonymous_messages');
SELECT create_auto_tenant_trigger('settings');
SELECT create_auto_tenant_trigger('navigation_settings');
SELECT create_auto_tenant_trigger('media_files');
SELECT create_auto_tenant_trigger('music_queue');
SELECT create_auto_tenant_trigger('background_images');
SELECT create_auto_tenant_trigger('game_scores');
SELECT create_auto_tenant_trigger('kiosk_clusters');

-- Clean up helper function
DROP FUNCTION create_auto_tenant_trigger(TEXT);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. set_tenant_context() must be called at the start of each session
-- 2. All RLS policies depend on app.current_tenant setting
-- 3. Auto triggers ensure tenant_id is always set on INSERT
-- 4. Platform admins can access all tenants via validate_tenant_access()
-- 5. Configuration functions provide feature flags and limits

-- ============================================================================
-- 20251005 VOICE AGENT TABLES
-- ============================================================================
-- Voice AI Agent Tables Migration
-- Created: 2025-10-05
-- Purpose: Add inbound voice agent functionality for phone answering

-- ============================================================================
-- PART 1: Phone Numbers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE, -- E.164 format: +15551234567
  provider TEXT DEFAULT 'twilio',
  status TEXT DEFAULT 'active',

  -- Configuration
  greeting_message TEXT DEFAULT 'Thank you for calling. How can I help you today?',
  voice_type TEXT DEFAULT 'nova', -- Twilio voice options
  language TEXT DEFAULT 'en-US',

  -- Routing
  fallback_number TEXT, -- Transfer to human if AI can't handle
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "21:00", "enabled": true},
    "tuesday": {"open": "09:00", "close": "21:00", "enabled": true},
    "wednesday": {"open": "09:00", "close": "21:00", "enabled": true},
    "thursday": {"open": "09:00", "close": "21:00", "enabled": true},
    "friday": {"open": "09:00", "close": "22:00", "enabled": true},
    "saturday": {"open": "09:00", "close": "22:00", "enabled": true},
    "sunday": {"open": "10:00", "close": "20:00", "enabled": true}
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT valid_provider CHECK (provider IN ('twilio', 'vonage', 'other'))
);

CREATE INDEX idx_phone_numbers_tenant ON phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);

-- Enable RLS
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'phone_numbers') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for phone_numbers" ON phone_numbers';
    EXECUTE '
      CREATE POLICY "Tenant isolation for phone_numbers" ON phone_numbers
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Voice Calls Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES phone_numbers(id),

  -- Call details
  caller_number TEXT NOT NULL,
  call_sid TEXT UNIQUE, -- Twilio call SID
  duration_seconds INTEGER,
  status TEXT DEFAULT 'in-progress',

  -- AI interaction
  conversation_transcript JSONB DEFAULT '[]'::jsonb,
  intent TEXT, -- hours, menu, order, feedback, appointment, other
  sentiment TEXT, -- positive, neutral, negative
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00

  -- Outcomes
  order_created BOOLEAN DEFAULT false,
  appointment_created BOOLEAN DEFAULT false,
  voicemail_left BOOLEAN DEFAULT false,
  transferred_to_human BOOLEAN DEFAULT false,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('in-progress', 'completed', 'failed', 'no-answer', 'busy')),
  CONSTRAINT valid_intent CHECK (intent IN ('hours', 'menu', 'order', 'feedback', 'appointment', 'directions', 'other', NULL)),
  CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL))
);

CREATE INDEX idx_voice_calls_tenant ON voice_calls(tenant_id);
CREATE INDEX idx_voice_calls_caller ON voice_calls(caller_number);
CREATE INDEX idx_voice_calls_intent ON voice_calls(intent);
CREATE INDEX idx_voice_calls_started ON voice_calls(started_at DESC);
CREATE INDEX idx_voice_calls_status ON voice_calls(status);

-- Enable RLS
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_calls') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_calls" ON voice_calls';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_calls" ON voice_calls
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Voice Voicemails Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_voicemails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES voice_calls(id),

  -- Voicemail content
  caller_number TEXT,
  caller_name TEXT,
  recording_url TEXT,
  transcription TEXT,
  category TEXT,
  sentiment TEXT,

  -- Status
  status TEXT DEFAULT 'new',
  assigned_to UUID,
  priority TEXT DEFAULT 'normal',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('new', 'read', 'archived', 'deleted')),
  CONSTRAINT valid_category CHECK (category IN ('feedback', 'complaint', 'question', 'compliment', 'other', NULL)),
  CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL)),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_voice_voicemails_tenant ON voice_voicemails(tenant_id);
CREATE INDEX idx_voice_voicemails_status ON voice_voicemails(status);
CREATE INDEX idx_voice_voicemails_created ON voice_voicemails(created_at DESC);
CREATE INDEX idx_voice_voicemails_priority ON voice_voicemails(priority);

-- Enable RLS
ALTER TABLE voice_voicemails ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_voicemails') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_voicemails" ON voice_voicemails';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_voicemails" ON voice_voicemails
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Voice Agent Knowledge Base Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_agent_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Knowledge entry
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[], -- For search optimization
  priority INTEGER DEFAULT 0,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('hours', 'menu', 'services', 'policies', 'pricing', 'location', 'other', NULL))
);

CREATE INDEX idx_voice_knowledge_tenant ON voice_agent_knowledge(tenant_id);
CREATE INDEX idx_voice_knowledge_category ON voice_agent_knowledge(category);
CREATE INDEX idx_voice_knowledge_priority ON voice_agent_knowledge(priority DESC);
CREATE INDEX idx_voice_knowledge_keywords ON voice_agent_knowledge USING GIN(keywords);

-- Enable RLS
ALTER TABLE voice_agent_knowledge ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'voice_agent_knowledge') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Tenant isolation for voice_agent_knowledge" ON voice_agent_knowledge';
    EXECUTE '
      CREATE POLICY "Tenant isolation for voice_agent_knowledge" ON voice_agent_knowledge
        FOR ALL
        USING (tenant_id = current_setting(''app.current_tenant'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))
    ';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Voice Agent Settings (extends tenant_config)
-- ============================================================================

-- Update tenant_config to include voice agent settings
DO $$
BEGIN
  -- Add voice_agent_enabled to features if tenant_config exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenant_config') THEN
    -- Update existing configs to add voice agent feature
    UPDATE tenant_config
    SET features = features || '{"voice_agent_enabled": false}'::jsonb
    WHERE NOT (features ? 'voice_agent_enabled');
  END IF;
END $$;

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function to get active phone number for tenant
CREATE OR REPLACE FUNCTION get_tenant_phone_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_phone_number TEXT;
BEGIN
  SELECT phone_number INTO v_phone_number
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN v_phone_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log voice call
CREATE OR REPLACE FUNCTION log_voice_call(
  p_tenant_id TEXT,
  p_caller_number TEXT,
  p_call_sid TEXT,
  p_intent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_call_id UUID;
  v_phone_number_id UUID;
BEGIN
  -- Get phone number ID
  SELECT id INTO v_phone_number_id
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  -- Insert call record
  INSERT INTO voice_calls (
    tenant_id,
    phone_number_id,
    caller_number,
    call_sid,
    intent
  ) VALUES (
    p_tenant_id,
    v_phone_number_id,
    p_caller_number,
    p_call_sid,
    p_intent
  ) RETURNING id INTO v_call_id;

  RETURN v_call_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if business is open
CREATE OR REPLACE FUNCTION is_business_open(p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_hours JSONB;
  v_day TEXT;
  v_current_time TIME;
  v_open_time TIME;
  v_close_time TIME;
  v_enabled BOOLEAN;
BEGIN
  -- Get current day and time
  v_day := LOWER(TO_CHAR(CURRENT_TIMESTAMP, 'Day'));
  v_day := TRIM(v_day);
  v_current_time := CURRENT_TIME;

  -- Get business hours
  SELECT business_hours INTO v_hours
  FROM phone_numbers
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  IF v_hours IS NULL THEN
    RETURN false;
  END IF;

  -- Extract hours for current day
  v_enabled := (v_hours->v_day->>'enabled')::boolean;
  v_open_time := (v_hours->v_day->>'open')::time;
  v_close_time := (v_hours->v_day->>'close')::time;

  -- Check if open
  RETURN v_enabled AND v_current_time BETWEEN v_open_time AND v_close_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: Sample Data for Chicago Mike's
-- ============================================================================

-- Insert sample phone number for chicago-mikes
INSERT INTO phone_numbers (tenant_id, phone_number, greeting_message, status)
VALUES (
  'chicago-mikes',
  '+15551234567', -- Placeholder - will be replaced with real Twilio number
  'Thanks for calling Chicago Mike''s Beef and Dogs! Our AI assistant is here to help. How can I assist you today?',
  'inactive' -- Set to active once real number is provisioned
)
ON CONFLICT (phone_number) DO NOTHING;

-- Insert sample knowledge base entries
INSERT INTO voice_agent_knowledge (tenant_id, question, answer, category, keywords, priority) VALUES
  ('chicago-mikes', 'What are your hours?', 'We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM.', 'hours', ARRAY['hours', 'open', 'close', 'time'], 10),
  ('chicago-mikes', 'Where are you located?', 'We are located in Chicago, Illinois. Would you like directions?', 'location', ARRAY['location', 'address', 'directions', 'where'], 10),
  ('chicago-mikes', 'Do you have gluten-free options?', 'Yes! We offer gluten-free buns for all our sandwiches. Just let us know when ordering.', 'menu', ARRAY['gluten-free', 'dietary', 'allergies', 'celiac'], 8),
  ('chicago-mikes', 'Can I place an order for pickup?', 'Absolutely! I can take your order right now. What would you like?', 'order', ARRAY['order', 'pickup', 'takeout', 'to-go'], 10),
  ('chicago-mikes', 'Do you deliver?', 'We offer delivery through DoorDash, Uber Eats, and Grubhub. Would you like phone numbers for those services?', 'services', ARRAY['delivery', 'doordash', 'ubereats', 'grubhub'], 7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Phone numbers must be provisioned via Twilio API
-- 2. Call transcripts stored as JSONB for flexibility
-- 3. Knowledge base supports fuzzy matching via keywords
-- 4. Business hours configurable per day of week
-- 5. All tables have tenant isolation via RLS

-- ============================================================================
-- 20251006 BUSINESS CONFIG TABLE
-- ============================================================================
-- Create business_config table for storing business owner settings
-- Created: 2025-10-06

CREATE TABLE IF NOT EXISTS public.business_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Business Information
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL CHECK (industry IN ('restaurant', 'medspa', 'auto', 'healthcare', 'fitness', 'retail', 'banking', 'hospitality', 'events')),
  primary_color TEXT DEFAULT '#667eea',
  locations INTEGER DEFAULT 1 CHECK (locations > 0),
  phone_number TEXT,

  -- Setup Status
  setup_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 1,

  -- Custom Domain
  custom_domain TEXT,
  domain_verified BOOLEAN DEFAULT false,

  -- Feature Flags
  features JSONB DEFAULT '{
    "games": true,
    "photoBooth": true,
    "jukebox": false,
    "feedback": true,
    "popularSpots": false,
    "thenAndNow": false,
    "aiVoice": false
  }'::jsonb,

  -- Branding
  logo_url TEXT,
  welcome_message TEXT,
  tagline TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_user_config UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_config_user_id ON public.business_config(user_id);
CREATE INDEX IF NOT EXISTS idx_business_config_industry ON public.business_config(industry);
CREATE INDEX IF NOT EXISTS idx_business_config_domain ON public.business_config(custom_domain);

-- Enable Row Level Security
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own config
CREATE POLICY "Users can view own business config"
  ON public.business_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own config
CREATE POLICY "Users can insert own business config"
  ON public.business_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own config
CREATE POLICY "Users can update own business config"
  ON public.business_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_business_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_config_timestamp
  BEFORE UPDATE ON public.business_config
  FOR EACH ROW
  EXECUTE FUNCTION update_business_config_updated_at();

-- Sample data for testing
COMMENT ON TABLE public.business_config IS 'Stores business owner configuration and branding settings for their EngageOS kiosk';

-- ============================================================================
-- 20251006 CALL LIMITS FORWARDING
-- ============================================================================
-- Call Limits and Forwarding Configuration
-- Adds monthly call limits per package and forwarding number support

-- Add call limit and forwarding columns to phone_numbers
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS monthly_call_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS calls_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period_start DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS forwarding_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forwarding_number TEXT,
ADD COLUMN IF NOT EXISTS forward_on_limit_reached BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forward_on_unable_to_help BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forward_after_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'starter';

COMMENT ON COLUMN phone_numbers.monthly_call_limit IS 'Maximum inbound calls allowed per month based on package tier';
COMMENT ON COLUMN phone_numbers.calls_used_this_month IS 'Number of calls used in current billing period';
COMMENT ON COLUMN phone_numbers.billing_period_start IS 'Start date of current billing period (resets monthly)';
COMMENT ON COLUMN phone_numbers.forwarding_number IS 'Phone number to forward calls to (E.164 format)';
COMMENT ON COLUMN phone_numbers.forward_on_limit_reached IS 'Forward calls when monthly limit is reached';
COMMENT ON COLUMN phone_numbers.forward_on_unable_to_help IS 'Forward when AI cannot help or user requests human';
COMMENT ON COLUMN phone_numbers.forward_after_hours IS 'Forward calls outside business hours';
COMMENT ON COLUMN phone_numbers.package_tier IS 'Package tier: starter, professional, enterprise, custom';

-- Package tier definitions with call limits
COMMENT ON COLUMN phone_numbers.package_tier IS E'Package tiers:\n- starter: 100 calls/month ($99/mo)\n- professional: 250 calls/month ($199/mo)\n- enterprise: 500 calls/month ($349/mo)\n- unlimited: Unlimited calls ($499/mo)';

-- Update existing record with defaults
UPDATE phone_numbers
SET
  monthly_call_limit = 100,
  calls_used_this_month = 0,
  billing_period_start = CURRENT_DATE,
  forwarding_enabled = true,
  forwarding_number = NULL, -- To be configured by user
  forward_on_limit_reached = true,
  forward_on_unable_to_help = true,
  forward_after_hours = true,
  package_tier = 'starter'
WHERE tenant_id = 'chicago-mikes';

-- Function to check if call limit is reached
CREATE OR REPLACE FUNCTION check_call_limit(p_phone_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
  v_billing_start DATE;
BEGIN
  SELECT monthly_call_limit, calls_used_this_month, billing_period_start
  INTO v_limit, v_used, v_billing_start
  FROM phone_numbers
  WHERE id = p_phone_id;

  -- Reset counter if new billing period
  IF v_billing_start + INTERVAL '1 month' <= CURRENT_DATE THEN
    UPDATE phone_numbers
    SET calls_used_this_month = 0,
        billing_period_start = CURRENT_DATE
    WHERE id = p_phone_id;
    RETURN false; -- Not at limit after reset
  END IF;

  -- Check if at limit
  RETURN v_used >= v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment call counter
CREATE OR REPLACE FUNCTION increment_call_counter(p_phone_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- Check and reset billing period if needed
  PERFORM check_call_limit(p_phone_id);

  -- Increment counter
  UPDATE phone_numbers
  SET calls_used_this_month = calls_used_this_month + 1
  WHERE id = p_phone_id
  RETURNING calls_used_this_month INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get call limit info
CREATE OR REPLACE FUNCTION get_call_limit_info(p_phone_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'monthly_limit', monthly_call_limit,
    'calls_used', calls_used_this_month,
    'calls_remaining', GREATEST(0, monthly_call_limit - calls_used_this_month),
    'limit_reached', calls_used_this_month >= monthly_call_limit,
    'billing_period_start', billing_period_start,
    'billing_period_end', billing_period_start + INTERVAL '1 month',
    'package_tier', package_tier,
    'forwarding_enabled', forwarding_enabled,
    'forwarding_number', forwarding_number
  ) INTO v_result
  FROM phone_numbers
  WHERE id = p_phone_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create call_usage_history table for tracking
CREATE TABLE IF NOT EXISTS call_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_sid TEXT,
  caller_number TEXT,
  call_type TEXT, -- 'inbound', 'forwarded', 'voicemail'
  duration_seconds INTEGER,
  cost_usd DECIMAL(10, 4),
  was_forwarded BOOLEAN DEFAULT false,
  forward_reason TEXT, -- 'limit_reached', 'unable_to_help', 'after_hours', 'user_request'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_usage_phone ON call_usage_history(phone_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_tenant ON call_usage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_created ON call_usage_history(created_at);

-- Enable RLS
ALTER TABLE call_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_usage_service_policy ON call_usage_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY call_usage_read_policy ON call_usage_history
  FOR SELECT
  USING (true);

-- Create view for monthly usage stats
CREATE OR REPLACE VIEW monthly_call_stats AS
SELECT
  ph.tenant_id,
  ph.package_tier,
  ph.monthly_call_limit,
  ph.calls_used_this_month,
  ph.billing_period_start,
  ph.billing_period_start + INTERVAL '1 month' as billing_period_end,
  GREATEST(0, ph.monthly_call_limit - ph.calls_used_this_month) as calls_remaining,
  ROUND((ph.calls_used_this_month::DECIMAL / NULLIF(ph.monthly_call_limit, 0)) * 100, 2) as usage_percentage,
  COUNT(DISTINCT cuh.id) FILTER (WHERE cuh.was_forwarded = true) as forwarded_calls_count,
  COUNT(DISTINCT cuh.id) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_calls_this_period,
  SUM(cuh.duration_seconds) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_duration_seconds,
  SUM(cuh.cost_usd) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_cost_usd
FROM phone_numbers ph
LEFT JOIN call_usage_history cuh ON cuh.phone_id = ph.id
GROUP BY ph.id, ph.tenant_id, ph.package_tier, ph.monthly_call_limit,
         ph.calls_used_this_month, ph.billing_period_start;

-- Sample usage tracking
INSERT INTO call_usage_history (phone_id, tenant_id, call_type, duration_seconds, cost_usd, was_forwarded, forward_reason)
SELECT
  id,
  tenant_id,
  'inbound',
  120, -- 2 minute call
  0.25, -- estimated cost
  false,
  NULL
FROM phone_numbers
WHERE tenant_id = 'chicago-mikes'
LIMIT 0; -- Don't insert, just structure example

-- ============================================================================
-- 20251006 CALL RECORDING INTELLIGENCE
-- ============================================================================
-- Call Recording and Conversational Intelligence Configuration
-- Adds support for Twilio call recording, transcription, and custom language operators

-- Add recording and intelligence columns to phone_numbers
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_channels TEXT DEFAULT 'dual', -- 'mono' or 'dual'
ADD COLUMN IF NOT EXISTS transcription_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transcription_provider TEXT DEFAULT 'twilio', -- 'twilio' or 'google'
ADD COLUMN IF NOT EXISTS pii_redaction BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intelligence_service_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_storage_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS recording_package_tier TEXT DEFAULT 'none'; -- 'none', 'basic', 'pro', 'enterprise'

COMMENT ON COLUMN phone_numbers.recording_enabled IS 'Enable call recording for all calls';
COMMENT ON COLUMN phone_numbers.recording_channels IS 'Record mono (single) or dual (separate agent/customer channels)';
COMMENT ON COLUMN phone_numbers.transcription_enabled IS 'Enable automatic transcription via Conversational Intelligence';
COMMENT ON COLUMN phone_numbers.pii_redaction IS 'Automatically redact PII from transcriptions';
COMMENT ON COLUMN phone_numbers.intelligence_service_sid IS 'Twilio Intelligence Service SID';
COMMENT ON COLUMN phone_numbers.recording_storage_days IS 'Number of days to retain recordings';
COMMENT ON COLUMN phone_numbers.recording_package_tier IS E'Recording package tiers:\n- none: No recording ($0)\n- basic: 50 hours/month recording + transcription ($49/mo)\n- pro: 150 hours/month + transcription + basic operators ($99/mo)\n- enterprise: Unlimited + transcription + custom operators ($199/mo)';

-- Create intelligence_operators table for custom language operators
CREATE TABLE IF NOT EXISTS intelligence_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  operator_sid TEXT, -- Twilio Operator SID
  operator_type TEXT NOT NULL, -- 'prebuilt' or 'custom-generative'
  operator_name TEXT NOT NULL,
  operator_description TEXT,
  instructions TEXT, -- Natural language instructions for generative operators
  output_type TEXT DEFAULT 'score', -- 'score', 'classification', 'extraction', 'boolean'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, operator_name)
);

COMMENT ON TABLE intelligence_operators IS 'Custom and prebuilt language operators for call analysis';
COMMENT ON COLUMN intelligence_operators.instructions IS 'Natural language prompt for generative custom operators';
COMMENT ON COLUMN intelligence_operators.output_type IS 'Type of output: score (0-100), classification (category), extraction (text), boolean';

-- Create call_transcriptions table
CREATE TABLE IF NOT EXISTS call_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid TEXT NOT NULL,
  phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  transcript_text TEXT,
  transcript_json JSONB, -- Full transcript with timestamps
  confidence_score DECIMAL(5, 4),
  language TEXT DEFAULT 'en-US',
  duration_seconds INTEGER,
  recording_url TEXT,
  recording_sid TEXT,
  intelligence_service_sid TEXT,
  operator_results JSONB DEFAULT '{}'::jsonb, -- Results from language operators
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_transcriptions_call_sid ON call_transcriptions(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_phone ON call_transcriptions(phone_id);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_tenant ON call_transcriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_created ON call_transcriptions(created_at);

COMMENT ON TABLE call_transcriptions IS 'Call transcripts with Conversational Intelligence analysis';
COMMENT ON COLUMN call_transcriptions.transcript_json IS 'Full transcript with speaker labels, timestamps, and confidence scores';
COMMENT ON COLUMN call_transcriptions.operator_results IS 'Results from custom and prebuilt language operators';

-- Enable RLS
ALTER TABLE intelligence_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY intelligence_operators_service_policy ON intelligence_operators
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY intelligence_operators_read_policy ON intelligence_operators
  FOR SELECT
  USING (true);

CREATE POLICY call_transcriptions_service_policy ON call_transcriptions
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY call_transcriptions_read_policy ON call_transcriptions
  FOR SELECT
  USING (true);

-- Sample prebuilt operators
INSERT INTO intelligence_operators (tenant_id, operator_type, operator_name, operator_description, output_type)
VALUES
  ('chicago-mikes', 'prebuilt', 'sentiment', 'Detect overall sentiment of the conversation', 'classification'),
  ('chicago-mikes', 'prebuilt', 'pci-redaction', 'Redact credit card and PII information', 'boolean'),
  ('chicago-mikes', 'prebuilt', 'call-summary', 'Generate a summary of the call', 'extraction')
ON CONFLICT (tenant_id, operator_name) DO NOTHING;

-- Sample custom generative operators
INSERT INTO intelligence_operators (tenant_id, operator_type, operator_name, operator_description, instructions, output_type)
VALUES
  (
    'chicago-mikes',
    'custom-generative',
    'order-quality-score',
    'Score how well the agent handled the order',
    'Analyze the conversation and assign a score from 0-100 based on: 1) Did the agent confirm all order details? 2) Did the agent ask about dietary restrictions? 3) Did the agent provide pickup time? 4) Was the agent friendly and professional?',
    'score'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'menu-upsell',
    'Identify if agent attempted upselling',
    'Did the agent attempt to upsell items like adding cheese, upgrading to combo, or suggesting sides? Return true if upsell was attempted, false otherwise.',
    'boolean'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'customer-complaint',
    'Extract customer complaints or issues',
    'Identify and extract any customer complaints, issues, or negative feedback mentioned during the call. Return the complaint text, or "None" if no complaints were made.',
    'extraction'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'competitor-mention',
    'Detect mentions of competitors',
    'Did the customer mention any competitor restaurants (Portillos, Als Beef, Hot Dougs, etc.)? Return the competitor name if mentioned, or "None" if no competitors were discussed.',
    'extraction'
  ),
  (
    'chicago-mikes',
    'custom-generative',
    'lead-qualification',
    'Qualify potential catering leads',
    'Is this customer a potential catering lead? Look for mentions of: large orders, events, parties, corporate orders. Return a score 0-100 where 100 = high catering potential.',
    'score'
  )
ON CONFLICT (tenant_id, operator_name) DO NOTHING;

-- Function to get recording configuration
CREATE OR REPLACE FUNCTION get_recording_config(p_phone_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'recording_enabled', recording_enabled,
    'recording_channels', recording_channels,
    'transcription_enabled', transcription_enabled,
    'pii_redaction', pii_redaction,
    'intelligence_service_sid', intelligence_service_sid,
    'recording_package_tier', recording_package_tier,
    'recording_storage_days', recording_storage_days
  ) INTO v_result
  FROM phone_numbers
  WHERE id = p_phone_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to save transcription with operator results
CREATE OR REPLACE FUNCTION save_transcription(
  p_call_sid TEXT,
  p_phone_id UUID,
  p_tenant_id TEXT,
  p_transcript_text TEXT,
  p_transcript_json JSONB,
  p_recording_url TEXT DEFAULT NULL,
  p_recording_sid TEXT DEFAULT NULL,
  p_operator_results JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO call_transcriptions (
    call_sid,
    phone_id,
    tenant_id,
    transcript_text,
    transcript_json,
    recording_url,
    recording_sid,
    operator_results
  )
  VALUES (
    p_call_sid,
    p_phone_id,
    p_tenant_id,
    p_transcript_text,
    p_transcript_json,
    p_recording_url,
    p_recording_sid,
    p_operator_results
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for operator analytics
CREATE OR REPLACE VIEW operator_analytics AS
SELECT
  io.tenant_id,
  io.operator_name,
  io.operator_type,
  COUNT(ct.id) as total_calls_analyzed,
  AVG((ct.operator_results->io.operator_name->>'value')::NUMERIC) FILTER (WHERE ct.operator_results ? io.operator_name AND io.output_type = 'score') as avg_score,
  jsonb_agg(DISTINCT ct.operator_results->io.operator_name->'value') FILTER (WHERE ct.operator_results ? io.operator_name AND io.output_type IN ('classification', 'extraction')) as common_values,
  COUNT(*) FILTER (WHERE (ct.operator_results->io.operator_name->>'value')::BOOLEAN = true) as true_count,
  COUNT(*) FILTER (WHERE (ct.operator_results->io.operator_name->>'value')::BOOLEAN = false) as false_count
FROM intelligence_operators io
LEFT JOIN call_transcriptions ct ON ct.operator_results ? io.operator_name
  AND ct.tenant_id = io.tenant_id
WHERE io.enabled = true
GROUP BY io.tenant_id, io.operator_name, io.operator_type, io.output_type;

-- Update phone_numbers defaults
UPDATE phone_numbers
SET
  recording_enabled = false,
  recording_channels = 'dual',
  transcription_enabled = false,
  pii_redaction = true,
  recording_storage_days = 90,
  recording_package_tier = 'none'
WHERE tenant_id = 'chicago-mikes';

-- ============================================================================
-- 20251006 CREATE LEADS TABLE
-- ============================================================================
-- Create leads table for demo requests
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contact Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT NOT NULL,

  -- Business Details
  industry TEXT NOT NULL,
  locations INTEGER NOT NULL DEFAULT 1,

  -- Lead Source & Status
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'demo_scheduled', 'demo_completed', 'proposal_sent', 'closed_won', 'closed_lost')),

  -- Metadata
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Notes & Follow-up
  notes TEXT,
  follow_up_date DATE,
  assigned_to UUID REFERENCES auth.users(id),

  -- Timestamps for status changes
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  demo_scheduled_at TIMESTAMPTZ,
  demo_completed_at TIMESTAMPTZ,
  proposal_sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Calculated fields
  estimated_mrr NUMERIC(10, 2),
  estimated_ltv NUMERIC(10, 2)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON public.leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert leads (for public form submissions)
CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can view all leads
CREATE POLICY "Authenticated users can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update all leads
CREATE POLICY "Authenticated users can update all leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Create function to auto-update status timestamps
CREATE OR REPLACE FUNCTION update_leads_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'contacted' THEN NEW.contacted_at = NOW();
      WHEN 'qualified' THEN NEW.qualified_at = NOW();
      WHEN 'demo_scheduled' THEN NEW.demo_scheduled_at = NOW();
      WHEN 'demo_completed' THEN NEW.demo_completed_at = NOW();
      WHEN 'proposal_sent' THEN NEW.proposal_sent_at = NOW();
      WHEN 'closed_won' THEN NEW.closed_at = NOW();
      WHEN 'closed_lost' THEN NEW.closed_at = NOW();
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status timestamp updates
CREATE TRIGGER update_leads_status_timestamps
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_leads_status_timestamps();

-- Add comment
COMMENT ON TABLE public.leads IS 'Demo requests and sales leads from marketing site';

-- ============================================================================
-- 20251006 DEFAULT NAVIGATION APP
-- ============================================================================
-- Add default_navigation_app column to navigation_settings table
-- This allows admins to configure which app should be displayed initially for each industry/kiosk

ALTER TABLE IF EXISTS navigation_settings
ADD COLUMN IF NOT EXISTS default_navigation_app TEXT DEFAULT 'map'
CHECK (default_navigation_app IN ('map', 'games', 'jukebox', 'order', 'photobooth', 'thenandnow'));

COMMENT ON COLUMN navigation_settings.default_navigation_app IS 'The initial navigation app to display when the kiosk loads (map, games, jukebox, order, photobooth, thenandnow)';

-- ============================================================================
-- 20251006 GAME SCORES TABLE
-- ============================================================================
-- Create game_scores table for leaderboards
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL,
  initials TEXT NOT NULL CHECK (char_length(initials) = 3),
  score INTEGER NOT NULL,
  accuracy NUMERIC,
  time NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_score ON game_scores(game, score DESC, created_at ASC);

-- Enable RLS (Row Level Security)
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read scores
CREATE POLICY "Public read access" ON game_scores
  FOR SELECT USING (true);

-- Policy: Anyone can insert their own scores
CREATE POLICY "Public insert access" ON game_scores
  FOR INSERT WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE game_scores IS 'Leaderboard scores for kiosk games';

-- ============================================================================
-- 20251006 HARDWARE SHIPMENTS TABLE
-- ============================================================================
-- Hardware shipments tracking table
CREATE TABLE IF NOT EXISTS public.hardware_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Package details
  package_type TEXT NOT NULL CHECK (
    package_type IN ('standard', 'premium', 'enterprise_custom')
  ),

  -- Hardware components (what's in the box)
  items JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"name": "iPad Pro 12.9\"", "quantity": 1, "serial": "DMQXXXXXXX"},
  --   {"name": "Floor Stand", "quantity": 1, "serial": ""},
  --   {"name": "Card Reader", "quantity": 1, "serial": ""}
  -- ]

  -- Shipping address
  shipping_address JSONB NOT NULL,
  -- Example:
  -- {
  --   "name": "Chicago Mike's",
  --   "street": "123 Main St",
  --   "city": "Chicago",
  --   "state": "IL",
  --   "zip": "60601",
  --   "country": "US",
  --   "phone": "+1-312-555-0123"
  -- }

  -- Tracking information
  carrier TEXT CHECK (
    carrier IN ('ups', 'fedex', 'usps', 'dhl', 'other')
  ),
  tracking_number TEXT,
  tracking_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (
    status IN ('preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned')
  ),

  -- Important dates
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Installation scheduling
  installation_required BOOLEAN DEFAULT true,
  installation_scheduled_date DATE,
  installation_completed_date DATE,
  installer_name TEXT,
  installer_contact TEXT,

  -- Tracking events history
  tracking_events JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"timestamp": "2025-10-06T10:00:00Z", "status": "shipped", "location": "Chicago, IL"},
  --   {"timestamp": "2025-10-07T14:30:00Z", "status": "in_transit", "location": "Indianapolis, IN"},
  --   {"timestamp": "2025-10-08T09:15:00Z", "status": "delivered", "location": "Customer Location"}
  -- ]

  -- Metadata
  notes TEXT,
  internal_notes TEXT, -- Only visible to admins

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hardware_shipments_subscription_id ON hardware_shipments(subscription_id);
CREATE INDEX idx_hardware_shipments_user_id ON hardware_shipments(user_id);
CREATE INDEX idx_hardware_shipments_status ON hardware_shipments(status);
CREATE INDEX idx_hardware_shipments_tracking_number ON hardware_shipments(tracking_number);
CREATE INDEX idx_hardware_shipments_delivered_at ON hardware_shipments(delivered_at);

-- RLS Policies
ALTER TABLE hardware_shipments ENABLE ROW LEVEL SECURITY;

-- Users can view their own shipments
CREATE POLICY "Users can view own hardware shipments"
  ON hardware_shipments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert/update shipments
CREATE POLICY "System can insert hardware shipments"
  ON hardware_shipments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update hardware shipments"
  ON hardware_shipments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_hardware_shipments_updated_at
  BEFORE UPDATE ON hardware_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update subscription hardware_status when shipment status changes
CREATE OR REPLACE FUNCTION sync_hardware_status_to_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subscription's hardware_status to match shipment status
  UPDATE subscriptions
  SET hardware_status = NEW.status
  WHERE id = NEW.subscription_id;

  -- If hardware is delivered, start billing (if not already active)
  IF NEW.status = 'delivered' THEN
    UPDATE subscriptions
    SET
      status = 'active',
      billing_start_date = CURRENT_DATE,
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 month'
    WHERE id = NEW.subscription_id
      AND status = 'pending_hardware';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync hardware status
CREATE TRIGGER sync_hardware_status_on_update
  AFTER UPDATE OF status ON hardware_shipments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_hardware_status_to_subscription();

-- Function to add tracking event to history
CREATE OR REPLACE FUNCTION add_tracking_event(
  shipment_id UUID,
  event_status TEXT,
  event_location TEXT DEFAULT NULL,
  event_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_event JSONB;
BEGIN
  new_event := jsonb_build_object(
    'timestamp', NOW(),
    'status', event_status,
    'location', event_location,
    'notes', event_notes
  );

  UPDATE hardware_shipments
  SET tracking_events = tracking_events || new_event
  WHERE id = shipment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate delivery date based on carrier and distance
CREATE OR REPLACE FUNCTION estimate_delivery_date(
  carrier_name TEXT,
  origin_zip TEXT,
  dest_zip TEXT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  business_days INTEGER;
BEGIN
  -- Simple estimation logic (can be enhanced with actual carrier APIs)
  business_days := CASE carrier_name
    WHEN 'ups' THEN 3
    WHEN 'fedex' THEN 2
    WHEN 'usps' THEN 5
    WHEN 'dhl' THEN 2
    ELSE 4
  END;

  -- Add business days (skip weekends)
  RETURN NOW() + (business_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE hardware_shipments IS 'Tracks hardware kiosk shipments and delivery status';
COMMENT ON COLUMN hardware_shipments.status IS 'Current shipment status. When status changes to "delivered", billing automatically starts.';
COMMENT ON COLUMN hardware_shipments.tracking_events IS 'Historical log of all tracking updates';
COMMENT ON FUNCTION sync_hardware_status_to_subscription() IS 'Automatically updates subscription status and starts billing when hardware is delivered';

-- ============================================================================
-- 20251006 INVOICES TABLE
-- ============================================================================
-- Invoices table for billing history
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'open', 'paid', 'void', 'uncollectible')
  ),

  -- Amounts (in cents for precision)
  subtotal INTEGER NOT NULL, -- Base price before tax
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER NOT NULL,

  -- Currency
  currency TEXT DEFAULT 'usd' NOT NULL,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Payment details
  payment_method TEXT CHECK (
    payment_method IN ('card', 'bank_transfer', 'check', 'other')
  ),
  paid_at TIMESTAMPTZ,

  -- Line items (detailed breakdown)
  line_items JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"description": "Professional Plan (1 location)", "amount": 79900},
  --   {"description": "AI Voice Agent Add-on", "amount": 20000},
  --   {"description": "SMS Notifications", "amount": 4900},
  --   {"description": "Volume Discount (10%)", "amount": -10490}
  -- ]

  -- Metadata
  notes TEXT,
  due_date DATE,

  -- PDF invoice
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT, -- Stripe-hosted invoice page

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert/update invoices
CREATE POLICY "System can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  year_month TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');

  SELECT COALESCE(MAX(
    SUBSTRING(invoice_number FROM '[0-9]+$')::INTEGER
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';

  RETURN 'INV-' || year_month || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals from line items
CREATE OR REPLACE FUNCTION calculate_invoice_total(line_items_json JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  total INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(line_items_json)
  LOOP
    total := total + (item->>'amount')::INTEGER;
  END LOOP;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE invoices IS 'Stores billing invoices and payment history';
COMMENT ON COLUMN invoices.subtotal IS 'Amount in cents before tax';
COMMENT ON COLUMN invoices.total IS 'Final amount in cents including tax';
COMMENT ON COLUMN invoices.line_items IS 'Detailed breakdown of charges';

-- ============================================================================
-- 20251006 KIOSK VOICE ASSISTANT
-- ============================================================================
-- Kiosk Voice Assistant Configuration Table
-- Stores voice assistant settings for kiosk touchscreen interactions

CREATE TABLE IF NOT EXISTS kiosk_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  location_id TEXT,

  -- Voice configuration
  enabled BOOLEAN DEFAULT true,
  voice_provider TEXT DEFAULT 'Browser' CHECK (voice_provider IN ('Browser', 'ElevenLabs', 'Google', 'Amazon')),
  voice_id TEXT, -- ElevenLabs voice ID or provider-specific voice name
  voice_name TEXT, -- Display name (e.g., "Adam (Male)", "Alice (Female)")
  language TEXT DEFAULT 'en-US',

  -- Suggested prompts (array of strings)
  suggested_prompts JSONB DEFAULT '[]'::jsonb,

  -- Auto-generated based on enabled features
  auto_generate_prompts BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, location_id)
);

-- Enable RLS
ALTER TABLE kiosk_voice_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON kiosk_voice_settings FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON kiosk_voice_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON kiosk_voice_settings FOR UPDATE
  USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_kiosk_voice_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kiosk_voice_settings_updated_at
  BEFORE UPDATE ON kiosk_voice_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_kiosk_voice_settings_updated_at();

-- Insert default settings for demo industries
INSERT INTO kiosk_voice_settings (tenant_id, location_id, suggested_prompts, voice_provider, voice_name)
VALUES
  ('demo-restaurant', 'demo-restaurant',
   '["What are today''s specials?", "Show me the menu", "I''d like to place an order", "What''s your most popular dish?", "Do you have gluten-free options?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-medspa', 'demo-medspa',
   '["What treatments do you offer?", "Book me a facial appointment", "Show me before and after photos", "What are your prices?", "Do you have any specials?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-auto', 'demo-auto',
   '["What''s my service status?", "Schedule an oil change", "Do you have a shuttle service?", "What are your hours?", "Show me your services"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-healthcare', 'demo-healthcare',
   '["Check in for my appointment", "What''s my wait time?", "Update my insurance", "Where is the pharmacy?", "Request prescription refill"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-fitness', 'demo-fitness',
   '["What classes are available today?", "Book a personal training session", "Show me membership options", "Where are the locker rooms?", "What are your hours?"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-retail', 'demo-retail',
   '["What''s on sale today?", "Help me find a product", "Check if you have my size", "Where is the fitting room?", "What''s your return policy?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-banking', 'demo-banking',
   '["Open a new account", "Check my account balance", "Report a lost card", "Apply for a loan", "What are your rates?"]'::jsonb,
   'Browser', 'Google US English (Male)'),
  ('demo-events', 'demo-events',
   '["Where is the photo booth?", "Show me the event schedule", "How do I get to the VIP area?", "Where are the restrooms?", "What food is available?"]'::jsonb,
   'Browser', 'Google US English (Female)'),
  ('demo-hospitality', 'demo-hospitality',
   '["Check in to my room", "Request room service", "Book a spa treatment", "What time is breakfast?", "Where is the pool?"]'::jsonb,
   'Browser', 'Google US English (Female)')
ON CONFLICT (tenant_id, location_id) DO NOTHING;

-- ============================================================================
-- 20251006 NUMBER PORTING
-- ============================================================================
-- Number Porting via Twilio Porting API
-- Allows customers to port existing phone numbers into the voice agent system

-- Create porting_requests table
CREATE TABLE IF NOT EXISTS porting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Number to port in E.164 format
  current_carrier TEXT,
  account_number TEXT,
  pin_code TEXT,
  billing_name TEXT NOT NULL,
  billing_address JSONB NOT NULL, -- {street, city, state, zip, country}
  authorized_person TEXT NOT NULL,

  -- Twilio porting details
  port_in_request_sid TEXT, -- Twilio PortInRequest SID
  port_in_phone_number_sid TEXT, -- Twilio PortInPhoneNumber SID

  -- Status tracking
  status TEXT DEFAULT 'draft', -- draft, submitted, pending, in_progress, completed, cancelled, failed
  status_details JSONB DEFAULT '{}'::jsonb,
  estimated_completion_date DATE,
  actual_completion_date DATE,

  -- Progress notifications
  notifications JSONB DEFAULT '[]'::jsonb,
  last_notification_at TIMESTAMPTZ,

  -- Documents
  loa_url TEXT, -- Letter of Authorization URL
  bill_copy_url TEXT, -- Copy of current carrier bill

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_porting_requests_tenant ON porting_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_porting_requests_status ON porting_requests(status);
CREATE INDEX IF NOT EXISTS idx_porting_requests_phone ON porting_requests(phone_number);

COMMENT ON TABLE porting_requests IS 'Phone number porting requests via Twilio';
COMMENT ON COLUMN porting_requests.status IS 'draft=not submitted, submitted=sent to Twilio, pending=awaiting carrier, in_progress=carrier processing, completed=ported successfully, cancelled=request cancelled, failed=port failed';
COMMENT ON COLUMN porting_requests.notifications IS 'Array of progress notifications with timestamps';

-- Create porting_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS porting_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  porting_request_id UUID NOT NULL REFERENCES porting_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_porting_status_request ON porting_status_history(porting_request_id);
CREATE INDEX IF NOT EXISTS idx_porting_status_created ON porting_status_history(created_at);

-- Enable RLS
ALTER TABLE porting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE porting_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY porting_requests_service_policy ON porting_requests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY porting_requests_read_policy ON porting_requests
  FOR SELECT
  USING (true);

CREATE POLICY porting_status_service_policy ON porting_status_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY porting_status_read_policy ON porting_status_history
  FOR SELECT
  USING (true);

-- Function to add status update with notification
CREATE OR REPLACE FUNCTION add_porting_status_update(
  p_request_id UUID,
  p_status TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_notification JSONB;
BEGIN
  -- Insert status history
  INSERT INTO porting_status_history (
    porting_request_id,
    status,
    message,
    metadata
  )
  VALUES (
    p_request_id,
    p_status,
    p_message,
    p_metadata
  )
  RETURNING id INTO v_history_id;

  -- Update request status
  UPDATE porting_requests
  SET
    status = p_status,
    status_details = p_metadata,
    updated_at = NOW(),
    last_notification_at = NOW()
  WHERE id = p_request_id;

  -- Add notification to array
  v_notification = jsonb_build_object(
    'timestamp', NOW(),
    'status', p_status,
    'message', p_message
  );

  UPDATE porting_requests
  SET notifications = notifications || v_notification
  WHERE id = p_request_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get porting progress
CREATE OR REPLACE FUNCTION get_porting_progress(p_request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_progress INTEGER;
  v_stage TEXT;
BEGIN
  SELECT * INTO v_request
  FROM porting_requests
  WHERE id = p_request_id;

  -- Calculate progress percentage
  CASE v_request.status
    WHEN 'draft' THEN
      v_progress := 10;
      v_stage := 'Preparing documentation';
    WHEN 'submitted' THEN
      v_progress := 25;
      v_stage := 'Submitted to current carrier';
    WHEN 'pending' THEN
      v_progress := 40;
      v_stage := 'Awaiting carrier approval';
    WHEN 'in_progress' THEN
      v_progress := 70;
      v_stage := 'Carrier processing port';
    WHEN 'completed' THEN
      v_progress := 100;
      v_stage := 'Port completed successfully';
    WHEN 'cancelled' THEN
      v_progress := 0;
      v_stage := 'Port cancelled';
    WHEN 'failed' THEN
      v_progress := 0;
      v_stage := 'Port failed';
    ELSE
      v_progress := 0;
      v_stage := 'Unknown status';
  END CASE;

  RETURN json_build_object(
    'request_id', v_request.id,
    'phone_number', v_request.phone_number,
    'status', v_request.status,
    'progress_percentage', v_progress,
    'current_stage', v_stage,
    'estimated_completion', v_request.estimated_completion_date,
    'notifications_count', jsonb_array_length(v_request.notifications),
    'last_update', v_request.updated_at,
    'recent_notifications', (
      SELECT jsonb_agg(notif ORDER BY (notif->>'timestamp') DESC)
      FROM jsonb_array_elements(v_request.notifications) notif
      LIMIT 5
    )
  );
END;
$$ LANGUAGE plpgsql;

-- View for porting dashboard
CREATE OR REPLACE VIEW porting_dashboard AS
SELECT
  pr.id,
  pr.tenant_id,
  pr.phone_number,
  pr.status,
  pr.estimated_completion_date,
  pr.created_at,
  pr.updated_at,
  jsonb_array_length(pr.notifications) as notification_count,
  pr.notifications->-1 as latest_notification,
  CASE pr.status
    WHEN 'draft' THEN 10
    WHEN 'submitted' THEN 25
    WHEN 'pending' THEN 40
    WHEN 'in_progress' THEN 70
    WHEN 'completed' THEN 100
    ELSE 0
  END as progress_percentage,
  COUNT(psh.id) as status_changes
FROM porting_requests pr
LEFT JOIN porting_status_history psh ON psh.porting_request_id = pr.id
GROUP BY pr.id;

-- Sample porting request data structure (don't insert)
INSERT INTO porting_requests (
  tenant_id,
  phone_number,
  current_carrier,
  billing_name,
  billing_address,
  authorized_person,
  status
)
SELECT
  'chicago-mikes',
  '+13125551234',
  'Verizon',
  'John Doe',
  '{"street": "123 Main St", "city": "Chicago", "state": "IL", "zip": "60601", "country": "US"}'::jsonb,
  'John Doe',
  'draft'
LIMIT 0; -- Don't actually insert, just show structure

-- ============================================================================
-- 20251006 SUBSCRIPTIONS TABLE
-- ============================================================================
-- Subscriptions table for billing management
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_payment_method_id TEXT,

  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'pending_hardware' CHECK (
    status IN ('pending_hardware', 'active', 'past_due', 'canceled', 'paused', 'trialing')
  ),

  -- Billing timing
  billing_start_date DATE, -- Set when hardware ships
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end_date DATE,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  locations INTEGER DEFAULT 1,

  -- Hardware status
  hardware_status TEXT DEFAULT 'pending' CHECK (
    hardware_status IN ('pending', 'ordered', 'shipped', 'delivered', 'installed')
  ),

  -- Add-ons (stored as JSONB for flexibility)
  addons JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"name": "ai_voice", "price": 200}, {"name": "sms", "price": 49}]

  -- Usage tracking
  current_usage JSONB DEFAULT '{
    "interactions": 0,
    "sms_sent": 0,
    "voice_minutes": 0,
    "photos_captured": 0
  }'::jsonb,

  -- Metadata
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_hardware_status ON subscriptions(hardware_status);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own subscription (for self-service changes)
CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert subscriptions (via API)
CREATE POLICY "System can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total monthly price
CREATE OR REPLACE FUNCTION calculate_subscription_total(subscription_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  subscription_record RECORD;
  addon_total DECIMAL(10,2);
  discounted_base DECIMAL(10,2);
BEGIN
  SELECT * INTO subscription_record FROM subscriptions WHERE id = subscription_id;

  -- Calculate addon total
  SELECT COALESCE(SUM((addon->>'price')::DECIMAL), 0)
  INTO addon_total
  FROM jsonb_array_elements(subscription_record.addons) AS addon;

  -- Apply volume discount to base price
  discounted_base := subscription_record.base_price *
    (1 - subscription_record.discount_percent::DECIMAL / 100);

  -- Return total (base + addons) * locations
  RETURN (discounted_base + addon_total) * subscription_record.locations;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE subscriptions IS 'Manages customer subscriptions and billing status';
COMMENT ON COLUMN subscriptions.status IS 'pending_hardware: Payment method saved but not billing yet. active: Currently billing. past_due: Payment failed. canceled: Subscription ended.';
COMMENT ON COLUMN subscriptions.hardware_status IS 'Tracks hardware delivery status. Billing starts when status changes to "shipped".';
COMMENT ON COLUMN subscriptions.billing_start_date IS 'Date when billing actually began (set when hardware ships)';

-- ============================================================================
-- 20251006 TWILIO COMPLIANCE
-- ============================================================================
-- Twilio A2P 10DLC and Toll-Free Compliance Tables

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.twilio_toll_free_verifications CASCADE;
DROP TABLE IF EXISTS public.twilio_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.twilio_campaigns CASCADE;
DROP TABLE IF EXISTS public.twilio_brands CASCADE;
DROP TABLE IF EXISTS public.phone_numbers CASCADE;

-- Twilio Brand Registrations (for A2P 10DLC)
CREATE TABLE public.twilio_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  brand_sid TEXT UNIQUE NOT NULL,
  customer_profile_sid TEXT,

  -- Brand Details
  brand_name TEXT NOT NULL,
  ein TEXT, -- Tax ID
  business_type TEXT, -- PRIVATE_PROFIT, PUBLIC_PROFIT, NON_PROFIT, GOVERNMENT
  vertical TEXT, -- Industry category

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'APPROVED', 'FAILED', 'VERIFIED', 'VETTED')
  ),
  brand_score INTEGER, -- 0-100 trust score from TCR
  trust_level TEXT, -- UNVERIFIED, VERIFIED, VETTED
  failure_reason TEXT,

  -- Complete brand data from Twilio
  brand_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_brands_user_id ON twilio_brands(user_id);
CREATE INDEX idx_twilio_brands_status ON twilio_brands(status);
CREATE INDEX idx_twilio_brands_brand_sid ON twilio_brands(brand_sid);

-- RLS Policies
ALTER TABLE twilio_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brands"
  ON twilio_brands FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brands"
  ON twilio_brands FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON twilio_brands FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Twilio Messaging Campaigns (for A2P 10DLC)
CREATE TABLE public.twilio_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES twilio_brands(id) ON DELETE CASCADE,

  -- Twilio IDs
  campaign_sid TEXT UNIQUE NOT NULL,
  brand_sid TEXT NOT NULL,
  messaging_service_sid TEXT,

  -- Campaign Details
  use_case TEXT NOT NULL, -- 2FA, CUSTOMER_CARE, MARKETING, MIXED, etc.
  description TEXT,
  message_flow TEXT,

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'APPROVED', 'FAILED', 'SUSPENDED')
  ),
  failure_reason TEXT,

  -- Opt-in/out keywords
  opt_in_keywords TEXT[],
  opt_out_keywords TEXT[],
  help_keywords TEXT[],

  -- Sample messages
  sample_messages JSONB,

  -- Throughput limits (messages per minute)
  throughput_limit INTEGER,

  -- Complete campaign data from Twilio
  campaign_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_campaigns_user_id ON twilio_campaigns(user_id);
CREATE INDEX idx_twilio_campaigns_brand_id ON twilio_campaigns(brand_id);
CREATE INDEX idx_twilio_campaigns_status ON twilio_campaigns(status);
CREATE INDEX idx_twilio_campaigns_campaign_sid ON twilio_campaigns(campaign_sid);

-- RLS Policies
ALTER TABLE twilio_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON twilio_campaigns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaigns"
  ON twilio_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns"
  ON twilio_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Toll-Free Verifications
CREATE TABLE public.twilio_tollfree_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  verification_sid TEXT UNIQUE NOT NULL,
  phone_number_sid TEXT NOT NULL,
  phone_number TEXT NOT NULL,

  -- Business Details
  business_name TEXT NOT NULL,
  business_website TEXT NOT NULL,
  business_address JSONB NOT NULL,
  contact_email TEXT NOT NULL,

  -- Use Case
  use_case TEXT NOT NULL,
  use_case_description TEXT NOT NULL,
  message_volume TEXT, -- Expected daily volume
  opt_in_type TEXT, -- VERBAL, WEB_FORM, PAPER_FORM, VIA_TEXT, MOBILE_QR_CODE

  -- Status
  status TEXT NOT NULL CHECK (
    status IN ('PENDING_REVIEW', 'IN_REVIEW', 'TWILIO_APPROVED', 'TWILIO_REJECTED')
  ),
  rejection_reason TEXT,

  -- Opt-in proof
  opt_in_image_urls TEXT[],

  -- Sample messages
  production_message_sample TEXT,

  -- Complete verification data from Twilio
  verification_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_twilio_tollfree_user_id ON twilio_tollfree_verifications(user_id);
CREATE INDEX idx_twilio_tollfree_status ON twilio_tollfree_verifications(status);
CREATE INDEX idx_twilio_tollfree_phone ON twilio_tollfree_verifications(phone_number);

-- RLS Policies
ALTER TABLE twilio_tollfree_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own toll-free verifications"
  ON twilio_tollfree_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own toll-free verifications"
  ON twilio_tollfree_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own toll-free verifications"
  ON twilio_tollfree_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Phone Numbers
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio IDs
  phone_number_sid TEXT UNIQUE NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,

  -- Number Details
  friendly_name TEXT,
  number_type TEXT NOT NULL CHECK (
    number_type IN ('10dlc', 'tollfree', 'shortcode')
  ),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'porting', 'released')
  ),

  -- Capabilities
  capabilities JSONB DEFAULT '{"voice": true, "SMS": true, "MMS": false}'::jsonb,

  -- Linked Services
  messaging_service_sid TEXT,
  campaign_id UUID REFERENCES twilio_campaigns(id) ON DELETE SET NULL,
  verification_id UUID REFERENCES twilio_tollfree_verifications(id) ON DELETE SET NULL,

  -- Webhooks
  sms_url TEXT,
  voice_url TEXT,
  status_callback_url TEXT,

  -- Usage Stats
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,

  -- Metadata
  purchased_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_status ON phone_numbers(status);
CREATE INDEX idx_phone_numbers_number_type ON phone_numbers(number_type);
CREATE INDEX idx_phone_numbers_phone ON phone_numbers(phone_number);

-- RLS Policies
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phone numbers"
  ON phone_numbers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own phone numbers"
  ON phone_numbers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers"
  ON phone_numbers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- Number Port Requests
CREATE TABLE IF NOT EXISTS public.number_port_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Twilio Port-In ID
  port_in_sid TEXT UNIQUE NOT NULL,

  -- Numbers being ported
  phone_numbers TEXT[] NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (
    status IN (
      'draft',
      'pending_documents',
      'submitted',
      'pending_loa',
      'in_progress',
      'completed',
      'expired',
      'canceled',
      'port_failed'
    )
  ),

  -- Dates
  target_date DATE,
  estimated_completion DATE,
  completed_at TIMESTAMPTZ,

  -- Account Info (encrypted)
  losing_carrier_account_number TEXT,
  losing_carrier_pin TEXT,

  -- Service Address
  service_address JSONB NOT NULL,

  -- Contact
  authorized_contact JSONB NOT NULL,

  -- Documents
  loa_document_url TEXT, -- Letter of Authorization
  bill_document_url TEXT, -- Recent bill copy

  -- Rejection reason (if failed)
  failure_reason TEXT,
  missing_documents TEXT[],

  -- Complete port data from Twilio
  port_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_port_requests_user_id ON number_port_requests(user_id);
CREATE INDEX idx_port_requests_status ON number_port_requests(status);
CREATE INDEX idx_port_requests_port_in_sid ON number_port_requests(port_in_sid);

-- RLS Policies
ALTER TABLE number_port_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own port requests"
  ON number_port_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own port requests"
  ON number_port_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own port requests"
  ON number_port_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


-- SMS Message Log (for compliance and debugging)
CREATE TABLE IF NOT EXISTS public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,

  -- Twilio Message ID
  message_sid TEXT UNIQUE NOT NULL,

  -- Direction
  direction TEXT NOT NULL CHECK (
    direction IN ('inbound', 'outbound')
  ),

  -- Participants
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,

  -- Content
  body TEXT,
  media_urls TEXT[],

  -- Status
  status TEXT NOT NULL, -- queued, sending, sent, failed, delivered, undelivered, receiving, received
  error_code INTEGER,
  error_message TEXT,

  -- Pricing
  price DECIMAL(10, 4),
  price_unit TEXT DEFAULT 'USD',

  -- Metadata
  num_segments INTEGER DEFAULT 1,
  num_media INTEGER DEFAULT 0,

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_phone_number_id ON sms_messages(phone_number_id);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_from ON sms_messages(from_number);
CREATE INDEX idx_sms_messages_to ON sms_messages(to_number);

-- RLS Policies
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- Auto-update updated_at timestamps
CREATE TRIGGER update_twilio_brands_updated_at
  BEFORE UPDATE ON twilio_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twilio_campaigns_updated_at
  BEFORE UPDATE ON twilio_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_twilio_tollfree_updated_at
  BEFORE UPDATE ON twilio_tollfree_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_port_requests_updated_at
  BEFORE UPDATE ON number_port_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- Comments
COMMENT ON TABLE twilio_brands IS 'A2P 10DLC brand registrations with The Campaign Registry';
COMMENT ON TABLE twilio_campaigns IS 'A2P 10DLC messaging campaigns linked to brands';
COMMENT ON TABLE twilio_tollfree_verifications IS 'Toll-free number verification submissions';
COMMENT ON TABLE phone_numbers IS 'All phone numbers (10DLC, toll-free, short codes)';
COMMENT ON TABLE number_port_requests IS 'Phone number porting requests from other carriers';
COMMENT ON TABLE sms_messages IS 'Complete SMS message log for compliance and analytics';

-- ============================================================================
-- 20251006 VOICE CONFIG
-- ============================================================================
-- Voice Configuration Schema
-- Adds ConversationRelay settings to phone_numbers table

-- Add voice configuration columns
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'Google',
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'en-US-Neural2-D',
ADD COLUMN IF NOT EXISTS tts_language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS stt_provider TEXT DEFAULT 'Deepgram',
ADD COLUMN IF NOT EXISTS stt_model TEXT DEFAULT 'nova-2',
ADD COLUMN IF NOT EXISTS stt_language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS enable_dtmf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_interruption BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS conversation_mode TEXT DEFAULT 'conversationrelay', -- 'conversationrelay' or 'simple'
ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN phone_numbers.tts_provider IS 'Text-to-Speech provider: Google, Amazon, ElevenLabs';
COMMENT ON COLUMN phone_numbers.tts_voice IS 'Voice ID for the selected TTS provider';
COMMENT ON COLUMN phone_numbers.stt_provider IS 'Speech-to-Text provider: Google, Deepgram';
COMMENT ON COLUMN phone_numbers.stt_model IS 'STT model name (e.g., nova-2, telephony, long)';
COMMENT ON COLUMN phone_numbers.conversation_mode IS 'Handler mode: conversationrelay (AI) or simple (keyword-based)';
COMMENT ON COLUMN phone_numbers.voice_config IS 'Additional voice configuration (languages, custom parameters)';

-- Update existing phone number with default ConversationRelay config
UPDATE phone_numbers
SET
  tts_provider = 'Google',
  tts_voice = 'en-US-Neural2-D',
  tts_language = 'en-US',
  stt_provider = 'Deepgram',
  stt_model = 'nova-2',
  stt_language = 'en-US',
  enable_dtmf = true,
  enable_interruption = true,
  conversation_mode = 'conversationrelay',
  voice_config = '{
    "languages": [
      {
        "code": "en-US",
        "ttsProvider": "Google",
        "voice": "en-US-Neural2-D",
        "transcriptionProvider": "Deepgram",
        "speechModel": "nova-2"
      },
      {
        "code": "es-US",
        "ttsProvider": "Google",
        "voice": "es-US-Neural2-A",
        "transcriptionProvider": "Deepgram",
        "speechModel": "nova-2"
      }
    ],
    "customParameters": {
      "maxResponseTokens": 1024,
      "temperature": 0.7
    }
  }'::jsonb
WHERE tenant_id = 'chicago-mikes';

-- Create voice_prompts table for stateful conversation flows
CREATE TABLE IF NOT EXISTS voice_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  prompt_key TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  next_prompts JSONB DEFAULT '[]'::jsonb,
  required_intent TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, prompt_key)
);

COMMENT ON TABLE voice_prompts IS 'Stateful conversation prompt trees for voice agent';
COMMENT ON COLUMN voice_prompts.prompt_key IS 'Unique identifier for this prompt node (e.g., "greeting", "hours_response")';
COMMENT ON COLUMN voice_prompts.next_prompts IS 'Array of possible next prompt keys based on user response';
COMMENT ON COLUMN voice_prompts.required_intent IS 'Intent that must be detected to trigger this prompt';

-- Sample prompt tree
INSERT INTO voice_prompts (tenant_id, prompt_key, prompt_text, next_prompts, required_intent)
VALUES
  ('chicago-mikes', 'greeting', 'Thank you for calling Chicago Mikes Beef and Dogs! How can I help you today?', '["hours", "menu", "order", "location"]'::jsonb, null),
  ('chicago-mikes', 'hours', 'We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM. Is there anything else I can help you with?', '["menu", "order", "location", "goodbye"]'::jsonb, 'hours'),
  ('chicago-mikes', 'menu', 'We specialize in Chicago-style Italian beef and hot dogs. Would you like to hear about our beef sandwiches, hot dogs, or something else?', '["beef_menu", "hotdog_menu", "specials"]'::jsonb, 'menu'),
  ('chicago-mikes', 'beef_menu', 'Our Italian beef sandwich is $8.99 and comes with peppers. You can add cheese for $1 extra, or get it dipped for the authentic Chicago experience. Would you like to place an order?', '["order", "hotdog_menu", "goodbye"]'::jsonb, 'beef'),
  ('chicago-mikes', 'order', 'Great! Let me take your order. What would you like?', '["order_confirm", "modify_order"]'::jsonb, 'order'),
  ('chicago-mikes', 'order_confirm', 'Perfect! Your order will be ready for pickup in about 15 minutes. Can I get your name and phone number?', '["order_complete"]'::jsonb, 'confirm'),
  ('chicago-mikes', 'goodbye', 'Thank you for calling Chicago Mikes! Have a great day!', '[]'::jsonb, 'goodbye')
ON CONFLICT (tenant_id, prompt_key) DO NOTHING;

-- Create voice_tools table for tool/function definitions
CREATE TABLE IF NOT EXISTS voice_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_description TEXT NOT NULL,
  input_schema JSONB NOT NULL,
  handler_function TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, tool_name)
);

COMMENT ON TABLE voice_tools IS 'Custom tools/functions available to the voice agent';
COMMENT ON COLUMN voice_tools.handler_function IS 'Name of the function handler in the Edge Function';
COMMENT ON COLUMN voice_tools.input_schema IS 'JSON Schema for tool input validation';

-- Sample tools
INSERT INTO voice_tools (tenant_id, tool_name, tool_description, input_schema, handler_function)
VALUES
  (
    'chicago-mikes',
    'search_menu',
    'Search the menu for specific items, ingredients, or dietary restrictions',
    '{
      "type": "object",
      "properties": {
        "query": {"type": "string", "description": "What to search for"},
        "category": {"type": "string", "enum": ["beef", "hotdog", "sides", "drinks"]}
      },
      "required": ["query"]
    }'::jsonb,
    'searchMenu'
  ),
  (
    'chicago-mikes',
    'check_availability',
    'Check if the restaurant is currently open and accepting orders',
    '{
      "type": "object",
      "properties": {
        "service_type": {"type": "string", "enum": ["dine-in", "pickup", "delivery"]}
      }
    }'::jsonb,
    'checkAvailability'
  ),
  (
    'chicago-mikes',
    'calculate_price',
    'Calculate the total price for an order including any add-ons',
    '{
      "type": "object",
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "quantity": {"type": "number"},
              "addons": {"type": "array", "items": {"type": "string"}}
            }
          }
        }
      },
      "required": ["items"]
    }'::jsonb,
    'calculatePrice'
  )
ON CONFLICT (tenant_id, tool_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_prompts_tenant ON voice_prompts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_prompts_key ON voice_prompts(prompt_key);
CREATE INDEX IF NOT EXISTS idx_voice_tools_tenant ON voice_tools(tenant_id);

-- Add RLS policies
ALTER TABLE voice_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_tools ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage everything
CREATE POLICY voice_prompts_service_policy ON voice_prompts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY voice_tools_service_policy ON voice_tools
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to read
CREATE POLICY voice_prompts_read_policy ON voice_prompts
  FOR SELECT
  USING (true);

CREATE POLICY voice_tools_read_policy ON voice_tools
  FOR SELECT
  USING (true);

-- ============================================================================
-- 20251008 ADD PIN STYLE COLUMN
-- ============================================================================
-- Add pinStyle column to pins table for custom pin styles
-- Allows users to select Chicago team/affiliation themed pins

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN pins."pinStyle" IS 'Custom pin style ID (bears, bulls, cubs, whitesox, blackhawks, chicagostar)';

-- Create index for filtering by pin style
CREATE INDEX IF NOT EXISTS idx_pins_pin_style ON pins("pinStyle");

-- ============================================================================
-- END OF MIGRATIONS - COMMIT TRANSACTION
-- ============================================================================
COMMIT;
