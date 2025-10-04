-- Create popular_spots table for storing curated locations
CREATE TABLE IF NOT EXISTS popular_spots (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_popular_spots_slug ON popular_spots (slug);

-- Enable RLS
ALTER TABLE popular_spots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to popular spots" ON popular_spots;
DROP POLICY IF EXISTS "Allow public insert access to popular spots" ON popular_spots;
DROP POLICY IF EXISTS "Allow public update access to popular spots" ON popular_spots;
DROP POLICY IF EXISTS "Allow public delete access to popular spots" ON popular_spots;

-- Allow public to read popular spots
CREATE POLICY "Allow public read access to popular spots"
  ON popular_spots
  FOR SELECT
  USING (true);

-- Allow public to insert popular spots (for admin panel)
CREATE POLICY "Allow public insert access to popular spots"
  ON popular_spots
  FOR INSERT
  WITH CHECK (true);

-- Allow public to update popular spots (for admin panel)
CREATE POLICY "Allow public update access to popular spots"
  ON popular_spots
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public to delete popular spots (for admin panel)
CREATE POLICY "Allow public delete access to popular spots"
  ON popular_spots
  FOR DELETE
  USING (true);
