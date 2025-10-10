#!/usr/bin/env node
// Delete test errors from error_log
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function deleteTestErrors() {
  console.log('🧹 Deleting test errors...\n');

  try {
    // Delete errors from test sources
    const { data, error } = await supabase
      .from('error_log')
      .delete()
      .or('source.eq.test-script,source.eq.test-kiosk,source.eq.test,message.ilike.%test%')
      .select();

    if (error) throw error;

    console.log(`✅ Deleted ${data?.length || 0} test errors\n`);

    if (data && data.length > 0) {
      console.log('Deleted:');
      data.forEach((e, i) => {
        console.log(`  ${i + 1}. [${e.source}] ${e.message.slice(0, 60)}...`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

deleteTestErrors();
