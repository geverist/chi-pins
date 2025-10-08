import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wklaqrqrcrhewhtvljkd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbGFxcnFyY3JoZXdodHZsamtkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzkwMTUyOSwiZXhwIjoyMDQzNDc3NTI5fQ.YfGX0uUidZ_iXLBwrJXZsKx-x4xz4rlKc3OznZT3AaI'
);

console.log('🔍 Checking pins table structure...\n');

// Try to select from pins table
try {
  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  const pin = data?.[0];
  if (pin) {
    console.log('📊 Sample pin data:');
    console.log(JSON.stringify(pin, null, 2));
    console.log(`\n✅ pinStyle column ${('pinStyle' in pin) ? 'EXISTS' : 'DOES NOT EXIST'}`);
  } else {
    console.log('No pins in database yet');
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}
