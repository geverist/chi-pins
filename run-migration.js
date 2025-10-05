// Run migration to add allow_anonymous_messages column
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.production');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Execute migration using RPC call
async function runMigration() {
  console.log('Running migration to add allow_anonymous_messages column...\n');

  try {
    // Use the supabase client to execute raw SQL via RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE pins
        ADD COLUMN IF NOT EXISTS allow_anonymous_messages BOOLEAN DEFAULT false;
      `
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n⚠️  Please run this SQL manually in the Supabase SQL Editor:');
      console.log('1. Go to https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/sql');
      console.log('2. Paste this SQL:');
      console.log('\nALTER TABLE pins ADD COLUMN IF NOT EXISTS allow_anonymous_messages BOOLEAN DEFAULT false;\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('Column "allow_anonymous_messages" added to pins table');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n⚠️  Please run this SQL manually in the Supabase SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/xxwqmakcrchgefgzrulf/sql');
    console.log('2. Paste this SQL:');
    console.log('\nALTER TABLE pins ADD COLUMN IF NOT EXISTS allow_anonymous_messages BOOLEAN DEFAULT false;\n');
    process.exit(1);
  }
}

runMigration();
