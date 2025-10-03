-- Create navigation_settings table to store footer navigation configuration
CREATE TABLE IF NOT EXISTS navigation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  games_enabled BOOLEAN DEFAULT true,
  jukebox_enabled BOOLEAN DEFAULT true,
  order_enabled BOOLEAN DEFAULT true,
  explore_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO navigation_settings (games_enabled, jukebox_enabled, order_enabled, explore_enabled)
SELECT true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM navigation_settings);

-- Enable RLS
ALTER TABLE navigation_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to read settings
CREATE POLICY "Allow public read access to navigation settings"
  ON navigation_settings
  FOR SELECT
  USING (true);

-- Allow public to update settings (for admin panel)
-- In production, you'd want to add authentication checks here
CREATE POLICY "Allow public update access to navigation settings"
  ON navigation_settings
  FOR UPDATE
  USING (true);
