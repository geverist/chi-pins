-- Multi-Tenancy Row-Level Security Migration (Actual Tables)
-- Created: 2025-10-05
-- Purpose: Add tenant_id columns and RLS policies to existing tables

-- ============================================================================
-- PART 1: Add tenant_id to locations table if it doesn't have id column
-- ============================================================================

-- Ensure locations table has proper structure for tenant registry
-- (This table should already exist based on the codebase)

-- ============================================================================
-- PART 2: Add tenant_id columns to existing tables
-- ============================================================================

-- Towns table (shared across tenants - no tenant_id needed)
-- Fun facts table (shared across tenants - no tenant_id needed)

-- Comments table (tenant-specific)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE comments SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE comments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_tenant_id ON comments(tenant_id);

-- Popular spots table (tenant-specific)
ALTER TABLE popular_spots ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE popular_spots SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE popular_spots ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_popular_spots_tenant_id ON popular_spots(tenant_id);

-- Then and now table (tenant-specific)
ALTER TABLE then_and_now ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE then_and_now SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE then_and_now ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_then_and_now_tenant_id ON then_and_now(tenant_id);

-- Anonymous messages table (tenant-specific)
ALTER TABLE anonymous_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE anonymous_messages SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE anonymous_messages ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anonymous_messages_tenant_id ON anonymous_messages(tenant_id);

-- Settings table (tenant-specific)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE settings SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE settings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- Navigation settings table (tenant-specific)
ALTER TABLE navigation_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE navigation_settings SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE navigation_settings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_navigation_settings_tenant_id ON navigation_settings(tenant_id);

-- Media files table (tenant-specific)
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE media_files SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE media_files ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_files_tenant_id ON media_files(tenant_id);

-- Music queue table (tenant-specific)
ALTER TABLE music_queue ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE music_queue SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE music_queue ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_music_queue_tenant_id ON music_queue(tenant_id);

-- Background images table (tenant-specific)
ALTER TABLE background_images ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE background_images SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE background_images ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_background_images_tenant_id ON background_images(tenant_id);

-- Game scores table (tenant-specific)
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE game_scores SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE game_scores ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_scores_tenant_id ON game_scores(tenant_id);

-- Kiosk clusters table (tenant-specific)
ALTER TABLE kiosk_clusters ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE kiosk_clusters SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE kiosk_clusters ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kiosk_clusters_tenant_id ON kiosk_clusters(tenant_id);

-- ============================================================================
-- PART 3: Create RLS policies for tenant isolation
-- ============================================================================

-- Comments policies
DROP POLICY IF EXISTS "Tenant isolation for comments" ON comments;
CREATE POLICY "Tenant isolation for comments" ON comments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Popular spots policies
DROP POLICY IF EXISTS "Tenant isolation for popular_spots" ON popular_spots;
CREATE POLICY "Tenant isolation for popular_spots" ON popular_spots
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Then and now policies
DROP POLICY IF EXISTS "Tenant isolation for then_and_now" ON then_and_now;
CREATE POLICY "Tenant isolation for then_and_now" ON then_and_now
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Anonymous messages policies
DROP POLICY IF EXISTS "Tenant isolation for anonymous_messages" ON anonymous_messages;
CREATE POLICY "Tenant isolation for anonymous_messages" ON anonymous_messages
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Settings policies
DROP POLICY IF EXISTS "Tenant isolation for settings" ON settings;
CREATE POLICY "Tenant isolation for settings" ON settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Navigation settings policies
DROP POLICY IF EXISTS "Tenant isolation for navigation_settings" ON navigation_settings;
CREATE POLICY "Tenant isolation for navigation_settings" ON navigation_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Media files policies
DROP POLICY IF EXISTS "Tenant isolation for media_files" ON media_files;
CREATE POLICY "Tenant isolation for media_files" ON media_files
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Music queue policies
DROP POLICY IF EXISTS "Tenant isolation for music_queue" ON music_queue;
CREATE POLICY "Tenant isolation for music_queue" ON music_queue
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Background images policies
DROP POLICY IF EXISTS "Tenant isolation for background_images" ON background_images;
CREATE POLICY "Tenant isolation for background_images" ON background_images
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Game scores policies
DROP POLICY IF EXISTS "Tenant isolation for game_scores" ON game_scores;
CREATE POLICY "Tenant isolation for game_scores" ON game_scores
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Kiosk clusters policies
DROP POLICY IF EXISTS "Tenant isolation for kiosk_clusters" ON kiosk_clusters;
CREATE POLICY "Tenant isolation for kiosk_clusters" ON kiosk_clusters
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- ============================================================================
-- PART 4: Create admin bypass policy for super admins
-- ============================================================================

-- Platform admin policies for all tables
CREATE POLICY "Platform admin bypass" ON comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin bypass" ON popular_spots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin bypass" ON settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Towns and fun_facts are shared across all tenants (no tenant_id)
-- 2. All other tables are tenant-scoped
-- 3. Existing data migrated to 'chicago-mikes' tenant
-- 4. Platform admins can bypass RLS
-- 5. Run other migration files for functions, audit logs, and config tables
