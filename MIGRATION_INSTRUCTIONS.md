# 🔧 RLS Error Fix - Migration Instructions

## Problem
The kiosk is experiencing RLS (Row Level Security) errors when trying to send alerts via the admin panel. This is because the RLS policy was too restrictive - it only allowed **authenticated** users to insert alerts, but the kiosk uses the **anonymous** key.

## Solution
A new migration has been created to fix the RLS policies:
- **File**: `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql`

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended - Easy)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"+ New Query"**
4. Copy the entire contents of `supabase/migrations/20251011_fix_kiosk_alerts_rls.sql`
5. Paste into the SQL editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" (this is normal for DDL statements)

### Option 2: Node.js Script (Advanced)

```bash
# Install dependencies if not already installed
npm install

# Apply the migration
node scripts/apply-migration.js supabase/migrations/20251011_fix_kiosk_alerts_rls.sql
```

### Option 3: Supabase CLI (If Installed)

```bash
# Install Supabase CLI if not installed
brew install supabase/tap/supabase  # macOS
# or npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## What This Migration Does

1. **Fixes kiosk_alerts RLS**
   - Drops the old restrictive policy
   - Creates a new policy that allows **both** anonymous and authenticated users to manage alerts

2. **Creates error_log table** (if not exists)
   - Stores errors captured by the webhook processor
   - Allows viewing error history in the admin panel

3. **Creates auto_fix_requests table** (if not exists)
   - Tracks autonomous healing fix requests
   - Stores PR URLs and fix status

4. **Enables realtime subscriptions** on these tables

## Verification

After applying the migration, test by:
1. Opening the admin panel on the kiosk
2. Going to the **Alerts** tab
3. Sending a test alert
4. You should see "✅ Alert sent successfully!" instead of an RLS error

## Autonomous Healing

The autonomous healing system has also been **enabled** in the default settings:
- `autonomousHealingEnabled: true`
- `autonomousHealingAutoMerge: false` (creates PRs for review - safe mode)
- Console errors and warnings are now being captured and sent to the webhook processor
- Critical errors will trigger auto-fix requests

## Webhook Logs

Errors are being logged to the `error_log` table. To view recent errors:

```sql
SELECT
  timestamp,
  severity,
  message,
  source
FROM error_log
ORDER BY timestamp DESC
LIMIT 50;
```

## Need Help?

If you encounter issues applying the migration:
1. Check the Supabase dashboard for any error messages
2. Verify your Supabase URL and keys are correct in `.env`
3. Make sure you have the necessary permissions on your Supabase project
4. The migration is idempotent (safe to run multiple times)
