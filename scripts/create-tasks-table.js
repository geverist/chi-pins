#!/usr/bin/env node
// Create autonomous_tasks table in Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('📋 Creating autonomous_tasks table...\n');

    const sql = fs.readFileSync('sql-migrations/create-autonomous-tasks-table.sql', 'utf8');

    // Execute via rpc (requires postgres function) or just verify table doesn't exist
    const { data: existing, error: checkError } = await supabase
      .from('autonomous_tasks')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table already exists!');
      console.log('\nTo verify, run:');
      console.log('node scripts/list-tasks.js\n');
      return;
    }

    if (checkError.code === '42P01') {
      // Table doesn't exist - need to create it manually
      console.log('⚠️  Table does not exist yet.');
      console.log('\nPlease run this SQL in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/[your-project]/sql/new\n');
      console.log('─'.repeat(80));
      console.log(sql);
      console.log('─'.repeat(80));
    } else {
      throw checkError;
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

await createTable();
