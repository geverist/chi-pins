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
