// check-migrations.js
// Quick script to check which migrations have been run
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://wklaqrqrcrhewhtvljkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbGFxcnFyY3JoZXdodHZsamtkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzkwMTUyOSwiZXhwIjoyMDQzNDc3NTI5fQ.YfGX0uUidZ_iXLBwrJXZsKx-x4xz4rlKc3OznZT3AaI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking existing tables...\n');

  const { data, error } = await supabase.rpc('exec', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  });

  if (error) {
    console.error('Error querying tables:', error);

    // Try direct query instead
    const { data: tables, error: err2 } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (err2) {
      console.error('Also failed:', err2);
      process.exit(1);
    }

    console.log('Existing tables:', tables?.map(t => t.table_name) || []);
    return tables?.map(t => t.table_name) || [];
  }

  console.log('Existing tables:', data?.map(t => t.table_name) || []);
  return data?.map(t => t.table_name) || [];
}

async function getMigrationFiles() {
  const migrationsDir = './supabase/migrations';
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('\nMigration files found:', files.length);
  return files;
}

async function executeMigration(filename) {
  console.log(`\n📝 Executing: ${filename}`);

  const filepath = join('./supabase/migrations', filename);
  const sql = readFileSync(filepath, 'utf-8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error in ${filename}:`, error.message);
      return false;
    }

    console.log(`✅ Success: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Exception in ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking Supabase migrations...\n');

  const existingTables = await checkTables();
  const migrationFiles = await getMigrationFiles();

  console.log('\n📊 Analysis:');
  console.log(`Existing tables: ${existingTables.length}`);
  console.log(`Migration files: ${migrationFiles.length}`);

  // Check for pinStyle column
  console.log('\n🔎 Checking for pinStyle column...');
  const { data: columns } = await supabase.rpc('exec', {
    query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'pins' AND table_schema = 'public'`
  });

  const hasPinStyle = columns?.some(c => c.column_name === 'pinStyle');
  console.log(`pinStyle column exists: ${hasPinStyle ? '✅ Yes' : '❌ No'}`);

  if (!hasPinStyle) {
    console.log('\n🚀 Running pinStyle migration...');
    await executeMigration('20251008_add_pin_style_column.sql');
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
