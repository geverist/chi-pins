-- Create pin_comments table for user comments/reviews on pins
-- This allows multiple comments per pin and geographic filtering for performance

CREATE TABLE IF NOT EXISTS pin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
  pin_slug TEXT, -- Denormalized for faster queries
  pin_lat DOUBLE PRECISION, -- Denormalized for geographic filtering
  pin_lng DOUBLE PRECISION, -- Denormalized for geographic filtering
  commenter_name TEXT,
  comment_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional 1-5 star rating
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT true, -- For moderation
  location_id TEXT REFERENCES locations(id) DEFAULT 'chicago-mikes'
);

-- Index for geographic queries (find comments within bounds)
CREATE INDEX IF NOT EXISTS idx_pin_comments_location ON pin_comments (pin_lat, pin_lng);

-- Index for recent comments
CREATE INDEX IF NOT EXISTS idx_pin_comments_created ON pin_comments (created_at DESC);

-- Index for pin lookups
CREATE INDEX IF NOT EXISTS idx_pin_comments_pin_id ON pin_comments (pin_id);

-- Index for approved comments only
CREATE INDEX IF NOT EXISTS idx_pin_comments_approved ON pin_comments (is_approved) WHERE is_approved = true;

-- Function to get comments within geographic bounds
CREATE OR REPLACE FUNCTION get_comments_in_bounds(
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  pin_slug TEXT,
  commenter_name TEXT,
  comment_text TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ,
  pin_lat DOUBLE PRECISION,
  pin_lng DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.pin_slug,
    pc.commenter_name,
    pc.comment_text,
    pc.rating,
    pc.created_at,
    pc.pin_lat,
    pc.pin_lng
  FROM pin_comments pc
  WHERE
    pc.is_approved = true
    AND pc.pin_lat >= min_lat
    AND pc.pin_lat <= max_lat
    AND pc.pin_lng >= min_lng
    AND pc.pin_lng <= max_lng
    AND pc.comment_text IS NOT NULL
    AND pc.comment_text != ''
  ORDER BY pc.created_at DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate pin location data when comment is created
CREATE OR REPLACE FUNCTION populate_pin_comment_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate pin location data from pins table
  SELECT slug, lat, lng
  INTO NEW.pin_slug, NEW.pin_lat, NEW.pin_lng
  FROM pins
  WHERE id = NEW.pin_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_populate_pin_comment_location
  BEFORE INSERT ON pin_comments
  FOR EACH ROW
  EXECUTE FUNCTION populate_pin_comment_location();

-- Enable RLS
ALTER TABLE pin_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Pin comments are viewable by everyone"
  ON pin_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert comments"
  ON pin_comments FOR INSERT
  WITH CHECK (true);

-- Migrate existing pin notes to comments (one comment per pin with note)
INSERT INTO pin_comments (pin_id, pin_slug, pin_lat, pin_lng, commenter_name, comment_text, created_at)
SELECT
  id,
  slug,
  lat,
  lng,
  name,
  note,
  created_at
FROM pins
WHERE
  note IS NOT NULL
  AND note != ''
  AND NOT EXISTS (
    SELECT 1 FROM pin_comments WHERE pin_id = pins.id
  );

COMMENT ON TABLE pin_comments IS 'User comments and reviews on map pins, with geographic filtering for performance';
COMMENT ON FUNCTION get_comments_in_bounds IS 'Returns approved comments within geographic bounds for localized display';
