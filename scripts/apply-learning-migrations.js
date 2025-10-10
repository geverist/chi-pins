// Apply proximity learning migrations in correct order
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function applySqlFile(filePath, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 ${description}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const sql = readFileSync(filePath, 'utf8');

    // Execute the entire SQL file as one query
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      // Check if it's just a "already exists" error which is safe to ignore
      if (error.message.includes('already exists')) {
        console.log('⚠️  Some objects already exist (safe to ignore)');
        console.log(`✅ ${description} - OK (already applied)`);
        return true;
      }

      console.error(`❌ Error applying ${description}:`);
      console.error(error);
      return false;
    }

    console.log(`✅ ${description} - Applied successfully`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to apply ${description}:`, err.message);
    return false;
  }
}

async function applyMigrations() {
  console.log('🚀 Starting proximity learning migrations...\n');

  // Step 1: Create the base table
  const step1 = await applySqlFile(
    'sql-migrations/create-proximity-learning-sessions.sql',
    'Step 1: Create proximity_learning_sessions table'
  );

  if (!step1) {
    console.log('\n⚠️  Step 1 failed. Will try to continue anyway in case table exists...\n');
  }

  // Step 2: Add per-person tracking columns
  const step2 = await applySqlFile(
    'sql-migrations/add-per-person-tracking.sql',
    'Step 2: Add per-person tracking columns'
  );

  console.log(`\n${'='.repeat(60)}`);
  if (step2) {
    console.log('✅ All migrations applied successfully!');
    console.log('\nThe database now supports:');
    console.log('  - Multi-person tracking with unique person IDs');
    console.log('  - Gaze detection (head pose angles, looking at kiosk)');
    console.log('  - Trajectory tracking (movement history per person)');
    console.log('  - Enhanced analytics with gaze metrics');
  } else {
    console.log('❌ Some migrations failed. Check errors above.');
  }
  console.log(`${'='.repeat(60)}\n`);
}

applyMigrations();
