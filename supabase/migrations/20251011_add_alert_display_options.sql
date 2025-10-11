-- Add display style and duration options to kiosk_alerts table
ALTER TABLE public.kiosk_alerts
  ADD COLUMN IF NOT EXISTS display_style TEXT NOT NULL DEFAULT 'overlay', -- 'overlay' or 'scrollbar'
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER, -- Custom duration in seconds, NULL = manual dismiss only
  ADD COLUMN IF NOT EXISTS effect TEXT NOT NULL DEFAULT 'slide'; -- Animation effect

-- Add comment explaining the new fields
COMMENT ON COLUMN public.kiosk_alerts.display_style IS 'Display mode: "overlay" (fixed banner at top) or "scrollbar" (scrolling ticker)';
COMMENT ON COLUMN public.kiosk_alerts.duration_seconds IS 'Custom duration in seconds before auto-dismiss. NULL = manual dismiss only, overrides expires_at if set';
COMMENT ON COLUMN public.kiosk_alerts.effect IS 'Animation effect: "slide", "fade", "bounce", "shake", "glow", "none"';
