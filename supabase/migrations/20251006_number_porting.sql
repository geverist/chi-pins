-- Number Porting via Twilio Porting API
-- Allows customers to port existing phone numbers into the voice agent system

-- Create porting_requests table
CREATE TABLE IF NOT EXISTS porting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Number to port in E.164 format
  current_carrier TEXT,
  account_number TEXT,
  pin_code TEXT,
  billing_name TEXT NOT NULL,
  billing_address JSONB NOT NULL, -- {street, city, state, zip, country}
  authorized_person TEXT NOT NULL,

  -- Twilio porting details
  port_in_request_sid TEXT, -- Twilio PortInRequest SID
  port_in_phone_number_sid TEXT, -- Twilio PortInPhoneNumber SID

  -- Status tracking
  status TEXT DEFAULT 'draft', -- draft, submitted, pending, in_progress, completed, cancelled, failed
  status_details JSONB DEFAULT '{}'::jsonb,
  estimated_completion_date DATE,
  actual_completion_date DATE,

  -- Progress notifications
  notifications JSONB DEFAULT '[]'::jsonb,
  last_notification_at TIMESTAMPTZ,

  -- Documents
  loa_url TEXT, -- Letter of Authorization URL
  bill_copy_url TEXT, -- Copy of current carrier bill

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_porting_requests_tenant ON porting_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_porting_requests_status ON porting_requests(status);
CREATE INDEX IF NOT EXISTS idx_porting_requests_phone ON porting_requests(phone_number);

COMMENT ON TABLE porting_requests IS 'Phone number porting requests via Twilio';
COMMENT ON COLUMN porting_requests.status IS 'draft=not submitted, submitted=sent to Twilio, pending=awaiting carrier, in_progress=carrier processing, completed=ported successfully, cancelled=request cancelled, failed=port failed';
COMMENT ON COLUMN porting_requests.notifications IS 'Array of progress notifications with timestamps';

-- Create porting_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS porting_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  porting_request_id UUID NOT NULL REFERENCES porting_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_porting_status_request ON porting_status_history(porting_request_id);
CREATE INDEX IF NOT EXISTS idx_porting_status_created ON porting_status_history(created_at);

-- Enable RLS
ALTER TABLE porting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE porting_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY porting_requests_service_policy ON porting_requests
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY porting_requests_read_policy ON porting_requests
  FOR SELECT
  USING (true);

CREATE POLICY porting_status_service_policy ON porting_status_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY porting_status_read_policy ON porting_status_history
  FOR SELECT
  USING (true);

-- Function to add status update with notification
CREATE OR REPLACE FUNCTION add_porting_status_update(
  p_request_id UUID,
  p_status TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_notification JSONB;
BEGIN
  -- Insert status history
  INSERT INTO porting_status_history (
    porting_request_id,
    status,
    message,
    metadata
  )
  VALUES (
    p_request_id,
    p_status,
    p_message,
    p_metadata
  )
  RETURNING id INTO v_history_id;

  -- Update request status
  UPDATE porting_requests
  SET
    status = p_status,
    status_details = p_metadata,
    updated_at = NOW(),
    last_notification_at = NOW()
  WHERE id = p_request_id;

  -- Add notification to array
  v_notification = jsonb_build_object(
    'timestamp', NOW(),
    'status', p_status,
    'message', p_message
  );

  UPDATE porting_requests
  SET notifications = notifications || v_notification
  WHERE id = p_request_id;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get porting progress
CREATE OR REPLACE FUNCTION get_porting_progress(p_request_id UUID)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_progress INTEGER;
  v_stage TEXT;
BEGIN
  SELECT * INTO v_request
  FROM porting_requests
  WHERE id = p_request_id;

  -- Calculate progress percentage
  CASE v_request.status
    WHEN 'draft' THEN
      v_progress := 10;
      v_stage := 'Preparing documentation';
    WHEN 'submitted' THEN
      v_progress := 25;
      v_stage := 'Submitted to current carrier';
    WHEN 'pending' THEN
      v_progress := 40;
      v_stage := 'Awaiting carrier approval';
    WHEN 'in_progress' THEN
      v_progress := 70;
      v_stage := 'Carrier processing port';
    WHEN 'completed' THEN
      v_progress := 100;
      v_stage := 'Port completed successfully';
    WHEN 'cancelled' THEN
      v_progress := 0;
      v_stage := 'Port cancelled';
    WHEN 'failed' THEN
      v_progress := 0;
      v_stage := 'Port failed';
    ELSE
      v_progress := 0;
      v_stage := 'Unknown status';
  END CASE;

  RETURN json_build_object(
    'request_id', v_request.id,
    'phone_number', v_request.phone_number,
    'status', v_request.status,
    'progress_percentage', v_progress,
    'current_stage', v_stage,
    'estimated_completion', v_request.estimated_completion_date,
    'notifications_count', jsonb_array_length(v_request.notifications),
    'last_update', v_request.updated_at,
    'recent_notifications', (
      SELECT jsonb_agg(notif ORDER BY (notif->>'timestamp') DESC)
      FROM jsonb_array_elements(v_request.notifications) notif
      LIMIT 5
    )
  );
END;
$$ LANGUAGE plpgsql;

-- View for porting dashboard
CREATE OR REPLACE VIEW porting_dashboard AS
SELECT
  pr.id,
  pr.tenant_id,
  pr.phone_number,
  pr.status,
  pr.estimated_completion_date,
  pr.created_at,
  pr.updated_at,
  jsonb_array_length(pr.notifications) as notification_count,
  pr.notifications->-1 as latest_notification,
  CASE pr.status
    WHEN 'draft' THEN 10
    WHEN 'submitted' THEN 25
    WHEN 'pending' THEN 40
    WHEN 'in_progress' THEN 70
    WHEN 'completed' THEN 100
    ELSE 0
  END as progress_percentage,
  COUNT(psh.id) as status_changes
FROM porting_requests pr
LEFT JOIN porting_status_history psh ON psh.porting_request_id = pr.id
GROUP BY pr.id;

-- Sample porting request data structure (don't insert)
INSERT INTO porting_requests (
  tenant_id,
  phone_number,
  current_carrier,
  billing_name,
  billing_address,
  authorized_person,
  status
)
SELECT
  'chicago-mikes',
  '+13125551234',
  'Verizon',
  'John Doe',
  '{"street": "123 Main St", "city": "Chicago", "state": "IL", "zip": "60601", "country": "US"}'::jsonb,
  'John Doe',
  'draft'
LIMIT 0; -- Don't actually insert, just show structure
