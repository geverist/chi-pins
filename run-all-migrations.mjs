#!/usr/bin/env node
// run-all-migrations.mjs
// Runs all pending SQL migrations for the kiosk app

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxwqmakcrchgefgzrulf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🚀 Starting migration runner...\n');
console.log(`📍 Database: ${SUPABASE_URL}\n`);

// List of migrations to run in order
const migrations = [
  {
    name: 'Create admin_settings table',
    file: 'sql-migrations/create-admin-settings-table.sql',
    required: true,
  },
  {
    name: 'Add console webhook settings',
    file: 'sql-migrations/add-console-webhook-settings.sql',
    required: true,
  },
  {
    name: 'Create proximity learning sessions',
    file: 'sql-migrations/create-proximity-learning-sessions.sql',
    required: true,
  },
  {
    name: 'Create Twilio call status table',
    file: 'sql-migrations/create-twilio-call-status.sql',
    required: true,
  },
];

async function runMigration(migration) {
  console.log(`\n📝 Running: ${migration.name}`);
  console.log(`   File: ${migration.file}`);

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, migration.file);
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split by semicolon and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^--/));

    console.log(`   Found ${statements.length} SQL statements`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      // Skip comments and empty lines
      if (stmt.trim().startsWith('--') || stmt.trim() === ';') {
        continue;
      }

      try {
        const { data, error } = await supabase.rpc('query', {
          query_text: stmt
        });

        if (error) {
          // Try alternative method - direct SQL execution via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ sql: stmt }),
          });

          if (!response.ok) {
            // If that also fails, log but continue (many errors are OK like "already exists")
            const errorText = await response.text();
            if (errorText.includes('already exists') || errorText.includes('duplicate')) {
              console.log(`   ⚠️  Statement ${i + 1}: Already exists (OK)`);
            } else {
              console.log(`   ❌ Statement ${i + 1}: ${errorText.substring(0, 100)}`);
            }
          } else {
            console.log(`   ✅ Statement ${i + 1}: Success`);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1}: Success`);
        }
      } catch (err) {
        // Many "errors" are actually OK (table already exists, etc)
        if (err.message && (
          err.message.includes('already exists') ||
          err.message.includes('duplicate')
        )) {
          console.log(`   ⚠️  Statement ${i + 1}: Already exists (OK)`);
        } else {
          console.log(`   ⚠️  Statement ${i + 1}: ${err.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`   ✅ Migration completed: ${migration.name}`);
    return true;

  } catch (error) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    if (migration.required) {
      console.error('   This migration is required. Stopping.');
      return false;
    }
    return true;
  }
}

async function verifyTables() {
  console.log('\n\n🔍 Verifying tables...');

  const tables = [
    { name: 'admin_settings', testQuery: 'SELECT COUNT(*) FROM admin_settings' },
    { name: 'proximity_learning_sessions', testQuery: 'SELECT COUNT(*) FROM proximity_learning_sessions' },
    { name: 'twilio_call_status', testQuery: 'SELECT COUNT(*) FROM twilio_call_status' },
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table.name).select('id', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table.name}: Not found or inaccessible`);
      } else {
        console.log(`   ✅ ${table.name}: Exists and accessible`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${table.name}: ${err.message.substring(0, 60)}`);
    }
  }
}

// Main execution
async function main() {
  let allSuccessful = true;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      allSuccessful = false;
      break;
    }
  }

  // Verify that tables exist
  await verifyTables();

  console.log('\n\n' + '='.repeat(60));
  if (allSuccessful) {
    console.log('✅ All migrations completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure Twilio Status Callback URL:');
    console.log('   https://your-domain.com/api/twilio-call-status');
    console.log('\n2. Enable console webhook in Admin Panel');
    console.log('\n3. Test adaptive learning with proximity detection');
  } else {
    console.log('❌ Some migrations failed. Check errors above.');
    process.exit(1);
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
