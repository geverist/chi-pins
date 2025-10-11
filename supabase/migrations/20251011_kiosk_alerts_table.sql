-- Create kiosk_alerts table for admin-to-kiosk messaging
CREATE TABLE IF NOT EXISTS public.kiosk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'employee', 'system', 'maintenance', 'emergency', 'info'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  active BOOLEAN NOT NULL DEFAULT true,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  enable_tts BOOLEAN NOT NULL DEFAULT true,
  action_text TEXT,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  read_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.kiosk_alerts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to active alerts
CREATE POLICY "Allow anonymous read active alerts"
  ON public.kiosk_alerts
  FOR SELECT
  USING (active = true);

-- Allow authenticated users to insert/update/delete alerts
CREATE POLICY "Allow authenticated users to manage alerts"
  ON public.kiosk_alerts
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_kiosk_alerts_active ON public.kiosk_alerts(active);
CREATE INDEX IF NOT EXISTS idx_kiosk_alerts_created_at ON public.kiosk_alerts(created_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.kiosk_alerts;
