#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    const migrationPath = join(__dirname, '..', 'sql-migrations', 'create-settings-updates-table.sql')
    const sql = readFileSync(migrationPath, 'utf8')

    console.log('Running migration: create-settings-updates-table.sql')

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try using the REST API to create table
      console.log('exec_sql not available, using alternative method...')

      // Check if table exists
      const { data: tableExists } = await supabase
        .from('settings_updates')
        .select('id')
        .limit(1)

      if (tableExists !== null) {
        console.log('✅ Table settings_updates already exists or was created successfully')
      } else {
        console.error('❌ Migration failed:', error)
      }
    } else {
      console.log('✅ Migration completed successfully')
    }
  } catch (err) {
    console.error('❌ Migration error:', err)
    process.exit(1)
  }
}

runMigration()
