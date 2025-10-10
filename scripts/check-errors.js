// Check recent errors in error_log table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkErrors() {
  console.log('📊 Checking error_log table...\n');

  try {
    const { data, error, count } = await supabase
      .from('error_log')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error querying error_log:', error);
      return;
    }

    console.log(`Total errors: ${count || 0}\n`);

    if (data && data.length > 0) {
      console.log('Recent errors:');
      data.forEach((err, idx) => {
        console.log(`\n${idx + 1}. [${err.severity}] ${err.source || 'unknown'}`);
        console.log(`   Message: ${err.message}`);
        console.log(`   Time: ${err.timestamp}`);
        console.log(`   Auto-fix attempted: ${err.auto_fix_attempted || false}`);
        if (err.stack) {
          console.log(`   Stack: ${err.stack.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('No errors found in error_log table.');
      console.log('\n💡 This means:');
      console.log('   - Console webhook may not be sending errors yet');
      console.log('   - Or errors are being cleared automatically');
      console.log('   - Or no errors have occurred since webhook was enabled');
    }
  } catch (err) {
    console.error('❌ Failed to check errors:', err);
  }
}

checkErrors();
