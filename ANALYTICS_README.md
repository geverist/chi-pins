## Analytics Dashboard - Complete Guide

Track kiosk usage, user engagement, and generate insights with the built-in analytics system.

## 🎯 Features

### Real-Time Metrics
- **Total Interactions** - All user events tracked
- **Unique Users** - Session-based user counting
- **Pins Created** - Community contributions
- **Games Played** - Total game sessions
- **Photos Taken** - Photo booth usage
- **Jukebox Plays** - Music interactions

### Visualizations
- **Word Cloud** - Popular words from pin messages and comments
- **Popular Games** - Most played games ranking
- **Top Songs** - Jukebox favorites
- **Daily Activity Chart** - Session trends over time

### Data Collection
- Automatic event tracking
- Session duration monitoring
- Feature usage analytics
- Device type detection (mobile/tablet/kiosk)

## 📊 Setup

### 1. Run the Migration

Execute in Supabase SQL Editor:
```bash
sql-migrations/create-analytics-tables.sql
```

This creates:
- `analytics_events` - Raw event data
- `analytics_daily_metrics` - Aggregated daily stats
- `analytics_word_frequency` - Word cloud data
- `analytics_sessions` - User session tracking
- `analytics_popular_items` - Popular content rankings

### 2. Access the Dashboard

Open Admin Panel → Analytics tab

### 3. Start Tracking (Automatic)

The system automatically tracks events when users:
- Create pins
- Play games
- Use jukebox
- Take photos
- Switch locations
- Submit comments

## 🔌 Integration

### Track Custom Events

```javascript
import { useAnalytics } from './hooks/useAnalytics';

function MyComponent() {
  const { track } = useAnalytics();

  const handleAction = () => {
    track.pinCreated({
      lat: 41.8781,
      lng: -87.6298,
      message: 'Great pizza!',
      team: 'cubs'
    });
  };

  return <button onClick={handleAction}>Create Pin</button>;
}
```

### Available Tracking Methods

```javascript
const { track } = useAnalytics();

// Pin creation
track.pinCreated({ lat, lng, message, team });

// Game play
track.gamePlayed('hotdog', 1500); // game name, score

// Jukebox
track.jukeboxPlay({ title: 'Song Name', artist: 'Artist', url: 'url' });

// Photo booth
track.photoTaken('chicago_skyline'); // filter name

// Feature opened
track.featureOpened('games'); // feature name

// Comment submitted
track.commentSubmitted({ text: 'Great app!' });

// Then & Now viewed
track.thenAndNowViewed('State Street');

// Location switched
track.locationSwitched('location-1', 'location-2');
```

### Track Custom Events

```javascript
const { trackEvent } = useAnalytics();

trackEvent(
  'custom_action',      // event_type
  'engagement',         // category: 'engagement', 'content', 'game', 'navigation', 'conversion'
  { custom: 'data' }    // metadata (optional)
);
```

### Track Words for Cloud

```javascript
const { trackWords } = useAnalytics();

trackWords('This is amazing!', 'pin_message');
// Categories: 'pin_message', 'comment', 'hotdog_topping', etc.
```

### Track Popular Items

```javascript
const { trackPopularItem } = useAnalytics();

trackPopularItem('game', 'hotdog', 'Chicago Dog Challenge');
// Types: 'game', 'song', 'spot', 'menu_item'
```

## 📈 Analytics Dashboard Features

### Date Range Selector
- 7 days - Recent trends
- 30 days - Monthly overview
- 90 days - Quarterly analysis

### Metric Cards
Each card shows:
- Primary value (large number)
- Subtitle with context
- Icon and color coding
- Hover effects

### Word Cloud
- Size indicates frequency
- Color gradient (blue → purple → pink)
- Hover to see exact count
- Excludes common stop words
- Minimum 3 characters per word

### Popular Rankings
- Games ranked by play count
- Songs ranked by jukebox selections
- Visual indicators (colored badges)
- Interaction counts

### Daily Activity Chart
- Bar chart visualization
- Hover for exact values
- Date labels (rotated for space)
- Auto-scales to data range

## 🗄️ Database Schema

### analytics_events
```sql
id              UUID PRIMARY KEY
event_type      TEXT              -- 'pin_created', 'game_played', etc.
event_category  TEXT              -- 'engagement', 'content', 'game', etc.
user_session_id TEXT              -- Anonymous session ID
location_id     UUID              -- Kiosk location (if applicable)
metadata        JSONB             -- Event-specific data
created_at      TIMESTAMPTZ
```

### analytics_daily_metrics
```sql
id                          UUID PRIMARY KEY
date                        DATE
location_id                 UUID
pins_created               INTEGER
unique_users               INTEGER
games_played               INTEGER
jukebox_plays              INTEGER
photos_taken               INTEGER
orders_placed              INTEGER
avg_session_duration_seconds INTEGER
total_sessions             INTEGER
hotdog_games               INTEGER
trivia_games               INTEGER
deepdish_games             INTEGER
wind_games                 INTEGER
```

### analytics_word_frequency
```sql
id          UUID PRIMARY KEY
word        TEXT
category    TEXT              -- 'pin_message', 'comment', etc.
location_id UUID
count       INTEGER
last_seen   TIMESTAMPTZ
```

### analytics_sessions
```sql
id             UUID PRIMARY KEY
session_id     TEXT UNIQUE
location_id    UUID
started_at     TIMESTAMPTZ
ended_at       TIMESTAMPTZ
duration_seconds INTEGER
events_count   INTEGER
features_used  TEXT[]         -- Array of features accessed
device_type    TEXT           -- 'mobile', 'tablet', 'kiosk'
```

### analytics_popular_items
```sql
id                UUID PRIMARY KEY
item_type         TEXT           -- 'game', 'song', 'spot', 'menu_item'
item_id           TEXT
item_name         TEXT
location_id       UUID
interaction_count INTEGER
last_interaction  TIMESTAMPTZ
```

## 🔧 Utility Functions

### Aggregate Daily Metrics
```sql
SELECT aggregate_daily_metrics('2024-10-05'::date, NULL);
-- Aggregates all events for the date into daily_metrics
```

### Update Word Frequency
```sql
SELECT update_word_frequency('pizza', 'pin_message', NULL);
-- Increments count for the word in specified category
```

### Track Popular Item
```sql
SELECT track_popular_item('game', 'hotdog', 'Chicago Dog Challenge', NULL);
-- Increments interaction count for the item
```

## 📊 Sample Queries

### Get Top Words
```sql
SELECT word, count, category
FROM analytics_word_frequency
WHERE category = 'pin_message'
ORDER BY count DESC
LIMIT 20;
```

### Daily Session Breakdown
```sql
SELECT
  date,
  total_sessions,
  unique_users,
  pins_created,
  games_played
FROM analytics_daily_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Most Popular Games
```sql
SELECT
  item_name,
  interaction_count,
  last_interaction
FROM analytics_popular_items
WHERE item_type = 'game'
ORDER BY interaction_count DESC;
```

### Session Duration Analysis
```sql
SELECT
  AVG(duration_seconds) as avg_duration,
  MIN(duration_seconds) as min_duration,
  MAX(duration_seconds) as max_duration,
  COUNT(*) as total_sessions
FROM analytics_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days';
```

### Events by Category
```sql
SELECT
  event_category,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_session_id) as unique_users
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY event_category
ORDER BY event_count DESC;
```

## 🎨 Customization

### Change Date Ranges
```javascript
const { metrics } = useAnalyticsData(locationId, 60); // 60 days
```

### Filter by Location
```javascript
const { metrics } = useAnalyticsData('location-uuid-here', 30);
```

### Custom Word Cloud Colors
Edit `WordCloud.jsx`:
```javascript
const hue = 240 - (scale * 60); // Adjust gradient
const saturation = 70 + (scale * 20);
const lightness = 60 - (scale * 20);
```

### Custom Metric Cards
```javascript
<MetricCard
  title="Custom Metric"
  value={customValue}
  subtitle="Description"
  icon="🎯"
  color="#your-color"
/>
```

## 🔒 Privacy & Security

### Anonymous Tracking
- No personally identifiable information collected
- Session IDs are random, anonymous strings
- Data stored securely in Supabase

### Data Retention
```sql
-- Delete old events (e.g., older than 90 days)
DELETE FROM analytics_events
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- Delete old sessions
DELETE FROM analytics_sessions
WHERE started_at < CURRENT_DATE - INTERVAL '90 days';
```

### RLS Policies
All analytics tables have public read/write access for anonymous tracking:
```sql
CREATE POLICY "Allow insert for analytics_events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read for analytics_events"
  ON analytics_events FOR SELECT
  USING (true);
```

## 📱 Multi-Location Analytics

### View All Locations
```javascript
const { metrics } = useAnalyticsData(null, 30); // null = all locations
```

### Compare Locations
```javascript
const location1Data = useAnalyticsData('location-1-uuid', 30);
const location2Data = useAnalyticsData('location-2-uuid', 30);
```

### Location-Specific Words
```sql
SELECT word, count
FROM analytics_word_frequency
WHERE location_id = 'your-location-uuid'
  AND category = 'pin_message'
ORDER BY count DESC;
```

## 🚀 Performance

### Indexes Created
- `event_type` - Fast filtering by event
- `event_category` - Category aggregation
- `created_at` - Date range queries
- `location_id` - Location filtering
- `user_session_id` - Session analysis

### Optimization Tips
1. **Use daily_metrics** for historical data instead of raw events
2. **Aggregate old data** periodically using `aggregate_daily_metrics()`
3. **Delete old events** after aggregation to save space
4. **Use date ranges** - Don't query all-time data unnecessarily

### Batch Aggregation
```sql
-- Aggregate last 30 days
DO $$
DECLARE
  target_date DATE;
BEGIN
  FOR target_date IN
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '1 day',
      INTERVAL '1 day'
    )::DATE
  LOOP
    PERFORM aggregate_daily_metrics(target_date, NULL);
  END LOOP;
END $$;
```

## 🐛 Troubleshooting

### No Data Showing
1. Verify migration ran successfully
2. Check RLS policies are enabled
3. Ensure events are being tracked (check browser console)
4. Verify Supabase connection

### Word Cloud Empty
- Check `analytics_word_frequency` table has data
- Verify `trackWords()` is being called
- Ensure messages have 3+ character words
- Check category filter matches

### Metrics Not Updating
- Real-time subscriptions may need reconnection
- Check browser network tab for Supabase errors
- Verify `loadAnalytics()` is being called
- Try manual refresh with `reload()` function

## 📚 Examples

### Full Tracking Implementation
```javascript
import { useAnalytics } from '../hooks/useAnalytics';

function PinCreator() {
  const { track } = useAnalytics();

  const createPin = async (formData) => {
    // Save pin to database
    const pin = await savePin(formData);

    // Track analytics
    track.pinCreated({
      lat: pin.lat,
      lng: pin.lng,
      message: pin.message,
      team: pin.team
    });

    // Track words for cloud
    if (pin.message) {
      await trackWords(pin.message, 'pin_message');
    }
  };

  return <PinForm onSubmit={createPin} />;
}
```

### Custom Dashboard
```javascript
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import WordCloud from '../components/WordCloud';

function CustomDashboard() {
  const { metrics, wordCloud, popularItems } = useAnalyticsData(null, 7);

  return (
    <div>
      <h1>Weekly Report</h1>
      <div>Total Users: {metrics?.uniqueUsers}</div>
      <div>Total Pins: {metrics?.pinsCreated}</div>
      <WordCloud words={wordCloud} />
      <PopularList items={popularItems} />
    </div>
  );
}
```

## 🔄 Updates & Maintenance

### Regular Tasks
1. **Daily**: Check metrics are aggregating
2. **Weekly**: Review popular content
3. **Monthly**: Analyze trends and optimize features
4. **Quarterly**: Archive old data, update visualizations

### Backup Analytics Data
```sql
-- Export to CSV
COPY analytics_daily_metrics TO '/path/to/backup.csv' CSV HEADER;

-- Create backup table
CREATE TABLE analytics_events_backup AS
SELECT * FROM analytics_events
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
```
