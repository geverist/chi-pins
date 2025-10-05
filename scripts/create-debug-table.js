// scripts/create-debug-table.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDebugLogsTable() {
  console.log('Creating debug_logs table...');

  // Read the SQL file
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', 'create_debug_logs_table.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec', { sql });

    if (error) {
      // If exec doesn't exist, try alternative method
      console.log('RPC method not available, using alternative...');

      // Create table using REST API (this won't work for DDL, but let's try)
      const statements = [
        `CREATE TABLE IF NOT EXISTS debug_logs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id TEXT,
          user_agent TEXT,
          url TEXT,
          logs JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`,
      ];

      for (const statement of statements) {
        const { error: execError } = await supabase.rpc('execute_sql', { query: statement });
        if (execError) {
          console.error('Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✓ Table created successfully!');
  } catch (err) {
    console.error('Error creating table:', err);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
  }
}

createDebugLogsTable();
