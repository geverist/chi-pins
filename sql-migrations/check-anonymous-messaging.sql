-- Check if anonymous messaging columns exist and what data we have

-- 1. Check if columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'pins'
AND column_name IN ('allow_anonymous_messages', 'loyalty_email')
ORDER BY column_name;

-- 2. Check if anonymous_messages table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'anonymous_messages';

-- 3. Count pins with anonymous messaging enabled
SELECT
  COUNT(*) as total_pins,
  COUNT(CASE WHEN allow_anonymous_messages = true THEN 1 END) as pins_allowing_messages,
  COUNT(CASE WHEN allow_anonymous_messages = true AND (loyalty_phone IS NOT NULL OR loyalty_email IS NOT NULL) THEN 1 END) as pins_with_contact_info
FROM pins;

-- 4. Show example pins that allow anonymous messages
SELECT
  slug,
  name,
  allow_anonymous_messages,
  loyalty_phone,
  loyalty_email,
  created_at
FROM pins
WHERE allow_anonymous_messages = true
LIMIT 5;

-- 5. Show recent pins (to check current data)
SELECT
  slug,
  name,
  allow_anonymous_messages,
  loyalty_phone,
  loyalty_email,
  created_at
FROM pins
ORDER BY created_at DESC
LIMIT 5;
