-- Fix proximity detection thresholds
-- Current values are too high (60 and 95), causing no triggers
-- New values match actual proximity levels detected (49-50)

UPDATE admin_settings
SET
  proximity_threshold = 30,           -- Lowered from 60 to 30 (walkup/voice trigger)
  ambient_music_threshold = 25        -- Lowered from 95 to 25 (music trigger)
WHERE tenant_id = 'chicago-mikes';

-- Verify the update
SELECT
  tenant_id,
  proximity_threshold,
  ambient_music_threshold,
  proximity_detection_enabled
FROM admin_settings
WHERE tenant_id = 'chicago-mikes';
