import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n=== COMPREHENSIVE CHI-PINS FEATURE TEST ===\n');

// Test 1: Database - Pins
console.log('1. Testing Pins Database...');
const { data: pins, error: pinsError } = await supabase
  .from('pins')
  .select('*')
  .limit(5);
if (pinsError) console.log('   ❌ Pins query failed:', pinsError.message);
else console.log(`   ✅ Pins table working (${pins.length} pins loaded)`);

// Test 2: Database - Comments
console.log('2. Testing Comments Database...');
const { data: comments, error: commentsError } = await supabase
  .from('comments')
  .select('*')
  .limit(3);
if (commentsError) console.log('   ❌ Comments query failed:', commentsError.message);
else console.log(`   ✅ Comments table working (${comments.length} comments)`);

// Test 3: Database - Settings
console.log('3. Testing Settings Database...');
const { data: settings, error: settingsError } = await supabase
  .from('settings')
  .select('*');
if (settingsError) console.log('   ❌ Settings query failed:', settingsError.message);
else console.log(`   ✅ Settings table working (${settings.length} settings)`);

// Test 4: Database - Popular Spots
console.log('4. Testing Popular Spots Database...');
const { data: spots, error: spotsError } = await supabase
  .from('popular_spots')
  .select('*');
if (spotsError) console.log('   ❌ Popular spots query failed:', spotsError.message);
else console.log(`   ✅ Popular spots table working (${spots ? spots.length : 0} spots)`);

// Test 5: Database - Then & Now
console.log('5. Testing Then & Now Database...');
const { data: thenNow, error: thenNowError} = await supabase
  .from('then_and_now')
  .select('*');
if (thenNowError) console.log('   ❌ Then & Now query failed:', thenNowError.message);
else console.log(`   ✅ Then & Now table working (${thenNow ? thenNow.length : 0} comparisons)`);

// Test 6: Database - Navigation Settings
console.log('6. Testing Navigation Settings...');
const { data: navSettings, error: navError } = await supabase
  .from('navigation_settings')
  .select('*')
  .single();
if (navError) console.log('   ❌ Navigation settings query failed:', navError.message);
else console.log(`   ✅ Navigation settings working`);

// Test 7: Admin Settings
console.log('7. Testing Admin Settings...');
const { data: adminData, error: adminError } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'app')
  .single();
if (adminError) console.log('   ❌ Admin settings query failed:', adminError.message);
else {
  const cfg = adminData.value;
  console.log('   ✅ Admin settings loaded');
  console.log(`      - Notifications: ${cfg.notificationsEnabled ? 'ON' : 'OFF'}`);
  console.log(`      - Twilio: ${cfg.twilioEnabled ? 'ON' : 'OFF'}`);
  console.log(`      - Fun Facts: ${cfg.funFactsEnabled ? 'ON' : 'OFF'}`);
  console.log(`      - News Ticker: ${cfg.newsTickerEnabled ? 'ON' : 'OFF'}`);
}

console.log('\n=== TEST COMPLETE ===\n');
