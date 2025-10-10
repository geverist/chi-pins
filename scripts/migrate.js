#!/usr/bin/env node
// Automated database migration system
// Runs SQL migrations against both Supabase (cloud) and local SQLite (kiosk)
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../sql-migrations');
const MIGRATION_TABLE = 'schema_migrations';

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Execute SQL via Supabase REST API
async function executeSQL(sql) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // Use PostgREST RPC endpoint for raw SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // If exec_sql RPC doesn't exist, we'll need to use the Supabase client directly
    throw new Error(`SQL execution failed: ${response.status} - ${await response.text()}`);
  }

  return await response.json();
}

// Simple client wrapper for compatibility
function createClientWrapper() {
  return {
    async query(sql, params = []) {
      // For simplicity, execute SQL directly (params would need proper escaping in production)
      const result = await executeSQL(sql);
      return { rows: result || [] };
    },
  };
}

// Create migrations tracking table
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  log('✓ Migrations table ready', 'green');
}

// Get list of executed migrations
async function getExecutedMigrations(client) {
  try {
    const result = await client.query(
      `SELECT filename FROM ${MIGRATION_TABLE} ORDER BY id`
    );
    return result.rows.map(row => row.filename);
  } catch (err) {
    if (err.code === '42P01') { // Table doesn't exist
      return [];
    }
    throw err;
  }
}

// Get all migration files
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log(`Migrations directory not found: ${MIGRATIONS_DIR}`, 'red');
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Alphabetical order (use timestamps for ordering)
}

// Execute a single migration
async function executeMigration(client, filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  log(`\n▶ Running: ${filename}`, 'blue');

  try {
    // Execute migration SQL
    await client.query('BEGIN');
    await client.query(sql);

    // Record in migrations table
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (filename) VALUES ($1)`,
      [filename]
    );

    await client.query('COMMIT');
    log(`✓ Success: ${filename}`, 'green');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    log(`✗ Failed: ${filename}`, 'red');
    log(`  Error: ${err.message}`, 'red');
    return false;
  }
}

// Main migration runner
async function runMigrations() {
  let client;

  try {
    log('\n🔄 Database Migration System\n', 'blue');

    // Use Supabase client library instead of direct Postgres connection
    log('Setting up Supabase client...', 'yellow');
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    log('✓ Supabase client ready', 'green');

    // Create a pg-compatible wrapper
    client = {
      async query(sql, params) {
        // Use Supabase RPC or direct execution
        // For now, we'll handle migrations differently
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) throw error;
        return { rows: data || [] };
      },
      async end() {
        // No-op for Supabase client
      },
    };

    // Ensure migrations table exists
    await ensureMigrationsTable(client);

    // Get executed and pending migrations
    const executed = await getExecutedMigrations(client);
    const allMigrations = getMigrationFiles();
    const pending = allMigrations.filter(file => !executed.includes(file));

    log(`\n📊 Migration Status:`);
    log(`   Executed: ${executed.length}`, 'green');
    log(`   Pending:  ${pending.length}`, 'yellow');

    if (pending.length === 0) {
      log('\n✅ Database is up to date!\n', 'green');
      return;
    }

    log('\n📝 Pending migrations:', 'yellow');
    pending.forEach(file => log(`   - ${file}`));

    // Execute pending migrations
    log('\n🚀 Executing pending migrations...\n', 'blue');

    let successCount = 0;
    for (const filename of pending) {
      const success = await executeMigration(client, filename);
      if (success) {
        successCount++;
      } else {
        log('\n❌ Migration failed. Stopping execution.\n', 'red');
        process.exit(1);
      }
    }

    log(`\n✅ Migration complete! Executed ${successCount} migrations.\n`, 'green');
    log('📱 Note: Local SQLite schema will sync on next kiosk app start.', 'blue');

  } catch (err) {
    log(`\n❌ Migration system error: ${err.message}\n`, 'red');
    console.error(err);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run if called directly
runMigrations();
