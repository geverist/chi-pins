-- ============================================================================
-- SAFE MIGRATIONS FOR CHI-PINS
-- ============================================================================
-- This version handles existing tables/indexes gracefully
-- Safe to run multiple times
-- ============================================================================

-- ============================================================================
-- 1. ADD PINSTYLE COLUMN (CRITICAL - NEEDED FOR SEED SCRIPT)
-- ============================================================================

DO $$
BEGIN
  -- Add pinStyle column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'pinStyle'
  ) THEN
    ALTER TABLE pins ADD COLUMN "pinStyle" TEXT;

    -- Add comment
    COMMENT ON COLUMN pins."pinStyle" IS 'Custom pin style ID (bears, bulls, cubs, whitesox, blackhawks, chicagostar)';

    -- Add index
    CREATE INDEX idx_pins_pin_style ON pins("pinStyle");

    RAISE NOTICE 'Added pinStyle column to pins table';
  ELSE
    RAISE NOTICE 'pinStyle column already exists';
  END IF;
END $$;

-- ============================================================================
-- 2. VERIFY ESSENTIAL TABLES EXIST
-- ============================================================================

-- Check for pins table (should exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pins') THEN
    RAISE EXCEPTION 'pins table does not exist! Please check your database setup.';
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE GAME_SCORES TABLE (if needed)
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

    RAISE NOTICE 'Created game_scores table';
  ELSE
    RAISE NOTICE 'game_scores table already exists';
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE LEADS TABLE (if needed)
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

    RAISE NOTICE 'Created leads table';
  ELSE
    RAISE NOTICE 'leads table already exists';
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE DEBUG_LOGS TABLE (if needed)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'debug_logs') THEN
    CREATE TABLE debug_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT,
      user_agent TEXT,
      url TEXT,
      logs JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_debug_logs_created_at ON debug_logs(created_at DESC);
    CREATE INDEX idx_debug_logs_session_id ON debug_logs(session_id);

    -- Enable RLS
    ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

    -- Policies
    CREATE POLICY "Anyone can insert debug logs" ON debug_logs
      FOR INSERT WITH CHECK (true);

    CREATE POLICY "Anyone can read debug logs" ON debug_logs
      FOR SELECT USING (true);

    RAISE NOTICE 'Created debug_logs table';
  ELSE
    RAISE NOTICE 'debug_logs table already exists';
  END IF;
END $$;

-- ============================================================================
-- 6. CREATE SUBSCRIPTIONS TABLE (if needed)
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

    RAISE NOTICE 'Created subscriptions table';
  ELSE
    RAISE NOTICE 'subscriptions table already exists';
  END IF;
END $$;

-- ============================================================================
-- 7. LOCATIONS TABLE - ADD MISSING COLUMNS (if needed)
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
    -- Create table if it doesn't exist
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

    RAISE NOTICE 'Created locations table';
  ELSE
    RAISE NOTICE 'locations table already exists - checking for missing columns';

    -- Add missing columns if they don't exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'locations' AND column_name = 'city'
    ) INTO column_exists;

    IF NOT column_exists THEN
      ALTER TABLE locations ADD COLUMN city TEXT;
      RAISE NOTICE 'Added city column to locations';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'locations' AND column_name = 'state'
    ) INTO column_exists;

    IF NOT column_exists THEN
      ALTER TABLE locations ADD COLUMN state TEXT;
      RAISE NOTICE 'Added state column to locations';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'locations' AND column_name = 'plan_tier'
    ) INTO column_exists;

    IF NOT column_exists THEN
      ALTER TABLE locations ADD COLUMN plan_tier TEXT DEFAULT 'starter'
        CHECK (plan_tier IN ('starter', 'professional', 'enterprise', 'custom'));
      RAISE NOTICE 'Added plan_tier column to locations';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'locations' AND column_name = 'metadata'
    ) INTO column_exists;

    IF NOT column_exists THEN
      ALTER TABLE locations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      RAISE NOTICE 'Added metadata column to locations';
    END IF;

    -- Ensure chicago-mikes exists (using only guaranteed columns)
    IF NOT EXISTS (SELECT 1 FROM locations WHERE id = 'chicago-mikes') THEN
      INSERT INTO locations (id, name) VALUES ('chicago-mikes', 'Chicago Mike''s Hot Dogs');
      RAISE NOTICE 'Inserted chicago-mikes location';
    END IF;

    -- Update chicago-mikes with additional info if columns exist
    UPDATE locations
    SET
      industry = 'restaurant',
      status = 'active'
    WHERE id = 'chicago-mikes';

    -- Conditionally update city/state/plan_tier if columns exist
    BEGIN
      UPDATE locations SET city = 'Chicago' WHERE id = 'chicago-mikes';
      UPDATE locations SET state = 'IL' WHERE id = 'chicago-mikes';
      UPDATE locations SET plan_tier = 'professional' WHERE id = 'chicago-mikes';
    EXCEPTION
      WHEN undefined_column THEN
        RAISE NOTICE 'Some optional columns not available, skipping';
    END;
  END IF;
END $$;

-- ============================================================================
-- 8. CREATE AUDIT_LOGS TABLE (if needed)
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

    -- Add foreign key if locations exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
      ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant
        FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'Created audit_logs table';
  ELSE
    RAISE NOTICE 'audit_logs table already exists';
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  pin_style_exists BOOLEAN;
  tables_created TEXT[];
BEGIN
  -- Check pinStyle column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'pinStyle'
  ) INTO pin_style_exists;

  IF pin_style_exists THEN
    RAISE NOTICE '✅ pinStyle column exists - ready for seed script!';
  ELSE
    RAISE WARNING '❌ pinStyle column missing - seed script will fail!';
  END IF;

  -- List created/existing tables
  SELECT ARRAY_AGG(table_name ORDER BY table_name)
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('pins', 'game_scores', 'leads', 'debug_logs', 'subscriptions', 'locations', 'audit_logs')
  INTO tables_created;

  RAISE NOTICE 'Tables verified: %', tables_created;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================================================
  ✅ MIGRATIONS COMPLETE!
  ============================================================================

  Next steps:
  1. Run: node seed-pins.js
  2. Verify pins have custom styles

  ============================================================================
  ';
END $$;
