-- Add console webhook settings to admin_settings table
-- This allows remote monitoring of console events via webhook

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS console_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS console_webhook_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS console_webhook_levels TEXT[] DEFAULT ARRAY['log', 'error', 'warn', 'info'],
ADD COLUMN IF NOT EXISTS console_webhook_batch_delay_ms INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS console_webhook_max_batch_size INTEGER DEFAULT 50;

COMMENT ON COLUMN admin_settings.console_webhook_url IS 'Webhook URL to send console events to for remote monitoring';
COMMENT ON COLUMN admin_settings.console_webhook_enabled IS 'Enable/disable console webhook monitoring';
COMMENT ON COLUMN admin_settings.console_webhook_levels IS 'Which console levels to capture (log, error, warn, info)';
COMMENT ON COLUMN admin_settings.console_webhook_batch_delay_ms IS 'Delay before sending batched events (milliseconds)';
COMMENT ON COLUMN admin_settings.console_webhook_max_batch_size IS 'Maximum number of events to batch before sending';
