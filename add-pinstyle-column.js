// add-pinstyle-column.js - Add pinStyle column to pins table
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addColumn() {
  console.log('🔧 Adding pinStyle column to pins table...');

  try {
    // Execute raw SQL to add the column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE pins ADD COLUMN IF NOT EXISTS "pinStyle" TEXT'
    });

    if (error) {
      console.error('Error adding column:', error);
      console.log('\n⚠️  The column may already exist or you need service role key.');
      console.log('You can manually add it in Supabase dashboard:');
      console.log('   SQL Editor > Run: ALTER TABLE pins ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;');
    } else {
      console.log('✅ Column added successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    console.log('\n📝 Manual migration needed:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run: ALTER TABLE pins ADD COLUMN IF NOT EXISTS "pinStyle" TEXT;');
  }
}

addColumn().catch(console.error);
