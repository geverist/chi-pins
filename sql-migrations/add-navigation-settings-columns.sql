-- Add missing navigation settings columns for Photo Booth, Then & Now, and Comments
DO $$
BEGIN
  -- Add photobooth_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'photobooth_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN photobooth_enabled BOOLEAN DEFAULT true;
  END IF;

  -- Add thenandnow_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'thenandnow_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN thenandnow_enabled BOOLEAN DEFAULT true;
  END IF;

  -- Add comments_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'navigation_settings' AND column_name = 'comments_enabled'
  ) THEN
    ALTER TABLE navigation_settings ADD COLUMN comments_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;
