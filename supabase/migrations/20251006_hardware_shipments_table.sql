-- Hardware shipments tracking table
CREATE TABLE IF NOT EXISTS public.hardware_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Package details
  package_type TEXT NOT NULL CHECK (
    package_type IN ('standard', 'premium', 'enterprise_custom')
  ),

  -- Hardware components (what's in the box)
  items JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"name": "iPad Pro 12.9\"", "quantity": 1, "serial": "DMQXXXXXXX"},
  --   {"name": "Floor Stand", "quantity": 1, "serial": ""},
  --   {"name": "Card Reader", "quantity": 1, "serial": ""}
  -- ]

  -- Shipping address
  shipping_address JSONB NOT NULL,
  -- Example:
  -- {
  --   "name": "Chicago Mike's",
  --   "street": "123 Main St",
  --   "city": "Chicago",
  --   "state": "IL",
  --   "zip": "60601",
  --   "country": "US",
  --   "phone": "+1-312-555-0123"
  -- }

  -- Tracking information
  carrier TEXT CHECK (
    carrier IN ('ups', 'fedex', 'usps', 'dhl', 'other')
  ),
  tracking_number TEXT,
  tracking_url TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (
    status IN ('preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned')
  ),

  -- Important dates
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Installation scheduling
  installation_required BOOLEAN DEFAULT true,
  installation_scheduled_date DATE,
  installation_completed_date DATE,
  installer_name TEXT,
  installer_contact TEXT,

  -- Tracking events history
  tracking_events JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"timestamp": "2025-10-06T10:00:00Z", "status": "shipped", "location": "Chicago, IL"},
  --   {"timestamp": "2025-10-07T14:30:00Z", "status": "in_transit", "location": "Indianapolis, IN"},
  --   {"timestamp": "2025-10-08T09:15:00Z", "status": "delivered", "location": "Customer Location"}
  -- ]

  -- Metadata
  notes TEXT,
  internal_notes TEXT, -- Only visible to admins

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hardware_shipments_subscription_id ON hardware_shipments(subscription_id);
CREATE INDEX idx_hardware_shipments_user_id ON hardware_shipments(user_id);
CREATE INDEX idx_hardware_shipments_status ON hardware_shipments(status);
CREATE INDEX idx_hardware_shipments_tracking_number ON hardware_shipments(tracking_number);
CREATE INDEX idx_hardware_shipments_delivered_at ON hardware_shipments(delivered_at);

-- RLS Policies
ALTER TABLE hardware_shipments ENABLE ROW LEVEL SECURITY;

-- Users can view their own shipments
CREATE POLICY "Users can view own hardware shipments"
  ON hardware_shipments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert/update shipments
CREATE POLICY "System can insert hardware shipments"
  ON hardware_shipments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update hardware shipments"
  ON hardware_shipments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_hardware_shipments_updated_at
  BEFORE UPDATE ON hardware_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update subscription hardware_status when shipment status changes
CREATE OR REPLACE FUNCTION sync_hardware_status_to_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subscription's hardware_status to match shipment status
  UPDATE subscriptions
  SET hardware_status = NEW.status
  WHERE id = NEW.subscription_id;

  -- If hardware is delivered, start billing (if not already active)
  IF NEW.status = 'delivered' THEN
    UPDATE subscriptions
    SET
      status = 'active',
      billing_start_date = CURRENT_DATE,
      current_period_start = NOW(),
      current_period_end = NOW() + INTERVAL '1 month'
    WHERE id = NEW.subscription_id
      AND status = 'pending_hardware';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync hardware status
CREATE TRIGGER sync_hardware_status_on_update
  AFTER UPDATE OF status ON hardware_shipments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_hardware_status_to_subscription();

-- Function to add tracking event to history
CREATE OR REPLACE FUNCTION add_tracking_event(
  shipment_id UUID,
  event_status TEXT,
  event_location TEXT DEFAULT NULL,
  event_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_event JSONB;
BEGIN
  new_event := jsonb_build_object(
    'timestamp', NOW(),
    'status', event_status,
    'location', event_location,
    'notes', event_notes
  );

  UPDATE hardware_shipments
  SET tracking_events = tracking_events || new_event
  WHERE id = shipment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate delivery date based on carrier and distance
CREATE OR REPLACE FUNCTION estimate_delivery_date(
  carrier_name TEXT,
  origin_zip TEXT,
  dest_zip TEXT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  business_days INTEGER;
BEGIN
  -- Simple estimation logic (can be enhanced with actual carrier APIs)
  business_days := CASE carrier_name
    WHEN 'ups' THEN 3
    WHEN 'fedex' THEN 2
    WHEN 'usps' THEN 5
    WHEN 'dhl' THEN 2
    ELSE 4
  END;

  -- Add business days (skip weekends)
  RETURN NOW() + (business_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE hardware_shipments IS 'Tracks hardware kiosk shipments and delivery status';
COMMENT ON COLUMN hardware_shipments.status IS 'Current shipment status. When status changes to "delivered", billing automatically starts.';
COMMENT ON COLUMN hardware_shipments.tracking_events IS 'Historical log of all tracking updates';
COMMENT ON FUNCTION sync_hardware_status_to_subscription() IS 'Automatically updates subscription status and starts billing when hardware is delivered';
