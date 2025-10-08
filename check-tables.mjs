import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xxwqmakcrchgefgzrulf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'
);

console.log('Checking which tables exist in database...\n');

// Tables from ALL_MIGRATIONS_COMBINED.sql
const tablesToCheck = [
  'debug_logs',
  'audit_logs',
  'pins',
  'game_scores',
  'leads',
  'subscriptions',
  'locations',
  'voice_agent_calls',
  'call_recordings',
  'tenant_config',
  'user_tenant_assignments',
  'business_config',
  'hardware_shipments',
  'invoices',
  'twilio_phone_numbers',
  'analytics_events',
  'api_keys',
  'webhook_logs'
];

const results = { exists: [], missing: [] };

for (const table of tablesToCheck) {
  try {
    const { error } = await supabase.from(table).select('*').limit(0);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        results.missing.push(table);
        console.log(`❌ ${table} - MISSING`);
      } else {
        // Other error (e.g., permission issue, but table exists)
        results.exists.push(table);
        console.log(`✅ ${table} - EXISTS (error: ${error.message})`);
      }
    } else {
      results.exists.push(table);
      console.log(`✅ ${table} - EXISTS`);
    }
  } catch (err) {
    results.missing.push(table);
    console.log(`❌ ${table} - ERROR: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('SUMMARY:');
console.log('='.repeat(60));
console.log(`✅ Existing tables (${results.exists.length}): ${results.exists.join(', ')}`);
console.log(`❌ Missing tables (${results.missing.length}): ${results.missing.join(', ')}`);

console.log('\n' + '='.repeat(60));
if (results.missing.length > 0) {
  console.log('⚠️  NOT all migrations from ALL_MIGRATIONS_COMBINED.sql have been applied');
  console.log('Missing tables need to be created by running the full migration file.');
} else {
  console.log('✅ ALL migrations from ALL_MIGRATIONS_COMBINED.sql have been applied');
}
console.log('='.repeat(60));
