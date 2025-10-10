import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('admin_settings')
  .select('console_webhook_enabled, console_webhook_url, tenant_id')
  .eq('tenant_id', 'chicago-mikes')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Console Webhook Config:');
  console.log('  Enabled:', data.console_webhook_enabled);
  console.log('  URL:', data.console_webhook_url);
  console.log('  Tenant:', data.tenant_id);
}
