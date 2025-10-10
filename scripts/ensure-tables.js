#!/usr/bin/env node
// Simple table checker/creator for Supabase
// Verifies tables exist, creates them if needed
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ensureTable(tableName, sqlFile) {
  console.log(`\n📋 Checking table: ${tableName}`);

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);

    if (!error) {
      console.log(`✅ Table '${tableName}' exists`);
      return true;
    }

    if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('not found')) {
      console.log(`⚠️  Table '${tableName}' not found`);
      console.log(`\n📝 SQL to create table:`);
      console.log(`─`.repeat(80));

      const sql = fs.readFileSync(sqlFile, 'utf8');
      console.log(sql);
      console.log(`─`.repeat(80));

      console.log(`\n🔗 Create this table in Supabase:`);
      console.log(`1. Go to: https://supabase.com/dashboard/project/${process.env.VITE_SUPABASE_URL.match(/\/\/(.+?)\.supabase/)[1]}/sql/new`);
      console.log(`2. Paste the SQL above`);
      console.log(`3. Click "Run"`);
      console.log(`4. Re-run this script to verify\n`);

      return false;
    }

    throw error;
  } catch (err) {
    console.error(`❌ Error checking table '${tableName}':`, err.message);
    return false;
  }
}

async function main() {
  console.log('\n🔍 Supabase Table Checker\n');

  const tables = [
    { name: 'autonomous_tasks', sql: 'sql-migrations/create-autonomous-tasks-table.sql' },
    { name: 'autonomous_fixes', sql: 'sql-migrations/create-autonomous-fixes-table.sql' },
  ];

  let allExist = true;

  for (const table of tables) {
    const exists = await ensureTable(table.name, table.sql);
    if (!exists) allExist = false;
  }

  if (allExist) {
    console.log('\n✅ All required tables exist!\n');
  } else {
    console.log('\n⚠️  Some tables are missing. Follow the instructions above to create them.\n');
  }
}

main();
