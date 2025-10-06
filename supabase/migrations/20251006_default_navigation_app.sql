-- Add default_navigation_app column to navigation_settings table
-- This allows admins to configure which app should be displayed initially for each industry/kiosk

ALTER TABLE IF EXISTS navigation_settings
ADD COLUMN IF NOT EXISTS default_navigation_app TEXT DEFAULT 'map'
CHECK (default_navigation_app IN ('map', 'games', 'jukebox', 'order', 'photobooth', 'thenandnow'));

COMMENT ON COLUMN navigation_settings.default_navigation_app IS 'The initial navigation app to display when the kiosk loads (map, games, jukebox, order, photobooth, thenandnow)';
