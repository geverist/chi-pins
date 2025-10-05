-- Analytics Tables Migration
-- Track kiosk usage, engagement, and generate insights

-- Event tracking table for all user interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- 'pin_created', 'game_played', 'jukebox_used', 'photo_taken', etc.
  event_category TEXT NOT NULL, -- 'engagement', 'content', 'feature_usage', 'navigation'
  user_session_id TEXT, -- Anonymous session tracking
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE SET NULL, -- Which kiosk location
  metadata JSONB, -- Flexible data storage for event-specific info
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aggregated daily metrics for faster querying
CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE CASCADE,
  -- Pin metrics
  pins_created INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  -- Feature usage
  games_played INTEGER DEFAULT 0,
  jukebox_plays INTEGER DEFAULT 0,
  photos_taken INTEGER DEFAULT 0,
  orders_placed INTEGER DEFAULT 0,
  -- Engagement
  avg_session_duration_seconds INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  -- Game-specific
  hotdog_games INTEGER DEFAULT 0,
  trivia_games INTEGER DEFAULT 0,
  deepdish_games INTEGER DEFAULT 0,
  wind_games INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, location_id)
);

-- Word/phrase frequency for word clouds
CREATE TABLE IF NOT EXISTS analytics_word_frequency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL,
  category TEXT NOT NULL, -- 'pin_message', 'comment', 'hotdog_topping', etc.
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE CASCADE,
  count INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(word, category, location_id)
);

-- Session tracking for user journey analysis
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL UNIQUE,
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  events_count INTEGER DEFAULT 0,
  features_used TEXT[], -- Array of features accessed
  device_type TEXT, -- 'mobile', 'tablet', 'kiosk'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Popular content/interactions
CREATE TABLE IF NOT EXISTS analytics_popular_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type TEXT NOT NULL, -- 'game', 'song', 'spot', 'menu_item'
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  location_id UUID REFERENCES kiosk_locations(id) ON DELETE CASCADE,
  interaction_count INTEGER DEFAULT 1,
  last_interaction TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_type, item_id, location_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_location ON analytics_events(location_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(user_session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_location ON analytics_daily_metrics(location_id);

CREATE INDEX IF NOT EXISTS idx_analytics_words_category ON analytics_word_frequency(category);
CREATE INDEX IF NOT EXISTS idx_analytics_words_count ON analytics_word_frequency(count DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_words_location ON analytics_word_frequency(location_id);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_location ON analytics_sessions(location_id);

CREATE INDEX IF NOT EXISTS idx_analytics_popular_type ON analytics_popular_items(item_type);
CREATE INDEX IF NOT EXISTS idx_analytics_popular_count ON analytics_popular_items(interaction_count DESC);

-- RLS Policies (admin access only, but allow inserts from kiosk)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_word_frequency ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_popular_items ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (anonymous kiosk usage)
DROP POLICY IF EXISTS "Allow insert for analytics_events" ON analytics_events;
CREATE POLICY "Allow insert for analytics_events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for analytics_events" ON analytics_events;
CREATE POLICY "Allow read for analytics_events"
  ON analytics_events FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow all for analytics_daily_metrics" ON analytics_daily_metrics;
CREATE POLICY "Allow all for analytics_daily_metrics"
  ON analytics_daily_metrics FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all for analytics_word_frequency" ON analytics_word_frequency;
CREATE POLICY "Allow all for analytics_word_frequency"
  ON analytics_word_frequency FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all for analytics_sessions" ON analytics_sessions;
CREATE POLICY "Allow all for analytics_sessions"
  ON analytics_sessions FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Allow all for analytics_popular_items" ON analytics_popular_items;
CREATE POLICY "Allow all for analytics_popular_items"
  ON analytics_popular_items FOR ALL
  USING (true);

-- Function to aggregate events into daily metrics
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE, target_location_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_daily_metrics (
    date,
    location_id,
    pins_created,
    unique_users,
    games_played,
    jukebox_plays,
    photos_taken,
    orders_placed,
    total_sessions,
    hotdog_games,
    trivia_games,
    deepdish_games,
    wind_games
  )
  SELECT
    target_date,
    target_location_id,
    COUNT(*) FILTER (WHERE event_type = 'pin_created'),
    COUNT(DISTINCT user_session_id),
    COUNT(*) FILTER (WHERE event_category = 'game'),
    COUNT(*) FILTER (WHERE event_type = 'jukebox_play'),
    COUNT(*) FILTER (WHERE event_type = 'photo_taken'),
    COUNT(*) FILTER (WHERE event_type = 'order_placed'),
    COUNT(DISTINCT user_session_id),
    COUNT(*) FILTER (WHERE event_type = 'game_played' AND metadata->>'game' = 'hotdog'),
    COUNT(*) FILTER (WHERE event_type = 'game_played' AND metadata->>'game' = 'trivia'),
    COUNT(*) FILTER (WHERE event_type = 'game_played' AND metadata->>'game' = 'deepdish'),
    COUNT(*) FILTER (WHERE event_type = 'game_played' AND metadata->>'game' = 'wind')
  FROM analytics_events
  WHERE DATE(created_at) = target_date
    AND (location_id = target_location_id OR (location_id IS NULL AND target_location_id IS NULL))
  ON CONFLICT (date, location_id)
  DO UPDATE SET
    pins_created = EXCLUDED.pins_created,
    unique_users = EXCLUDED.unique_users,
    games_played = EXCLUDED.games_played,
    jukebox_plays = EXCLUDED.jukebox_plays,
    photos_taken = EXCLUDED.photos_taken,
    orders_placed = EXCLUDED.orders_placed,
    total_sessions = EXCLUDED.total_sessions,
    hotdog_games = EXCLUDED.hotdog_games,
    trivia_games = EXCLUDED.trivia_games,
    deepdish_games = EXCLUDED.deepdish_games,
    wind_games = EXCLUDED.wind_games,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update word frequency
CREATE OR REPLACE FUNCTION update_word_frequency(
  word_text TEXT,
  word_category TEXT,
  word_location_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_word_frequency (word, category, location_id, count, last_seen)
  VALUES (LOWER(TRIM(word_text)), word_category, word_location_id, 1, NOW())
  ON CONFLICT (word, category, location_id)
  DO UPDATE SET
    count = analytics_word_frequency.count + 1,
    last_seen = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to track popular item
CREATE OR REPLACE FUNCTION track_popular_item(
  p_item_type TEXT,
  p_item_id TEXT,
  p_item_name TEXT,
  p_location_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_popular_items (item_type, item_id, item_name, location_id, interaction_count, last_interaction)
  VALUES (p_item_type, p_item_id, p_item_name, p_location_id, 1, NOW())
  ON CONFLICT (item_type, item_id, location_id)
  DO UPDATE SET
    interaction_count = analytics_popular_items.interaction_count + 1,
    last_interaction = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_analytics_daily_metrics_updated_at ON analytics_daily_metrics;
CREATE TRIGGER update_analytics_daily_metrics_updated_at
  BEFORE UPDATE ON analytics_daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

-- Sample analytics events for testing
INSERT INTO analytics_events (event_type, event_category, user_session_id, metadata)
VALUES
  ('pin_created', 'content', 'session-1', '{"lat": 41.8781, "lng": -87.6298, "message": "Best pizza ever!"}'),
  ('game_played', 'game', 'session-1', '{"game": "hotdog", "score": 850}'),
  ('jukebox_play', 'engagement', 'session-2', '{"song": "Sweet Home Chicago", "artist": "Blues Brothers"}'),
  ('photo_taken', 'engagement', 'session-3', '{"filter": "chicago_skyline"}'),
  ('game_played', 'game', 'session-2', '{"game": "trivia", "score": 1200}'),
  ('pin_created', 'content', 'session-4', '{"lat": 41.8756, "lng": -87.6264, "message": "Amazing deep dish"}'),
  ('game_played', 'game', 'session-3', '{"game": "hotdog", "score": 1500}')
ON CONFLICT DO NOTHING;

-- Sample word frequency data
INSERT INTO analytics_word_frequency (word, category, count, last_seen)
VALUES
  ('pizza', 'pin_message', 156, NOW()),
  ('amazing', 'pin_message', 89, NOW()),
  ('best', 'pin_message', 203, NOW()),
  ('delicious', 'pin_message', 134, NOW()),
  ('chicago', 'pin_message', 178, NOW()),
  ('hotdog', 'pin_message', 92, NOW()),
  ('deep dish', 'pin_message', 145, NOW()),
  ('love', 'pin_message', 167, NOW()),
  ('great', 'pin_message', 121, NOW()),
  ('awesome', 'pin_message', 98, NOW()),
  ('fantastic', 'pin_message', 76, NOW()),
  ('nice', 'pin_message', 84, NOW()),
  ('good', 'pin_message', 112, NOW()),
  ('yummy', 'pin_message', 67, NOW()),
  ('tasty', 'pin_message', 71, NOW())
ON CONFLICT DO NOTHING;

-- Sample popular items
INSERT INTO analytics_popular_items (item_type, item_id, item_name, interaction_count, last_interaction)
VALUES
  ('game', 'hotdog', 'Chicago Dog Challenge', 345, NOW()),
  ('game', 'trivia', 'Chicago Trivia', 289, NOW()),
  ('game', 'deepdish', 'Deep Dish Toss', 256, NOW()),
  ('game', 'wind', 'Wind Challenge', 198, NOW()),
  ('song', 'sweet-home-chicago', 'Sweet Home Chicago', 423, NOW()),
  ('song', 'chicago-song', 'Chicago (That Toddlin'' Town)', 312, NOW())
ON CONFLICT DO NOTHING;

-- Create view for easy analytics querying
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  COALESCE(location_id::text, 'all') as location,
  DATE(created_at) as date,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_session_id) as unique_users,
  COUNT(*) FILTER (WHERE event_category = 'engagement') as engagement_events,
  COUNT(*) FILTER (WHERE event_category = 'content') as content_events,
  COUNT(*) FILTER (WHERE event_category = 'game') as game_events,
  COUNT(*) FILTER (WHERE event_type = 'pin_created') as pins_created,
  COUNT(*) FILTER (WHERE event_type = 'photo_taken') as photos_taken,
  COUNT(*) FILTER (WHERE event_type = 'jukebox_play') as jukebox_plays
FROM analytics_events
GROUP BY location_id, DATE(created_at)
ORDER BY date DESC, location;
