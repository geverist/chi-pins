#!/usr/bin/env node
// run-migrations-rest.mjs
// Script to run SQL migrations on Supabase using REST API
// Usage: node run-migrations-rest.mjs

import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

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

async function runSQL(sql) {
  // Use Supabase's SQL endpoint (requires PostgreSQL connection or use pg library)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function runMigrations() {
  console.log('🚀 Running migrations via PostgreSQL...\n');

  // Try using node-postgres for direct SQL execution
  const { default: pg } = await import('pg');
  const { Client } = pg;

  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
  const connectionString = `postgresql://postgres.${projectRef}:${SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    for (const migration of migrations) {
      console.log(`📝 Running: ${migration.name}`);
      const sql = readFileSync(migration.file, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ Completed: ${migration.name}\n`);
      } catch (err) {
        console.error(`❌ Error: ${err.message}\n`);
      }
    }
  } finally {
    await client.end();
  }

  console.log('✨ Migration process complete!');
}

runMigrations().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
