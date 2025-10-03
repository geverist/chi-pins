# Database Setup Guide

This guide covers the SQL migrations needed to set up the Chi-Pins kiosk database in Supabase.

## Required Tables

### 1. Game Scores Table (for leaderboards)

**Location:** `create-game-scores-table.sql`

**Purpose:** Stores game leaderboard scores for all three games (Chicago Dog Challenge, Chicago Trivia, Deep Dish Toss)

**To create:**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `create-game-scores-table.sql`
4. Click "Run" to execute

**Verification:**
After running, you should see a new table called `game_scores` in your database with these columns:
- `id` (UUID, primary key)
- `game` (TEXT) - game identifier like "hotdog-assembly", "chicago-trivia", "deep-dish-toss"
- `initials` (TEXT) - 3-character player initials
- `score` (INTEGER) - player's score
- `accuracy` (DECIMAL) - optional accuracy percentage
- `time` (DECIMAL) - optional time in seconds
- `created_at` (TIMESTAMPTZ) - when the score was submitted

### 2. Navigation Settings Table

**Location:** `create-navigation-settings-table.sql`

**Purpose:** Stores footer navigation visibility configuration

**To create:**
1. Open SQL Editor in Supabase
2. Copy and paste the contents of `create-navigation-settings-table.sql`
3. Click "Run"

### 3. Logo Storage Bucket

**Location:** `create-logo-storage.sql`

**Purpose:** Storage bucket for custom logo uploads

**To create:**
1. Open SQL Editor in Supabase
2. Copy and paste the contents of `create-logo-storage.sql`
3. Click "Run"

## Troubleshooting

### Game leaderboards not showing
- Check browser console for errors
- Verify `game_scores` table exists in Supabase
- Check that RLS policies are enabled (should show "Allow public read access" and "Allow public insert access")
- Verify environment variables are set in Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### Console error: "Failed to fetch leaderboard: 404"
- The `game_scores` table doesn't exist yet
- Run `create-game-scores-table.sql` in Supabase SQL Editor

### Console error: "Failed to fetch leaderboard: 403"
- RLS policies are not set correctly
- Re-run the CREATE POLICY statements from `create-game-scores-table.sql`

### Scores submit but don't appear on leaderboard
- Check browser console for errors during submit
- Verify the score was saved: In Supabase, go to Table Editor > game_scores
- Try refreshing the page - the leaderboard should auto-refresh after submission

## Testing

After setup, test the leaderboards:

1. Open the app
2. Click "🎮 Games" in the footer
3. Select any game and play
4. Submit a score with your initials
5. Verify it appears in the leaderboard
6. Check that the leaderboard shows on subsequent game plays
