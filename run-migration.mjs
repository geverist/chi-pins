// run-migration.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://wklaqrqrcrhewhtvljkd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbGFxcnFyY3JoZXdodHZsamtkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzkwMTUyOSwiZXhwIjoyMDQzNDc3NTI5fQ.YfGX0uUidZ_iXLBwrJXZsKx-x4xz4rlKc3OznZT3AaI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking and running pinStyle migration...\n');

// Read the migration SQL
const sql = readFileSync('./supabase/migrations/20251008_add_pin_style_column.sql', 'utf-8');

console.log('SQL to execute:');
console.log(sql);
console.log('\n📝 Executing migration via Supabase SQL...\n');

// Execute each statement
const statements = [
  'ALTER TABLE pins ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;',
  'CREATE INDEX IF NOT EXISTS idx_pins_pin_style ON pins("pinStyle");'
];

for (const stmt of statements) {
  console.log(`Running: ${stmt}`);

  const { data, error } = await supabase.rpc('exec', { sql: stmt });

  if (error) {
    console.log(`Note: ${error.message} (this might be OK if column exists)`);
  } else {
    console.log('✅ Success');
  }
}

// Verify by selecting from pins
console.log('\n🔎 Verifying...');
const { data: pins, error } = await supabase
  .from('pins')
  .select('id, pinStyle')
  .limit(5);

if (error) {
  console.error('❌ Verification failed:', error.message);
} else {
  console.log(`✅ Verified! Sample pins:`, pins);
}

console.log('\n✨ Done!');
