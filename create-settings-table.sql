-- Create settings table for admin panel configuration
-- This table stores app-wide settings as JSONB values

CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Allow public read access to settings"
  ON settings
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert/update settings (for kiosk use)
-- In production, you may want to restrict this to authenticated users
CREATE POLICY "Allow public insert access to settings"
  ON settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to settings"
  ON settings
  FOR UPDATE
  TO public
  USING (true);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default app settings if they don't exist
INSERT INTO settings (key, value)
VALUES ('app', '{
  "idleAttractorSeconds": 60,
  "kioskAutoStart": true,
  "attractorHintEnabled": true,
  "idleTimeoutMs": 60000,
  "highlightMs": 30000,
  "exploreDismissMs": 12000,
  "gamesIdleTimeout": 180,
  "jukeboxIdleTimeout": 120,
  "orderingIdleTimeout": 300,
  "deepDishStartSpeed": 2,
  "deepDishEndSpeed": 5,
  "adminPanelPin": "1111",
  "kioskExitPin": "1111",
  "minZoomForPins": 13,
  "maxZoom": 17,
  "clusterBubbleThreshold": 13,
  "showLabelsZoom": 13,
  "lowZoomVisualization": "bubbles",
  "labelStyle": "pill",
  "showPinsSinceMonths": 24,
  "showPopularSpots": true,
  "showCommunityPins": true,
  "enableGlobalBubbles": true,
  "loyaltyEnabled": true,
  "vestaboardEnabled": false,
  "facebookShareEnabled": false,
  "photoBackgroundsEnabled": true,
  "newsTickerEnabled": false,
  "newsTickerRssUrl": "https://news.google.com/rss/search?q=chicago&hl=en-US&gl=US&ceid=US:en",
  "restaurantName": "Chicago Mikes",
  "restaurantYelpUrl": "",
  "restaurantGoogleUrl": "",
  "restaurantWebsiteUrl": "",
  "initialRadiusMiles": 0.5,
  "chiMinZoom": 9,
  "autoKiosk": false,
  "showPopularSpotsDefault": true,
  "showCommunityPinsDefault": true,
  "allowedTeams": ["cubs", "whitesox", "other"],
  "allowedSources": ["kiosk", "global"]
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
