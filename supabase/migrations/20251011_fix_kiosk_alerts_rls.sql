-- Fix RLS policies for kiosk_alerts table
-- Problem: The previous policy only allowed authenticated users to insert alerts,
-- but the kiosk uses the anonymous key, causing RLS errors when sending alerts.
--
-- Solution: Allow anonymous users to insert/update/delete alerts as well.

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users to manage alerts" ON public.kiosk_alerts;

-- Create new permissive policy that allows both authenticated AND anonymous users
-- to manage alerts (kiosk admins use admin panel which runs as anon)
CREATE POLICY "Allow all users to manage alerts"
  ON public.kiosk_alerts
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Alternative: If you want to be more restrictive, you could check for a specific
-- tenant_id or require a service role for delete operations. For now, we'll keep
-- it open since this is an internal admin tool.

-- Also create/update error_log table RLS if it doesn't exist
-- This is where the webhook processor stores errors
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  level TEXT NOT NULL, -- 'error', 'warn', 'info'
  severity TEXT, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  source TEXT, -- 'kiosk', 'web', 'mobile'
  tenant_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on error_log
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- Allow webhook processor (service role) to insert errors
CREATE POLICY "Allow service role to insert errors"
  ON public.error_log
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (true);

-- Allow reading errors (for admin panel)
CREATE POLICY "Allow all to read errors"
  ON public.error_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create auto_fix_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.auto_fix_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fix_id TEXT NOT NULL UNIQUE,
  error_details JSONB NOT NULL,
  source TEXT,
  tenant_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  fix_applied_at TIMESTAMPTZ,
  pr_url TEXT,
  commit_sha TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on auto_fix_requests
ALTER TABLE public.auto_fix_requests ENABLE ROW LEVEL SECURITY;

-- Allow webhook processor to insert fix requests
CREATE POLICY "Allow service role to manage fix requests"
  ON public.auto_fix_requests
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_log_timestamp ON public.error_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_severity ON public.error_log(severity);
CREATE INDEX IF NOT EXISTS idx_error_log_tenant ON public.error_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_fix_status ON public.auto_fix_requests(status);
CREATE INDEX IF NOT EXISTS idx_auto_fix_created ON public.auto_fix_requests(created_at DESC);

-- Enable realtime for these tables (only if not already added)
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS, so we'll use DO blocks
DO $$
BEGIN
  -- Add error_log to realtime if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'error_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.error_log;
  END IF;

  -- Add auto_fix_requests to realtime if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'auto_fix_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_fix_requests;
  END IF;
END $$;
