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

const { data: settings } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'app')
  .single();

console.log('\n=== Twilio Configuration ===');
console.log('twilioEnabled:', settings?.value?.twilioEnabled);
console.log('twilioAccountSid:', settings?.value?.twilioAccountSid ? '✓ Set (hidden)' : '✗ Not set');
console.log('twilioAuthToken:', settings?.value?.twilioAuthToken ? '✓ Set (hidden)' : '✗ Not set');
console.log('twilioPhoneNumber:', settings?.value?.twilioPhoneNumber);
