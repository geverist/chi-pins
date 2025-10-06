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
