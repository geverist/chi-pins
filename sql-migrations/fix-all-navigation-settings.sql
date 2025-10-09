-- Comprehensive fix for navigation_settings table
-- This migration:
-- 1. Ensures all needed columns exist
-- 2. Fixes the UUID issue
-- 3. Sets proper defaults for performance mode

-- First, add any missing columns
DO $$
BEGIN
  -- Add photobooth_enabled if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'photobooth_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN photobooth_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add thenandnow_enabled if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'thenandnow_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN thenandnow_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add comments_enabled if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'comments_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN comments_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add recommendations_enabled if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'recommendations_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN recommendations_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add default_navigation_app if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'default_navigation_app'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN default_navigation_app TEXT DEFAULT 'map';
  END IF;
END $$;

-- Now fix the UUID issue
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM navigation_settings;

  IF row_count = 0 THEN
    -- No rows exist, insert default with fixed UUID (performance mode defaults)
    INSERT INTO navigation_settings (
      id,
      games_enabled,
      jukebox_enabled,
      order_enabled,
      explore_enabled,
      photobooth_enabled,
      thenandnow_enabled,
      comments_enabled,
      recommendations_enabled,
      default_navigation_app
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      false, -- games off by default (performance mode)
      false, -- jukebox off by default (performance mode)
      false, -- order off by default (performance mode)
      true,  -- explore always on
      false, -- photobooth off by default (performance mode)
      false, -- then&now off by default (performance mode)
      false, -- comments off by default (performance mode)
      false, -- recommendations off by default (performance mode)
      'map'  -- default app
    );
  ELSIF row_count = 1 THEN
    -- One row exists, update its ID to the fixed UUID
    UPDATE navigation_settings
    SET id = '00000000-0000-0000-0000-000000000001'
    WHERE id IN (SELECT id FROM navigation_settings LIMIT 1);
  ELSE
    -- Multiple rows exist, keep the first one with fixed UUID
    UPDATE navigation_settings
    SET id = '00000000-0000-0000-0000-000000000001'
    WHERE id IN (SELECT id FROM navigation_settings LIMIT 1);

    -- Delete duplicates
    DELETE FROM navigation_settings
    WHERE id != '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;
