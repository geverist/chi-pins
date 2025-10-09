-- Force Performance Mode - disable all navigation except explore
-- This ensures the footer is hidden for optimal kiosk performance

UPDATE navigation_settings
SET
  games_enabled = false,
  jukebox_enabled = false,
  order_enabled = false,
  explore_enabled = true,
  photobooth_enabled = false,
  thenandnow_enabled = false,
  comments_enabled = false,
  recommendations_enabled = false,
  updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';
