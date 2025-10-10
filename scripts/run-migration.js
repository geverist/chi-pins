#!/usr/bin/env node
// Run SQL migration using pg directly
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function runMigration(sqlFile) {
  // Extract project ref from Supabase URL
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const projectRef = supabaseUrl?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('❌ Could not extract project ref from VITE_SUPABASE_URL');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || '[your-db-password]'}@db.${projectRef}.supabase.co:5432/postgres`;

  const client = new Client({ connectionString });

  try {
    console.log(`📋 Running migration: ${sqlFile}\n`);

    await client.connect();
    console.log('✅ Connected to database');

    const sql = fs.readFileSync(sqlFile, 'utf8');

    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const sqlFile = process.argv[2] || 'sql-migrations/create-autonomous-tasks-table.sql';
await runMigration(sqlFile);
