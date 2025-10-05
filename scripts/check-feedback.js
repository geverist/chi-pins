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

// Get most recent comment
const { data: comments } = await supabase
  .from('comments')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

console.log('\n=== Most Recent Feedback ===');
console.log(JSON.stringify(comments, null, 2));

// Get admin settings
const { data: settings } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'app')
  .single();

console.log('\n=== Notification Settings ===');
console.log('notificationsEnabled:', settings?.value?.notificationsEnabled);
console.log('notifyOnFeedback:', settings?.value?.notifyOnFeedback);
console.log('notificationType:', settings?.value?.notificationType);
console.log('notificationRecipients:', settings?.value?.notificationRecipients);
console.log('twilioEnabled:', settings?.value?.twilioEnabled);
console.log('twilioPhoneNumber:', settings?.value?.twilioPhoneNumber);
