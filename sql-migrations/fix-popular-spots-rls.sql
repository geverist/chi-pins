-- Fix RLS policies for existing popular_spots table
-- This assumes the table already exists with whatever columns it has

-- Enable RLS if not already enabled
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
