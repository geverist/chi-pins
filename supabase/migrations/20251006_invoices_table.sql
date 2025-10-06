-- Invoices table for billing history
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'open', 'paid', 'void', 'uncollectible')
  ),

  -- Amounts (in cents for precision)
  subtotal INTEGER NOT NULL, -- Base price before tax
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER NOT NULL,

  -- Currency
  currency TEXT DEFAULT 'usd' NOT NULL,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Payment details
  payment_method TEXT CHECK (
    payment_method IN ('card', 'bank_transfer', 'check', 'other')
  ),
  paid_at TIMESTAMPTZ,

  -- Line items (detailed breakdown)
  line_items JSONB DEFAULT '[]'::jsonb,
  -- Example:
  -- [
  --   {"description": "Professional Plan (1 location)", "amount": 79900},
  --   {"description": "AI Voice Agent Add-on", "amount": 20000},
  --   {"description": "SMS Notifications", "amount": 4900},
  --   {"description": "Volume Discount (10%)", "amount": -10490}
  -- ]

  -- Metadata
  notes TEXT,
  due_date DATE,

  -- PDF invoice
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT, -- Stripe-hosted invoice page

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system can insert/update invoices
CREATE POLICY "System can insert invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  year_month TEXT;
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYYMM');

  SELECT COALESCE(MAX(
    SUBSTRING(invoice_number FROM '[0-9]+$')::INTEGER
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_month || '-%';

  RETURN 'INV-' || year_month || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate invoice totals from line items
CREATE OR REPLACE FUNCTION calculate_invoice_total(line_items_json JSONB)
RETURNS INTEGER AS $$
DECLARE
  item JSONB;
  total INTEGER := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(line_items_json)
  LOOP
    total := total + (item->>'amount')::INTEGER;
  END LOOP;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE invoices IS 'Stores billing invoices and payment history';
COMMENT ON COLUMN invoices.subtotal IS 'Amount in cents before tax';
COMMENT ON COLUMN invoices.total IS 'Final amount in cents including tax';
COMMENT ON COLUMN invoices.line_items IS 'Detailed breakdown of charges';
