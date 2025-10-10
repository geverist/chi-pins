-- Create admin_settings table for per-tenant kiosk configuration
-- This table stores all admin panel settings for each tenant

CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,

  -- Proximity Detection Settings
  proximity_detection_enabled BOOLEAN DEFAULT false,
  proximity_walkup_threshold INTEGER DEFAULT 85,
  proximity_ambient_threshold INTEGER DEFAULT 95,
  proximity_stare_threshold INTEGER DEFAULT 75,
  proximity_walkup_count INTEGER DEFAULT 3,
  proximity_ambient_count INTEGER DEFAULT 2,
  proximity_stare_count INTEGER DEFAULT 5,

  -- Ambient Music Settings
  ambient_music_enabled BOOLEAN DEFAULT false,
  ambient_music_playlist TEXT,
  ambient_music_volume REAL DEFAULT 0.3,

  -- Voice Settings
  voice_greeting_enabled BOOLEAN DEFAULT true,
  voice_greeting_text TEXT DEFAULT 'Welcome!',
  elevenlabs_voice_id TEXT,
  elevenlabs_api_key TEXT,

  -- Display Settings
  idle_attractor_seconds INTEGER DEFAULT 60,
  kiosk_auto_start BOOLEAN DEFAULT true,
  attractor_hint_enabled BOOLEAN DEFAULT true,

  -- Feature Toggles
  loyalty_enabled BOOLEAN DEFAULT true,
  vestaboard_enabled BOOLEAN DEFAULT false,
  facebook_share_enabled BOOLEAN DEFAULT false,
  photo_backgrounds_enabled BOOLEAN DEFAULT true,
  news_ticker_enabled BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick tenant lookups
CREATE INDEX IF NOT EXISTS idx_admin_settings_tenant ON admin_settings(tenant_id);

-- RLS policies
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for kiosk display)
CREATE POLICY "Allow public read access to admin_settings"
  ON admin_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow public write access (for admin panel)
-- In production, restrict to authenticated users
CREATE POLICY "Allow public insert access to admin_settings"
  ON admin_settings
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to admin_settings"
  ON admin_settings
  FOR UPDATE
  TO public
  USING (true);

-- Insert default settings for chicago-mikes tenant
INSERT INTO admin_settings (tenant_id, proximity_detection_enabled, ambient_music_enabled)
VALUES ('chicago-mikes', false, false)
ON CONFLICT (tenant_id) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_settings_updated_at();
