-- ============================================================================
-- ESSENTIAL MIGRATIONS FOR CHI-PINS
-- ============================================================================
-- Run this in Supabase SQL Editor to add missing columns and tables
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD PINSTYLE COLUMN (MOST IMPORTANT - NEEDED FOR SEED SCRIPT)
-- ============================================================================

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;

COMMENT ON COLUMN pins."pinStyle" IS 'Custom pin style ID (bears, bulls, cubs, whitesox, blackhawks, chicagostar)';

CREATE INDEX IF NOT EXISTS idx_pins_pin_style ON pins("pinStyle");

-- ============================================================================
-- 2. GAME SCORES TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') THEN
    CREATE TABLE game_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      game_type TEXT NOT NULL,
      player_name TEXT,
      score INTEGER NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_game_scores_game_type ON game_scores(game_type);
    CREATE INDEX idx_game_scores_score ON game_scores(score DESC);
  END IF;
END $$;

-- ============================================================================
-- 3. LEADS TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    CREATE TABLE leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      phone TEXT,
      name TEXT,
      company TEXT,
      industry TEXT,
      message TEXT,
      source TEXT DEFAULT 'website',
      status TEXT DEFAULT 'new',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_leads_email ON leads(email);
    CREATE INDEX idx_leads_status ON leads(status);
  END IF;
END $$;

-- ============================================================================
-- 4. DEBUG LOGS TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'debug_logs') THEN
    CREATE TABLE debug_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_debug_logs_level ON debug_logs(level);
    CREATE INDEX idx_debug_logs_created_at ON debug_logs(created_at DESC);
  END IF;
END $$;

-- ============================================================================
-- 5. SUBSCRIPTIONS TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    CREATE TABLE subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
      status TEXT NOT NULL DEFAULT 'pending_hardware' CHECK (
        status IN ('pending_hardware', 'active', 'past_due', 'canceled', 'paused', 'trialing')
      ),
      billing_start_date DATE,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      base_price DECIMAL(10,2) NOT NULL,
      discount_percent INTEGER DEFAULT 0,
      locations INTEGER DEFAULT 1,
      hardware_status TEXT DEFAULT 'pending' CHECK (
        hardware_status IN ('pending', 'ordered', 'shipped', 'delivered', 'installed')
      ),
      addons JSONB DEFAULT '[]'::jsonb,
      current_usage JSONB DEFAULT '{
        "interactions": 0,
        "sms_sent": 0,
        "voice_minutes": 0,
        "photos_captured": 0
      }'::jsonb,
      cancel_at_period_end BOOLEAN DEFAULT false,
      canceled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
    CREATE INDEX idx_subscriptions_status ON subscriptions(status);
  END IF;
END $$;

-- ============================================================================
-- 6. LOCATIONS TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
    CREATE TABLE locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      logo_url TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'trial')),
      plan_tier TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'professional', 'enterprise', 'custom')),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Insert default location
    INSERT INTO locations (id, name, industry, city, state, status, plan_tier)
    VALUES ('chicago-mikes', 'Chicago Mike''s Hot Dogs', 'restaurant', 'Chicago', 'IL', 'active', 'professional');
  END IF;
END $$;

-- ============================================================================
-- 7. AUDIT LOGS TABLE (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      user_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

    -- Add foreign key after locations table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
      ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant
        FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify migrations succeeded:

-- Check if pinStyle column exists
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'pinStyle';

-- Count tables
-- SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- List all tables
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
