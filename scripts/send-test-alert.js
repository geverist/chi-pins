#!/usr/bin/env node
// Script to send a test alert to the kiosk
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTestAlert() {
  const message = process.argv[2] || 'Welcome Home Angela!';
  const enableTTS = process.argv[3] !== 'false'; // Default to true

  console.log(`📢 Sending test alert: "${message}"`);
  console.log(`🔊 TTS enabled: ${enableTTS}`);

  const { data, error } = await supabase
    .from('kiosk_alerts')
    .insert({
      title: 'Welcome Home!',
      message: message,
      type: 'info',
      priority: 'medium',
      active: true,
      dismissible: true,
      enable_tts: enableTTS,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      read_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to send alert:', error);
    process.exit(1);
  }

  console.log('✅ Alert sent successfully!');
  console.log('📋 Alert details:', data);
}

sendTestAlert();
