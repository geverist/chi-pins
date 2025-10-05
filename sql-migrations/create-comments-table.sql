-- Comments/Feedback Table Migration
-- Store user feedback and comments about their kiosk experience

-- Drop existing table if it has wrong schema
DROP TABLE IF EXISTS comments CASCADE;

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  contact TEXT,
  contact_type TEXT CHECK (contact_type IN ('email', 'phone')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_rating ON comments(rating);
CREATE INDEX IF NOT EXISTS idx_comments_location ON comments(location_id);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert comments (public feedback)
DROP POLICY IF EXISTS "Allow public insert for comments" ON comments;
CREATE POLICY "Allow public insert for comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Allow public read (for admin viewing)
DROP POLICY IF EXISTS "Allow public read for comments" ON comments;
CREATE POLICY "Allow public read for comments"
  ON comments FOR SELECT
  USING (true);

-- Sample comments for testing
INSERT INTO comments (name, contact, contact_type, rating, comment)
VALUES
  ('John Doe', 'john@example.com', 'email', 5, 'Amazing experience! The games were so fun.'),
  ('Jane Smith', NULL, NULL, 4, 'Great food recommendations, loved the photo booth!'),
  ('Anonymous', NULL, NULL, 5, 'Best kiosk ever! The jukebox is awesome.')
ON CONFLICT DO NOTHING;
