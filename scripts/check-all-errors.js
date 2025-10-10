import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('📊 Checking ALL errors in error_log...\n');

const { data, error, count } = await supabase
  .from('error_log')
  .select('*', { count: 'exact' })
  .order('timestamp', { ascending: false })
  .limit(50);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Total errors: ${count || 0}\n`);

if (data && data.length > 0) {
  data.forEach((err, index) => {
    console.log(`${index + 1}. [${err.severity}] ${err.source || 'unknown'}`);
    console.log(`   Message: ${err.message.slice(0, 80)}...`);
    console.log(`   Time: ${err.timestamp}`);
    console.log(`   Tenant: ${err.tenant_id || 'none'}`);
    console.log(`   Auto-fix attempted: ${err.auto_fix_attempted}`);
    console.log(`   Stack: ${err.stack?.slice(0, 80) || 'none'}...`);
    console.log('');
  });
} else {
  console.log('No errors found.');
}
