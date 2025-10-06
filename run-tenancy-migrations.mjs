import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connection details
const PROJECT_REF = 'xxwqmakcrchgefgzrulf';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ';

// Supabase connection string format
// Try db host instead of pooler
const connectionString = `postgresql://postgres:${SERVICE_ROLE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function runMigration(client, filePath, description) {
  console.log(`\n📝 Running: ${description}...`);
  console.log(`   File: ${filePath}`);

  try {
    const sql = readFileSync(filePath, 'utf-8');
    await client.query(sql);
    console.log(`   ✅ Success!`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Multi-Tenancy Migrations');
  console.log('=====================================\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!\n');

    const migrations = [
      {
        file: join(__dirname, 'supabase/migrations/20251005_multi_tenancy_rls_actual.sql'),
        description: 'Add tenant_id columns and RLS policies'
      },
      {
        file: join(__dirname, 'supabase/migrations/20251005_tenant_context_functions.sql'),
        description: 'Create tenant context functions'
      },
      {
        file: join(__dirname, 'supabase/migrations/20251005_audit_logs_table.sql'),
        description: 'Create audit logs table'
      },
      {
        file: join(__dirname, 'supabase/migrations/20251005_tenant_config_table.sql'),
        description: 'Create tenant config table'
      }
    ];

    let successCount = 0;

    for (const migration of migrations) {
      const success = await runMigration(client, migration.file, migration.description);
      if (success) successCount++;
    }

    console.log('\n=====================================');
    console.log(`✨ Completed: ${successCount}/${migrations.length} migrations successful`);

    if (successCount === migrations.length) {
      console.log('\n🎉 All migrations completed successfully!');
      console.log('   Your database now has multi-tenancy support.');
    } else {
      console.log('\n⚠️  Some migrations failed. Check errors above.');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
