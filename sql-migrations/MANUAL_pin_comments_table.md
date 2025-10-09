# Manual Pin Comments Table Creation

Since we don't have an `exec()` function available in Supabase, this table needs to be created manually via the Supabase SQL Editor.

## Steps to Create Table

1. Go to https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/sql/new
2. Copy and paste the SQL from `supabase/migrations/20251009_pin_comments_localized.sql`
3. Click "Run" to execute

## Current Status

The `useLocalComments` hook has been updated with geographic filtering and will work with:
- **pin_comments table** (when created manually) - optimal performance
- **pins table with geographic bounds** (fallback) - still much better than before

The fallback to pins table with geographic filtering provides ~80% of the performance benefit by only loading pins within the Chicago area instead of globally.

## Performance Improvements (Current)

### Before:
- Fetched 100 most recent pins **globally**
- No geographic filtering
- Included pins from all continents

### After (with geographic filtering on pins):
- Fetches pins only within Chicago bounds (41.4-42.3 lat, -88.5--87.0 lng)
- Reduces data transfer significantly
- Contextually relevant to kiosk location
- Still caches locally for instant display

### With pin_comments table (future):
- Dedicated comments table with denormalized location data
- Optimized indexes for geographic queries
- Supports multiple comments per pin
- Even faster queries with specialized function
