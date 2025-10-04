#!/usr/bin/env node
// run-migrations.mjs
// Script to run SQL migrations on Supabase
// Usage: node run-migrations.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nGet your service role key from:');
  console.error('   Supabase Dashboard → Project Settings → API → service_role key');
  console.error('\nUsage:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_key node run-migrations.mjs');
  process.exit(1);
}

// Create Supabase client with service role (admin) access
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const migrations = [
  {
    name: 'Add navigation settings columns',
    file: 'add-navigation-settings-columns.sql'
  },
  {
    name: 'Fix popular spots RLS policies',
    file: 'fix-popular-spots-rls.sql'
  }
];

async function runMigrations() {
  console.log('🚀 Starting migrations...\n');

  for (const migration of migrations) {
    try {
      console.log(`📝 Running: ${migration.name}`);
      const sql = readFileSync(migration.file, 'utf8');

      const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

      if (error) {
        // Try alternative method - direct query
        const { error: queryError } = await supabase.from('_migrations').insert({
          name: migration.name,
          sql: sql
        });

        if (queryError) {
          console.error(`❌ Error running ${migration.name}:`, error || queryError);
          console.log(`\n⚠️  Please run this SQL manually in Supabase SQL Editor:\n`);
          console.log('─'.repeat(80));
          console.log(sql);
          console.log('─'.repeat(80));
          continue;
        }
      }

      console.log(`✅ Completed: ${migration.name}\n`);
    } catch (err) {
      console.error(`❌ Error running ${migration.name}:`, err.message);
      console.log(`\n⚠️  Please run this SQL manually in Supabase SQL Editor:\n`);
      const sql = readFileSync(migration.file, 'utf8');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
      console.log('');
    }
  }

  console.log('✨ Migration process complete!');
}

runMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
