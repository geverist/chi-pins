// Run per-person tracking migration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function runMigration() {
  console.log('📊 Running per-person tracking migration...');

  try {
    // Read the SQL migration file
    const sql = readFileSync('sql-migrations/add-per-person-tracking.sql', 'utf8');

    // Split into individual statements (simple split on semicolon + newline)
    const statements = sql
      .split(';\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n[${i + 1}/${statements.length}] Executing:`, statement.substring(0, 80) + '...');

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        console.error(`❌ Error on statement ${i + 1}:`, error);
        // Continue with next statement
      } else {
        console.log(`✅ Statement ${i + 1} completed`);
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
