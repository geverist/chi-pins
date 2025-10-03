# Supabase Setup Instructions

This document contains all the SQL commands needed to set up the Chi-Pins database in Supabase.

## Order of Operations

Run these SQL files in the Supabase SQL Editor in this exact order:

### 1. Create Schema (Tables, Functions, RLS Policies)

```bash
# Run: supabase-schema.sql
```

This creates:
- `towns` table - 150 Chicago metro area towns with coordinates
- `fun_facts` table - 3 facts per town (450 total)
- `comments` table - User comments and upvotes for pins
- Helper functions for nearest town lookup and distance calculations
- Row Level Security (RLS) policies

### 2. Populate Towns Data

```bash
# Run: populate-towns.sql
```

This inserts all 150 Chicago metro area towns with:
- Name and slug
- Latitude/longitude coordinates
- Population
- County and state

### 3. Populate Fun Facts

**IMPORTANT**: The fun facts need to be created and managed directly in Supabase, not via local seed files.

Since we have 70 well-researched facts completed (from the agent research), you can either:

**Option A**: Insert the 70 completed facts now and add the remaining 80 later
**Option B**: Wait until all 450 facts are finalized

The fun_facts table structure:
```sql
CREATE TABLE fun_facts (
  id BIGSERIAL PRIMARY KEY,
  town_slug TEXT NOT NULL,  -- References towns.slug
  fact TEXT NOT NULL,
  fact_order INTEGER DEFAULT 1,  -- 1, 2, or 3 for each town
  FOREIGN KEY (town_slug) REFERENCES towns(slug)
);
```

To insert facts:
```sql
INSERT INTO fun_facts (town_slug, fact, fact_order) VALUES
  ('chicago', 'The Chicago River was reversed in 1900...', 1),
  ('chicago', 'Chicago produced 94 Nobel Prize Winners...', 2),
  ('chicago', 'The Chicago Post Office at 433 West Van Buren...', 3),
  -- ... continue for all towns
```

### 4. Create Comments Table

```bash
# Already included in supabase-schema.sql
```

The comments system allows:
- Users to upvote pins (one per user/IP per pin)
- Users to leave text comments on pins
- Automatic tracking of created_at timestamps

## Helper Functions Available

### Find Nearest Town
```sql
SELECT * FROM find_nearest_town(41.8781, -87.6298, 50);
-- Returns: town_name, town_slug, distance_miles
```

### Check if in Chicago Metro
```sql
SELECT is_in_chicago_metro(41.8781, -87.6298);
-- Returns: true/false
```

### Get Upvote Count
```sql
SELECT get_upvote_count(123);  -- pin_id
-- Returns: integer count
```

### Get Comment Count
```sql
SELECT get_comment_count(123);  -- pin_id
-- Returns: integer count
```

## Verification Queries

After setup, run these to verify:

```sql
-- Check towns count
SELECT COUNT(*) FROM towns;
-- Expected: 150

-- Check towns with coordinates
SELECT name, latitude, longitude FROM towns LIMIT 5;

-- Check fun facts count
SELECT COUNT(*) FROM fun_facts;
-- Expected: up to 450 when complete

-- Check fun facts per town
SELECT town_slug, COUNT(*) as fact_count
FROM fun_facts
GROUP BY town_slug
ORDER BY fact_count DESC;
-- Each town should have 3 facts

-- Test nearest town function
SELECT * FROM find_nearest_town(41.8781, -87.6298);
-- Should return Chicago

-- Test metro area check
SELECT is_in_chicago_metro(41.8781, -87.6298) as chicago,
       is_in_chicago_metro(34.0522, -118.2437) as la;
-- Chicago: true, LA: false
```

## Row Level Security (RLS)

All tables have RLS enabled:

- **towns**: Public read-only
- **fun_facts**: Public read-only
- **comments**:
  - Everyone can read
  - Anyone can insert
  - Users can update/delete their own comments only

## Next Steps in Application Code

After Supabase setup, update the application to:

1. ✅ Use `towns` table to show fun facts only within Chicago metro
2. ✅ Query `fun_facts` from Supabase (already using `useFunFacts` hook)
3. Remove share pin action from pins
4. Add comments/upvotes UI components
5. Create API endpoints for comments if needed

## Notes

- The `towns` table already exists in your Supabase instance
- Fun facts should be managed in Supabase, not local files
- The agent researched 70 high-quality facts; 80 more needed for all 150 towns
- Comments table supports both authenticated and anonymous users
- IP-based rate limiting prevents spam from anonymous users
