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
