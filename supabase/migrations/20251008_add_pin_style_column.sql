-- Add pinStyle column to pins table for custom pin styles
-- Allows users to select Chicago team/affiliation themed pins

ALTER TABLE pins
ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN pins."pinStyle" IS 'Custom pin style ID (bears, bulls, cubs, whitesox, blackhawks, chicagostar)';

-- Create index for filtering by pin style
CREATE INDEX IF NOT EXISTS idx_pins_pin_style ON pins("pinStyle");
