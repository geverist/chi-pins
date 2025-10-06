import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n📊 SUPABASE DATABASE OVERVIEW\n');
console.log('='.repeat(80));

const tableGroups = {
  '🌍 GEO DATA': ['towns', 'fun_facts'],
  '📝 USER CONTENT': ['comments', 'popular_spots', 'then_and_now', 'anonymous_messages'],
  '⚙️  SETTINGS': ['settings', 'navigation_settings'],
  '📁 MEDIA': ['media_files', 'music_queue', 'background_images'],
  '🎮 GAMES': ['game_scores'],
  '🏢 MULTI-TENANCY': ['locations', 'tenant_config', 'user_tenant_assignments', 'audit_logs'],
  '📞 VOICE AGENT': ['phone_numbers', 'voice_calls', 'voice_voicemails', 'voice_agent_knowledge'],
  '🖥️  KIOSK': ['kiosk_clusters']
};

async function checkTable(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { exists: false, count: 0 };
    }
    return { exists: true, count: count || 0 };
  } catch (e) {
    return { exists: false, count: 0 };
  }
}

async function main() {
  for (const [category, tables] of Object.entries(tableGroups)) {
    console.log(`\n${category}`);
    console.log('-'.repeat(80));

    for (const table of tables) {
      const result = await checkTable(table);
      const status = result.exists ? '✅' : '❌';
      const count = result.exists ? `${result.count} rows` : 'Not found';
      console.log(`${status} ${table.padEnd(35)} ${count}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Get sample data from key tables
  console.log('\n📋 SAMPLE DATA\n');
  console.log('='.repeat(80));

  console.log('\n🏢 Locations (Tenants):');
  const { data: locations } = await supabase.from('locations').select('id, name, industry, status');
  console.log(JSON.stringify(locations, null, 2));

  console.log('\n📞 Phone Numbers:');
  const { data: phones } = await supabase.from('phone_numbers').select('phone_number, status, tenant_id');
  console.log(JSON.stringify(phones, null, 2));

  console.log('\n⚙️  Settings:');
  const { data: settings } = await supabase.from('settings').select('key');
  console.log('Keys:', settings?.map(s => s.key).join(', '));

  console.log('\n🌍 Towns:');
  const { data: towns, count: townCount } = await supabase
    .from('towns')
    .select('name', { count: 'exact' })
    .limit(5);
  console.log(`Total: ${townCount} towns`);
  console.log('Sample:', towns?.map(t => t.name).join(', '));

  console.log('\n📚 Voice Knowledge Base:');
  const { data: knowledge } = await supabase
    .from('voice_agent_knowledge')
    .select('category, question')
    .limit(10);
  console.log(JSON.stringify(knowledge, null, 2));

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
