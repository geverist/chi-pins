-- ============================================================================
-- ULTRA SAFE MIGRATIONS FOR CHI-PINS
-- ============================================================================
-- This version is bulletproof - handles ALL existing objects gracefully
-- Safe to run infinite times without errors
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
    RAISE NOTICE '✅ Added pinStyle column to pins table';
  ELSE
    RAISE NOTICE '⏭️  pinStyle column already exists';
  END IF;

  -- Add comment (safe to run multiple times)
  COMMENT ON COLUMN pins."pinStyle" IS 'Custom pin style ID (bears, bulls, cubs, whitesox, blackhawks, chicagostar)';

  -- Add index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'pins' AND indexname = 'idx_pins_pin_style'
  ) THEN
    CREATE INDEX idx_pins_pin_style ON pins("pinStyle");
    RAISE NOTICE '✅ Created index on pinStyle';
  ELSE
    RAISE NOTICE '⏭️  Index idx_pins_pin_style already exists';
  END IF;
END $$;

-- ============================================================================
-- 2. VERIFY ESSENTIAL TABLES EXIST
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pins') THEN
    RAISE EXCEPTION '❌ pins table does not exist! Please check your database setup.';
  END IF;
  RAISE NOTICE '✅ pins table exists';
END $$;

-- ============================================================================
-- 3. GAME_SCORES TABLE
-- ============================================================================

DO $$
DECLARE
  has_game_type BOOLEAN;
  has_player_name BOOLEAN;
  has_score BOOLEAN;
  has_metadata BOOLEAN;
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
    RAISE NOTICE '✅ Created game_scores table';
  ELSE
    RAISE NOTICE '⏭️  game_scores table already exists - checking schema';

    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'game_type') INTO has_game_type;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'player_name') INTO has_player_name;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'score') INTO has_score;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'metadata') INTO has_metadata;

    -- Add missing columns
    IF NOT has_game_type THEN
      ALTER TABLE game_scores ADD COLUMN game_type TEXT;
      RAISE NOTICE '✅ Added game_type column';
    END IF;

    IF NOT has_player_name THEN
      ALTER TABLE game_scores ADD COLUMN player_name TEXT;
      RAISE NOTICE '✅ Added player_name column';
    END IF;

    IF NOT has_score THEN
      ALTER TABLE game_scores ADD COLUMN score INTEGER;
      RAISE NOTICE '✅ Added score column';
    END IF;

    IF NOT has_metadata THEN
      ALTER TABLE game_scores ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      RAISE NOTICE '✅ Added metadata column';
    END IF;
  END IF;

  -- Add indexes only if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'game_type') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'game_scores' AND indexname = 'idx_game_scores_game_type') THEN
      CREATE INDEX idx_game_scores_game_type ON game_scores(game_type);
      RAISE NOTICE '✅ Created index idx_game_scores_game_type';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_scores' AND column_name = 'score') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'game_scores' AND indexname = 'idx_game_scores_score') THEN
      CREATE INDEX idx_game_scores_score ON game_scores(score DESC);
      RAISE NOTICE '✅ Created index idx_game_scores_score';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. LEADS TABLE
-- ============================================================================

DO $$
DECLARE
  has_email BOOLEAN;
  has_status BOOLEAN;
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
    RAISE NOTICE '✅ Created leads table';
  ELSE
    RAISE NOTICE '⏭️  leads table already exists';
  END IF;

  -- Check if columns exist before creating indexes
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') INTO has_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status') INTO has_status;

  -- Add indexes only if columns exist
  IF has_email THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'leads' AND indexname = 'idx_leads_email') THEN
      CREATE INDEX idx_leads_email ON leads(email);
      RAISE NOTICE '✅ Created index idx_leads_email';
    END IF;
  END IF;

  IF has_status THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'leads' AND indexname = 'idx_leads_status') THEN
      CREATE INDEX idx_leads_status ON leads(status);
      RAISE NOTICE '✅ Created index idx_leads_status';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 5. DEBUG_LOGS TABLE
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
      level TEXT,
      message TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created debug_logs table';
  ELSE
    RAISE NOTICE '⏭️  debug_logs table already exists';

    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debug_logs' AND column_name = 'level') THEN
      ALTER TABLE debug_logs ADD COLUMN level TEXT;
      RAISE NOTICE '✅ Added level column to debug_logs';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debug_logs' AND column_name = 'message') THEN
      ALTER TABLE debug_logs ADD COLUMN message TEXT;
      RAISE NOTICE '✅ Added message column to debug_logs';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debug_logs' AND column_name = 'metadata') THEN
      ALTER TABLE debug_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      RAISE NOTICE '✅ Added metadata column to debug_logs';
    END IF;
  END IF;

  -- Add indexes (safe)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'debug_logs' AND indexname = 'idx_debug_logs_created_at') THEN
    CREATE INDEX idx_debug_logs_created_at ON debug_logs(created_at DESC);
    RAISE NOTICE '✅ Created index idx_debug_logs_created_at';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'debug_logs' AND indexname = 'idx_debug_logs_session_id') THEN
    CREATE INDEX idx_debug_logs_session_id ON debug_logs(session_id);
    RAISE NOTICE '✅ Created index idx_debug_logs_session_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'debug_logs' AND indexname = 'idx_debug_logs_level') THEN
    CREATE INDEX idx_debug_logs_level ON debug_logs(level);
    RAISE NOTICE '✅ Created index idx_debug_logs_level';
  END IF;

  -- Enable RLS (safe to run multiple times)
  ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

  -- Drop and recreate policies (safe)
  DROP POLICY IF EXISTS "Anyone can insert debug logs" ON debug_logs;
  CREATE POLICY "Anyone can insert debug logs" ON debug_logs
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Anyone can read debug logs" ON debug_logs;
  CREATE POLICY "Anyone can read debug logs" ON debug_logs
    FOR SELECT USING (true);

  RAISE NOTICE '✅ Configured RLS policies for debug_logs';
END $$;

-- ============================================================================
-- 6. SUBSCRIPTIONS TABLE
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
    RAISE NOTICE '✅ Created subscriptions table';
  ELSE
    RAISE NOTICE '⏭️  subscriptions table already exists';
  END IF;

  -- Add indexes only if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'user_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subscriptions' AND indexname = 'idx_subscriptions_user_id') THEN
      CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
      RAISE NOTICE '✅ Created index idx_subscriptions_user_id';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subscriptions' AND indexname = 'idx_subscriptions_stripe_customer_id') THEN
      CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
      RAISE NOTICE '✅ Created index idx_subscriptions_stripe_customer_id';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'subscriptions' AND indexname = 'idx_subscriptions_status') THEN
      CREATE INDEX idx_subscriptions_status ON subscriptions(status);
      RAISE NOTICE '✅ Created index idx_subscriptions_status';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 7. LOCATIONS TABLE - WITH COLUMN COMPATIBILITY
-- ============================================================================

DO $$
DECLARE
  has_city BOOLEAN;
  has_state BOOLEAN;
  has_plan_tier BOOLEAN;
  has_metadata BOOLEAN;
  has_industry BOOLEAN;
  has_status BOOLEAN;
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
    RAISE NOTICE '✅ Created locations table';

    -- Insert default location
    INSERT INTO locations (id, name, industry, city, state, status, plan_tier)
    VALUES ('chicago-mikes', 'Chicago Mike''s Hot Dogs', 'restaurant', 'Chicago', 'IL', 'active', 'professional');
    RAISE NOTICE '✅ Inserted chicago-mikes location';
  ELSE
    RAISE NOTICE '⏭️  locations table already exists - checking schema';

    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'city') INTO has_city;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'state') INTO has_state;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'plan_tier') INTO has_plan_tier;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'metadata') INTO has_metadata;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'industry') INTO has_industry;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'status') INTO has_status;

    -- Add missing columns
    IF NOT has_city THEN
      ALTER TABLE locations ADD COLUMN city TEXT;
      RAISE NOTICE '✅ Added city column';
    END IF;

    IF NOT has_state THEN
      ALTER TABLE locations ADD COLUMN state TEXT;
      RAISE NOTICE '✅ Added state column';
    END IF;

    IF NOT has_plan_tier THEN
      ALTER TABLE locations ADD COLUMN plan_tier TEXT DEFAULT 'starter';
      RAISE NOTICE '✅ Added plan_tier column';
    END IF;

    IF NOT has_metadata THEN
      ALTER TABLE locations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
      RAISE NOTICE '✅ Added metadata column';
    END IF;

    IF NOT has_industry THEN
      ALTER TABLE locations ADD COLUMN industry TEXT;
      RAISE NOTICE '✅ Added industry column';
    END IF;

    IF NOT has_status THEN
      ALTER TABLE locations ADD COLUMN status TEXT DEFAULT 'active';
      RAISE NOTICE '✅ Added status column';
    END IF;

    -- Ensure chicago-mikes exists (using only id and name which are guaranteed)
    IF NOT EXISTS (SELECT 1 FROM locations WHERE id = 'chicago-mikes') THEN
      INSERT INTO locations (id, name) VALUES ('chicago-mikes', 'Chicago Mike''s Hot Dogs');
      RAISE NOTICE '✅ Inserted chicago-mikes location';
    END IF;

    -- Update chicago-mikes with all available data (dynamic based on schema)
    IF has_industry THEN
      UPDATE locations SET industry = 'restaurant' WHERE id = 'chicago-mikes' AND (industry IS NULL OR industry = '');
    END IF;

    IF has_city THEN
      UPDATE locations SET city = 'Chicago' WHERE id = 'chicago-mikes' AND (city IS NULL OR city = '');
    END IF;

    IF has_state THEN
      UPDATE locations SET state = 'IL' WHERE id = 'chicago-mikes' AND (state IS NULL OR state = '');
    END IF;

    IF has_status THEN
      UPDATE locations SET status = 'active' WHERE id = 'chicago-mikes' AND (status IS NULL OR status = '');
    END IF;

    IF has_plan_tier THEN
      UPDATE locations SET plan_tier = 'professional' WHERE id = 'chicago-mikes' AND (plan_tier IS NULL OR plan_tier = '');
    END IF;

    RAISE NOTICE '✅ Updated chicago-mikes with available data';
  END IF;
END $$;

-- ============================================================================
-- 8. AUDIT_LOGS TABLE
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
    RAISE NOTICE '✅ Created audit_logs table';
  ELSE
    RAISE NOTICE '⏭️  audit_logs table already exists';
  END IF;

  -- Add indexes (safe)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_tenant_id') THEN
    CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
    RAISE NOTICE '✅ Created index idx_audit_logs_tenant_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_action') THEN
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);
    RAISE NOTICE '✅ Created index idx_audit_logs_action';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_timestamp') THEN
    CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    RAISE NOTICE '✅ Created index idx_audit_logs_timestamp';
  END IF;

  -- Add foreign key constraint if locations table exists and constraint doesn't exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_audit_logs_tenant' AND table_name = 'audit_logs'
    ) THEN
      ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_tenant
        FOREIGN KEY (tenant_id) REFERENCES locations(id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added foreign key constraint to audit_logs';
    ELSE
      RAISE NOTICE '⏭️  Foreign key constraint already exists';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
  pin_style_exists BOOLEAN;
  pin_count INTEGER;
  tables_list TEXT[];
  col_count INTEGER;
BEGIN
  RAISE NOTICE '
============================================================================
🔍 MIGRATION VERIFICATION
============================================================================';

  -- Check pinStyle column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pins' AND column_name = 'pinStyle'
  ) INTO pin_style_exists;

  IF pin_style_exists THEN
    RAISE NOTICE '✅ pinStyle column exists - READY FOR SEED SCRIPT!';
  ELSE
    RAISE WARNING '❌ pinStyle column missing - seed script will FAIL!';
  END IF;

  -- Count pins
  SELECT COUNT(*) INTO pin_count FROM pins;
  RAISE NOTICE '📍 Current pins in database: %', pin_count;

  -- List all public tables
  SELECT ARRAY_AGG(table_name ORDER BY table_name)
  FROM information_schema.tables
  WHERE table_schema = 'public'
  INTO tables_list;

  RAISE NOTICE '📊 Public tables: %', tables_list;

  -- Check locations columns
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_name = 'locations'
  INTO col_count;

  RAISE NOTICE '🏢 Locations table has % columns', col_count;

  RAISE NOTICE '
============================================================================
✅ MIGRATIONS COMPLETE!
============================================================================

📋 Next Steps:
1. Run: node seed-pins.js
2. Verify pins have custom pinStyle values
3. Check admin panel for ElevenLabs settings

🎉 Your database is ready!
============================================================================
';
END $$;
