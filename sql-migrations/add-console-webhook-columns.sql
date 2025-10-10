-- Add console webhook configuration columns to admin_settings table

ALTER TABLE admin_settings
ADD COLUMN IF NOT EXISTS console_webhook_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS console_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS console_webhook_levels JSONB DEFAULT '["log", "error", "warn", "info"]'::jsonb;

-- Set default webhook URL to Vercel serverless function
UPDATE admin_settings
SET console_webhook_url = 'https://chi-pins.vercel.app/api/webhook-processor'
WHERE console_webhook_url IS NULL;

-- Enable webhook by default for chicago-mikes tenant
UPDATE admin_settings
SET console_webhook_enabled = true
WHERE tenant_id = 'chicago-mikes' AND console_webhook_enabled IS NULL;
