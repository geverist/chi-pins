import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://xxwqmakcrchgefgzrulf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath, description) {
  console.log(`\n📝 Running: ${description}...`);
  console.log(`   File: ${filePath}`);

  try {
    const sql = readFileSync(filePath, 'utf-8');

    // Execute SQL via RPC or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })
      .catch(async () => {
        // If exec_sql doesn't exist, try raw query (this won't work with DDL)
        // We'll use the REST API instead
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql_string: sql })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { data: await response.json(), error: null };
      });

    if (error) {
      console.error(`   ❌ Error:`, error);
      return false;
    }

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
    const success = await runMigration(migration.file, migration.description);
    if (success) successCount++;
  }

  console.log('\n=====================================');
  console.log(`✨ Completed: ${successCount}/${migrations.length} migrations successful`);

  if (successCount === migrations.length) {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('   Your database now has multi-tenancy support.');
  } else {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    console.log('   You may need to run them manually via Supabase Dashboard.');
    process.exit(1);
  }
}

main().catch(console.error);
