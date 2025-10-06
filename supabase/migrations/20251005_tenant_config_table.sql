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
