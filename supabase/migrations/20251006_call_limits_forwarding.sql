-- Call Limits and Forwarding Configuration
-- Adds monthly call limits per package and forwarding number support

-- Add call limit and forwarding columns to phone_numbers
ALTER TABLE phone_numbers
ADD COLUMN IF NOT EXISTS monthly_call_limit INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS calls_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_period_start DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS forwarding_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forwarding_number TEXT,
ADD COLUMN IF NOT EXISTS forward_on_limit_reached BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forward_on_unable_to_help BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forward_after_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'starter';

COMMENT ON COLUMN phone_numbers.monthly_call_limit IS 'Maximum inbound calls allowed per month based on package tier';
COMMENT ON COLUMN phone_numbers.calls_used_this_month IS 'Number of calls used in current billing period';
COMMENT ON COLUMN phone_numbers.billing_period_start IS 'Start date of current billing period (resets monthly)';
COMMENT ON COLUMN phone_numbers.forwarding_number IS 'Phone number to forward calls to (E.164 format)';
COMMENT ON COLUMN phone_numbers.forward_on_limit_reached IS 'Forward calls when monthly limit is reached';
COMMENT ON COLUMN phone_numbers.forward_on_unable_to_help IS 'Forward when AI cannot help or user requests human';
COMMENT ON COLUMN phone_numbers.forward_after_hours IS 'Forward calls outside business hours';
COMMENT ON COLUMN phone_numbers.package_tier IS 'Package tier: starter, professional, enterprise, custom';

-- Package tier definitions with call limits
COMMENT ON COLUMN phone_numbers.package_tier IS E'Package tiers:\n- starter: 100 calls/month ($99/mo)\n- professional: 250 calls/month ($199/mo)\n- enterprise: 500 calls/month ($349/mo)\n- unlimited: Unlimited calls ($499/mo)';

-- Update existing record with defaults
UPDATE phone_numbers
SET
  monthly_call_limit = 100,
  calls_used_this_month = 0,
  billing_period_start = CURRENT_DATE,
  forwarding_enabled = true,
  forwarding_number = NULL, -- To be configured by user
  forward_on_limit_reached = true,
  forward_on_unable_to_help = true,
  forward_after_hours = true,
  package_tier = 'starter'
WHERE tenant_id = 'chicago-mikes';

-- Function to check if call limit is reached
CREATE OR REPLACE FUNCTION check_call_limit(p_phone_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limit INTEGER;
  v_used INTEGER;
  v_billing_start DATE;
BEGIN
  SELECT monthly_call_limit, calls_used_this_month, billing_period_start
  INTO v_limit, v_used, v_billing_start
  FROM phone_numbers
  WHERE id = p_phone_id;

  -- Reset counter if new billing period
  IF v_billing_start + INTERVAL '1 month' <= CURRENT_DATE THEN
    UPDATE phone_numbers
    SET calls_used_this_month = 0,
        billing_period_start = CURRENT_DATE
    WHERE id = p_phone_id;
    RETURN false; -- Not at limit after reset
  END IF;

  -- Check if at limit
  RETURN v_used >= v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment call counter
CREATE OR REPLACE FUNCTION increment_call_counter(p_phone_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- Check and reset billing period if needed
  PERFORM check_call_limit(p_phone_id);

  -- Increment counter
  UPDATE phone_numbers
  SET calls_used_this_month = calls_used_this_month + 1
  WHERE id = p_phone_id
  RETURNING calls_used_this_month INTO v_new_count;

  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get call limit info
CREATE OR REPLACE FUNCTION get_call_limit_info(p_phone_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'monthly_limit', monthly_call_limit,
    'calls_used', calls_used_this_month,
    'calls_remaining', GREATEST(0, monthly_call_limit - calls_used_this_month),
    'limit_reached', calls_used_this_month >= monthly_call_limit,
    'billing_period_start', billing_period_start,
    'billing_period_end', billing_period_start + INTERVAL '1 month',
    'package_tier', package_tier,
    'forwarding_enabled', forwarding_enabled,
    'forwarding_number', forwarding_number
  ) INTO v_result
  FROM phone_numbers
  WHERE id = p_phone_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create call_usage_history table for tracking
CREATE TABLE IF NOT EXISTS call_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  call_sid TEXT,
  caller_number TEXT,
  call_type TEXT, -- 'inbound', 'forwarded', 'voicemail'
  duration_seconds INTEGER,
  cost_usd DECIMAL(10, 4),
  was_forwarded BOOLEAN DEFAULT false,
  forward_reason TEXT, -- 'limit_reached', 'unable_to_help', 'after_hours', 'user_request'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_usage_phone ON call_usage_history(phone_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_tenant ON call_usage_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_usage_created ON call_usage_history(created_at);

-- Enable RLS
ALTER TABLE call_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY call_usage_service_policy ON call_usage_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY call_usage_read_policy ON call_usage_history
  FOR SELECT
  USING (true);

-- Create view for monthly usage stats
CREATE OR REPLACE VIEW monthly_call_stats AS
SELECT
  ph.tenant_id,
  ph.package_tier,
  ph.monthly_call_limit,
  ph.calls_used_this_month,
  ph.billing_period_start,
  ph.billing_period_start + INTERVAL '1 month' as billing_period_end,
  GREATEST(0, ph.monthly_call_limit - ph.calls_used_this_month) as calls_remaining,
  ROUND((ph.calls_used_this_month::DECIMAL / NULLIF(ph.monthly_call_limit, 0)) * 100, 2) as usage_percentage,
  COUNT(DISTINCT cuh.id) FILTER (WHERE cuh.was_forwarded = true) as forwarded_calls_count,
  COUNT(DISTINCT cuh.id) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_calls_this_period,
  SUM(cuh.duration_seconds) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_duration_seconds,
  SUM(cuh.cost_usd) FILTER (WHERE cuh.created_at >= ph.billing_period_start) as total_cost_usd
FROM phone_numbers ph
LEFT JOIN call_usage_history cuh ON cuh.phone_id = ph.id
GROUP BY ph.id, ph.tenant_id, ph.package_tier, ph.monthly_call_limit,
         ph.calls_used_this_month, ph.billing_period_start;

-- Sample usage tracking
INSERT INTO call_usage_history (phone_id, tenant_id, call_type, duration_seconds, cost_usd, was_forwarded, forward_reason)
SELECT
  id,
  tenant_id,
  'inbound',
  120, -- 2 minute call
  0.25, -- estimated cost
  false,
  NULL
FROM phone_numbers
WHERE tenant_id = 'chicago-mikes'
LIMIT 0; -- Don't insert, just structure example
