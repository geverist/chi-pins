-- Create then_and_now table for historical Chicago photo comparisons
CREATE TABLE IF NOT EXISTS then_and_now (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location TEXT NOT NULL,
  then_year TEXT NOT NULL,
  then_description TEXT NOT NULL,
  then_image_url TEXT NOT NULL,
  now_year TEXT NOT NULL DEFAULT '2024',
  now_description TEXT NOT NULL,
  now_image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS then_and_now_display_order_idx ON then_and_now(display_order);

-- Enable RLS
ALTER TABLE then_and_now ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to then_and_now" ON then_and_now;
DROP POLICY IF EXISTS "Allow public insert access to then_and_now" ON then_and_now;
DROP POLICY IF EXISTS "Allow public update access to then_and_now" ON then_and_now;
DROP POLICY IF EXISTS "Allow public delete access to then_and_now" ON then_and_now;

-- Allow public to read active comparisons
CREATE POLICY "Allow public read access to then_and_now"
  ON then_and_now
  FOR SELECT
  USING (active = true);

-- Allow public to insert (for admin panel)
CREATE POLICY "Allow public insert access to then_and_now"
  ON then_and_now
  FOR INSERT
  WITH CHECK (true);

-- Allow public to update (for admin panel)
CREATE POLICY "Allow public update access to then_and_now"
  ON then_and_now
  FOR UPDATE
  USING (true);

-- Allow public to delete (for admin panel)
CREATE POLICY "Allow public delete access to then_and_now"
  ON then_and_now
  FOR DELETE
  USING (true);

-- Insert example data with placeholders
INSERT INTO then_and_now (location, then_year, then_description, then_image_url, now_year, now_description, now_image_url, display_order)
VALUES
  (
    'State Street',
    '1907',
    'State Street looking north from Adams',
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop',
    '2024',
    'Modern State Street with theaters and shops',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop',
    1
  ),
  (
    'Michigan Avenue Bridge',
    '1920',
    'Michigan Avenue Bridge under construction',
    'https://images.unsplash.com/photo-1518481852452-9415b262eba4?w=800&auto=format&fit=crop',
    '2024',
    'Magnificent Mile with modern skyline',
    'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&auto=format&fit=crop',
    2
  ),
  (
    'Union Station',
    '1925',
    'Union Station Great Hall opening',
    'https://images.unsplash.com/photo-1570284613060-766c33850e00?w=800&auto=format&fit=crop',
    '2024',
    'Restored Great Hall serves modern commuters',
    'https://images.unsplash.com/photo-1567942712661-23920c27df3f?w=800&auto=format&fit=crop',
    3
  ),
  (
    'Wrigley Field',
    '1914',
    'Weeghman Park (original name)',
    'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop',
    '2024',
    'Historic Wrigley Field, home of the Cubs',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop',
    4
  ),
  (
    'Navy Pier',
    '1916',
    'Municipal Pier opens to public',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop',
    '2024',
    'Navy Pier entertainment destination',
    'https://images.unsplash.com/photo-1518737648736-c7ced79fa7d8?w=800&auto=format&fit=crop',
    5
  )
ON CONFLICT DO NOTHING;
