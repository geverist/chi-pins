import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://xxwqmakcrchgefgzrulf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'
);

console.log('Running migrations...');

const sql = readFileSync('./supabase/ULTRA_SAFE_MIGRATIONS.sql', 'utf-8');

const blocks = sql.match(/DO $$[sS]*?$$;/g) || [];

console.log('Found', blocks.length, 'blocks');

for (const block of blocks) {
  const result = await supabase.rpc('exec', { sql: block });
  if (result.error) console.error(result.error.message);
  else console.log('✓');
}

const { data } = await supabase.from('pins').select('id,pinStyle').limit(1);
console.log('pinStyle exists:', data?.[0] && 'pinStyle' in data[0]);
