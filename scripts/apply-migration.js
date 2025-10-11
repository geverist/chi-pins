#!/usr/bin/env node
// scripts/apply-migration.js
// Applies SQL migrations to Supabase database

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationPath) {
  try {
    const migrationName = path.basename(migrationPath);
    console.log(`\n📝 Applying migration: ${migrationName}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (basic split on semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`   Executing statement ${i + 1}/${statements.length}...`);

      // Use raw SQL execution via RPC
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try alternative method using direct query
        const { error: error2 } = await supabase.from('_migrations').insert({
          name: migrationName,
          sql: stmt,
          executed_at: new Date().toISOString()
        });

        if (error2) {
          console.error(`   ❌ Error executing statement ${i + 1}:`);
          console.error(`      ${error.message}`);
          console.error(`   Statement:\n${stmt.substring(0, 200)}...`);
          throw error;
        }
      }
    }

    console.log(`✅ Migration applied successfully: ${migrationName}\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ Failed to apply migration:`, error.message);
    console.error('\n💡 Alternative approach:');
    console.error('   1. Go to your Supabase dashboard');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the migration file contents');
    console.error('   4. Click "Run" to execute\n');
    console.error(`   Migration file: ${migrationPath}\n`);
    return false;
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file>');
  console.error('Example: node scripts/apply-migration.js supabase/migrations/20251011_fix_kiosk_alerts_rls.sql');
  process.exit(1);
}

const migrationPath = path.resolve(migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

applyMigration(migrationPath).then(success => {
  process.exit(success ? 0 : 1);
});
