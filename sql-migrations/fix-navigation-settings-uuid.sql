-- Fix navigation_settings table to use consistent UUID

-- First, check if we have any rows with the old integer-based approach
-- If the table has rows, we'll update the first row to use our fixed UUID

DO $$
BEGIN
  -- Check if table has any rows
  IF EXISTS (SELECT 1 FROM navigation_settings LIMIT 1) THEN
    -- Update the existing row to use our fixed UUID
    -- This preserves all settings while fixing the ID issue
    UPDATE navigation_settings
    SET id = '00000000-0000-0000-0000-000000000001'
    WHERE id IN (SELECT id FROM navigation_settings LIMIT 1);

    -- Delete any additional rows (we only want one)
    DELETE FROM navigation_settings
    WHERE id != '00000000-0000-0000-0000-000000000001';
  ELSE
    -- If no rows exist, insert a default row with our fixed UUID
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
      appointment_checkin_enabled,
      reservation_checkin_enabled,
      guestbook_enabled,
      default_navigation_app
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      false, false, false, true, false, false, false, false, false, false, false, 'map'
    );
  END IF;
END $$;
