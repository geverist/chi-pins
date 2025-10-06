-- Multi-Tenancy Row-Level Security Migration
-- Created: 2025-10-05
-- Purpose: Add tenant_id columns and RLS policies to all tables

-- ============================================================================
-- PART 1: Add tenant_id columns to all tables
-- ============================================================================

-- Pins table
ALTER TABLE pins ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE pins SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE pins ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pins_tenant_id ON pins(tenant_id);

-- Orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE orders SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);

-- Customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE customers SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- Photo booth sessions table
ALTER TABLE photo_booth_sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE photo_booth_sessions SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE photo_booth_sessions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photo_booth_sessions_tenant_id ON photo_booth_sessions(tenant_id);

-- Analytics events table
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE analytics_events SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE analytics_events ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id ON analytics_events(tenant_id);

-- Feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS tenant_id TEXT;
UPDATE feedback SET tenant_id = 'chicago-mikes' WHERE tenant_id IS NULL;
ALTER TABLE feedback ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON feedback(tenant_id);

-- ============================================================================
-- PART 2: Enable Row-Level Security on all tables
-- ============================================================================

ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_booth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create RLS policies for tenant isolation
-- ============================================================================

-- Pins policies
DROP POLICY IF EXISTS "Tenant isolation for pins" ON pins;
CREATE POLICY "Tenant isolation for pins" ON pins
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Orders policies
DROP POLICY IF EXISTS "Tenant isolation for orders" ON orders;
CREATE POLICY "Tenant isolation for orders" ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Customers policies
DROP POLICY IF EXISTS "Tenant isolation for customers" ON customers;
CREATE POLICY "Tenant isolation for customers" ON customers
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Photo booth sessions policies
DROP POLICY IF EXISTS "Tenant isolation for photo_booth_sessions" ON photo_booth_sessions;
CREATE POLICY "Tenant isolation for photo_booth_sessions" ON photo_booth_sessions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Analytics events policies
DROP POLICY IF EXISTS "Tenant isolation for analytics_events" ON analytics_events;
CREATE POLICY "Tenant isolation for analytics_events" ON analytics_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Feedback policies
DROP POLICY IF EXISTS "Tenant isolation for feedback" ON feedback;
CREATE POLICY "Tenant isolation for feedback" ON feedback
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- ============================================================================
-- PART 4: Create admin bypass policy for super admins
-- ============================================================================

-- Allow platform administrators to see all tenant data
CREATE POLICY "Platform admin bypass" ON pins
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin bypass" ON orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

CREATE POLICY "Platform admin bypass" ON customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'platform_admin'
    )
  );

-- ============================================================================
-- PART 5: Add foreign key constraints
-- ============================================================================

-- Add foreign key to locations table (tenant registry)
ALTER TABLE pins
  ADD CONSTRAINT fk_pins_tenant
  FOREIGN KEY (tenant_id)
  REFERENCES locations(id)
  ON DELETE CASCADE;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_tenant
  FOREIGN KEY (tenant_id)
  REFERENCES locations(id)
  ON DELETE CASCADE;

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_tenant
  FOREIGN KEY (tenant_id)
  REFERENCES locations(id)
  ON DELETE CASCADE;

-- ============================================================================
-- PART 6: Create helpful views
-- ============================================================================

-- View for tenant statistics
CREATE OR REPLACE VIEW tenant_stats AS
SELECT
  l.id AS tenant_id,
  l.name AS tenant_name,
  l.industry,
  l.status,
  COUNT(DISTINCT p.id) AS total_pins,
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(DISTINCT c.id) AS total_customers,
  MAX(o.created_at) AS last_order_date,
  SUM(o.total_amount) AS total_revenue
FROM locations l
LEFT JOIN pins p ON p.tenant_id = l.id
LEFT JOIN orders o ON o.tenant_id = l.id
LEFT JOIN customers c ON c.tenant_id = l.id
GROUP BY l.id, l.name, l.industry, l.status;

-- Grant access to authenticated users
GRANT SELECT ON tenant_stats TO authenticated;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This migration adds tenant_id to all existing tables
-- 2. Existing data is migrated to 'chicago-mikes' tenant
-- 3. RLS policies enforce complete data isolation
-- 4. Platform admins can bypass RLS for support purposes
-- 5. Foreign key constraints ensure referential integrity
-- 6. Indexes optimize tenant-scoped queries
