import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const sql = fs.readFileSync('sql-migrations/add-console-webhook-columns.sql', 'utf8');

console.log('Running migration...');
console.log(sql);

// Execute via RPC if available, otherwise use direct query
try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    console.log('\nNote: If exec_sql function doesn\'t exist, you may need to run this via psql or Supabase dashboard SQL editor');
  } else {
    console.log('Migration completed successfully!');
  }
} catch (err) {
  console.error('Error:', err.message);
  console.log('\nPlease run this SQL in the Supabase dashboard SQL editor:');
  console.log(sql);
}
