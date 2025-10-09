-- Settings Updates Notification Table
-- Used to trigger immediate settings reload on kiosk devices

CREATE TABLE IF NOT EXISTS settings_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_by text,
  trigger_reload boolean DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE settings_updates ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users"
  ON settings_updates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow read for anon (kiosk devices need to listen for updates)
CREATE POLICY "Allow read for anon"
  ON settings_updates
  FOR SELECT
  TO anon
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE settings_updates;
