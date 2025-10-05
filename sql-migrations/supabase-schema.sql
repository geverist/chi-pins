-- Supabase Schema for Chi-Pins Application
-- Run this SQL in Supabase SQL Editor

-- =============================================================================
-- 1. TOWNS TABLE - Top 150 Chicago Metro Area Towns with Coordinates
-- =============================================================================

CREATE TABLE IF NOT EXISTS towns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  population INTEGER,
  county TEXT,
  state TEXT DEFAULT 'Illinois',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_towns_coordinates ON towns (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_towns_slug ON towns (slug);

-- =============================================================================
-- 2. FUN_FACTS TABLE - 3 facts per town (450 total)
-- =============================================================================

CREATE TABLE IF NOT EXISTS fun_facts (
  id BIGSERIAL PRIMARY KEY,
  town_slug TEXT NOT NULL,
  fact TEXT NOT NULL,
  fact_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_town FOREIGN KEY (town_slug) REFERENCES towns(slug) ON DELETE CASCADE,
  CONSTRAINT valid_fact_order CHECK (fact_order >= 1 AND fact_order <= 3)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fun_facts_town_slug ON fun_facts (town_slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fun_facts_unique ON fun_facts (town_slug, fact_order);

-- =============================================================================
-- 3. COMMENTS TABLE - User comments and upvotes for pins
-- =============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  pin_id BIGINT NOT NULL,
  user_id TEXT, -- Optional: can be NULL for anonymous comments
  comment_text TEXT,
  is_upvote BOOLEAN DEFAULT FALSE,
  user_ip TEXT, -- For rate limiting anonymous users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_pin FOREIGN KEY (pin_id) REFERENCES pins(id) ON DELETE CASCADE,
  CONSTRAINT comment_or_upvote CHECK (
    (comment_text IS NOT NULL AND char_length(comment_text) > 0) OR
    (is_upvote = TRUE)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_pin_id ON comments (pin_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_upvotes ON comments (pin_id, is_upvote) WHERE is_upvote = TRUE;

-- Unique constraint: one upvote per user/IP per pin
CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_one_upvote_per_user
  ON comments (pin_id, user_id)
  WHERE is_upvote = TRUE AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_one_upvote_per_ip
  ON comments (pin_id, user_ip)
  WHERE is_upvote = TRUE AND user_id IS NULL AND user_ip IS NOT NULL;

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE towns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fun_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for towns (read-only for public)
CREATE POLICY "Towns are viewable by everyone" ON towns
  FOR SELECT USING (true);

-- RLS Policies for fun_facts (read-only for public)
CREATE POLICY "Fun facts are viewable by everyone" ON fun_facts
  FOR SELECT USING (true);

-- RLS Policies for comments (public can read, authenticated can write)
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (
    user_id = auth.uid()::TEXT OR
    (user_id IS NULL AND user_ip = current_setting('request.headers')::json->>'x-forwarded-for')
  );

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (
    user_id = auth.uid()::TEXT OR
    (user_id IS NULL AND user_ip = current_setting('request.headers')::json->>'x-forwarded-for')
  );

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Function to get upvote count for a pin
CREATE OR REPLACE FUNCTION get_upvote_count(pin_id_param BIGINT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM comments
  WHERE pin_id = pin_id_param AND is_upvote = TRUE;
$$ LANGUAGE SQL STABLE;

-- Function to get comment count for a pin
CREATE OR REPLACE FUNCTION get_comment_count(pin_id_param BIGINT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM comments
  WHERE pin_id = pin_id_param AND comment_text IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- Function to find nearest town
CREATE OR REPLACE FUNCTION find_nearest_town(lat NUMERIC, lng NUMERIC, max_distance_miles NUMERIC DEFAULT 50)
RETURNS TABLE (
  town_name TEXT,
  town_slug TEXT,
  distance_miles NUMERIC
) AS $$
  SELECT
    name,
    slug,
    (
      3959 * acos(
        cos(radians(lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(latitude))
      )
    ) AS distance_miles
  FROM towns
  WHERE (
    3959 * acos(
      cos(radians(lat)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(latitude))
    )
  ) <= max_distance_miles
  ORDER BY distance_miles ASC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to check if coordinates are within Chicago metro area
CREATE OR REPLACE FUNCTION is_in_chicago_metro(lat NUMERIC, lng NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  -- Chicago metro bounds (approximate)
  -- Latitude: 41.4 to 42.5
  -- Longitude: -88.5 to -87.5
  RETURN (
    lat >= 41.4 AND lat <= 42.5 AND
    lng >= -88.5 AND lng <= -87.5
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

