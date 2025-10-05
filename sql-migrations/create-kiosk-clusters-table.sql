-- Kiosk Clusters Migration
-- Allows multiple kiosk locations to be grouped together under a single restaurant/owner

-- Main clusters table
CREATE TABLE IF NOT EXISTS kiosk_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g., "Chicago Mike's Pizzeria"
  owner_name TEXT, -- Owner or business name
  owner_email TEXT,
  owner_phone TEXT,
  description TEXT,
  logo_url TEXT, -- Shared logo across all locations
  primary_color TEXT DEFAULT '#3b82f6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual kiosk locations within a cluster
CREATE TABLE IF NOT EXISTS kiosk_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id UUID NOT NULL REFERENCES kiosk_clusters(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL, -- e.g., "River North Location", "Loop Location"
  address TEXT NOT NULL,
  city TEXT DEFAULT 'Chicago',
  state TEXT DEFAULT 'IL',
  zip TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  phone TEXT,
  hours_json JSONB, -- Operating hours
  is_primary BOOLEAN DEFAULT false, -- Mark one location as primary
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kiosk-specific settings per location
CREATE TABLE IF NOT EXISTS kiosk_location_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES kiosk_locations(id) ON DELETE CASCADE,
  -- Display settings
  welcome_message TEXT,
  custom_logo_url TEXT, -- Override cluster logo if needed
  show_other_locations BOOLEAN DEFAULT true, -- Show sibling locations
  show_distance BOOLEAN DEFAULT true, -- Show distance to other locations
  -- Feature toggles (can override cluster defaults)
  games_enabled BOOLEAN DEFAULT true,
  jukebox_enabled BOOLEAN DEFAULT true,
  order_enabled BOOLEAN DEFAULT true,
  photobooth_enabled BOOLEAN DEFAULT true,
  -- Menu/ordering
  menu_url TEXT,
  online_ordering_url TEXT,
  -- Contact
  enable_contact_form BOOLEAN DEFAULT false,
  contact_email TEXT,
  -- Updated timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kiosk_locations_cluster ON kiosk_locations(cluster_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_locations_active ON kiosk_locations(active);
CREATE INDEX IF NOT EXISTS idx_kiosk_location_settings_location ON kiosk_location_settings(location_id);

-- RLS Policies (public read access for kiosk display)
ALTER TABLE kiosk_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_location_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Public read access for kiosk_clusters" ON kiosk_clusters;
CREATE POLICY "Public read access for kiosk_clusters"
  ON kiosk_clusters FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Public read access for kiosk_locations" ON kiosk_locations;
CREATE POLICY "Public read access for kiosk_locations"
  ON kiosk_locations FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Public read access for kiosk_location_settings" ON kiosk_location_settings;
CREATE POLICY "Public read access for kiosk_location_settings"
  ON kiosk_location_settings FOR SELECT
  USING (true);

-- Sample data for testing
INSERT INTO kiosk_clusters (name, owner_name, owner_email, description, primary_color)
VALUES
  ('Chicago Mike''s Pizzeria', 'Mike Johnson', 'mike@chicagomikes.com', 'Authentic Chicago-style pizza with multiple locations', '#ef4444'),
  ('Windy City Hotdogs', 'Sarah Williams', 'sarah@windycitydogs.com', 'The best Chicago dogs in town', '#f59e0b')
ON CONFLICT DO NOTHING;

-- Get cluster IDs for sample data
DO $$
DECLARE
  mikes_cluster_id UUID;
  windycity_cluster_id UUID;
BEGIN
  SELECT id INTO mikes_cluster_id FROM kiosk_clusters WHERE name = 'Chicago Mike''s Pizzeria' LIMIT 1;
  SELECT id INTO windycity_cluster_id FROM kiosk_clusters WHERE name = 'Windy City Hotdogs' LIMIT 1;

  IF mikes_cluster_id IS NOT NULL THEN
    -- Chicago Mike's locations
    INSERT INTO kiosk_locations (cluster_id, location_name, address, lat, lng, phone, is_primary, display_order)
    VALUES
      (mikes_cluster_id, 'River North Location', '123 N State St, Chicago, IL', 41.8919, -87.6278, '(312) 555-0101', true, 1),
      (mikes_cluster_id, 'Loop Location', '456 S Wabash Ave, Chicago, IL', 41.8756, -87.6264, '(312) 555-0102', false, 2),
      (mikes_cluster_id, 'Wicker Park Location', '789 N Milwaukee Ave, Chicago, IL', 41.9092, -87.6774, '(312) 555-0103', false, 3)
    ON CONFLICT DO NOTHING;
  END IF;

  IF windycity_cluster_id IS NOT NULL THEN
    -- Windy City Hotdogs locations
    INSERT INTO kiosk_locations (cluster_id, location_name, address, lat, lng, phone, is_primary, display_order)
    VALUES
      (windycity_cluster_id, 'Downtown Location', '321 W Madison St, Chicago, IL', 41.8819, -87.6359, '(312) 555-0201', true, 1),
      (windycity_cluster_id, 'Lincoln Park Location', '654 W Fullerton Ave, Chicago, IL', 41.9250, -87.6500, '(312) 555-0202', false, 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add settings for sample locations
INSERT INTO kiosk_location_settings (location_id, welcome_message, show_other_locations, menu_url)
SELECT
  id,
  'Welcome to ' || location_name || '!',
  true,
  'https://example.com/menu'
FROM kiosk_locations
ON CONFLICT DO NOTHING;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_kiosk_clusters_updated_at ON kiosk_clusters;
CREATE TRIGGER update_kiosk_clusters_updated_at
  BEFORE UPDATE ON kiosk_clusters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kiosk_locations_updated_at ON kiosk_locations;
CREATE TRIGGER update_kiosk_locations_updated_at
  BEFORE UPDATE ON kiosk_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kiosk_location_settings_updated_at ON kiosk_location_settings;
CREATE TRIGGER update_kiosk_location_settings_updated_at
  BEFORE UPDATE ON kiosk_location_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
