-- Add threshold adjustment tracking to admin_settings
-- This enables rate limiting for automatic threshold adjustments (max once per hour)

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS last_threshold_adjustment TIMESTAMPTZ;

COMMENT ON COLUMN public.admin_settings.last_threshold_adjustment IS 'Timestamp of last automatic threshold adjustment by adaptive learning system. Used for rate limiting (max 1 adjustment per hour).';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_settings_last_adjustment
  ON public.admin_settings(tenant_id, last_threshold_adjustment);

COMMENT ON INDEX idx_admin_settings_last_adjustment IS 'Optimizes queries checking when thresholds were last adjusted';
