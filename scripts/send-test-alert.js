#!/usr/bin/env node
// Script to send a test alert to the kiosk
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendTestAlert() {
  // Parse command line arguments
  const message = process.argv[2] || 'Welcome Home Angela!';
  const durationSeconds = process.argv[3] ? parseInt(process.argv[3]) : 30; // Default 30 seconds
  const displayStyle = process.argv[4] || 'overlay'; // 'overlay' or 'scrollbar'
  const effect = process.argv[5] || 'slide'; // 'slide', 'fade', 'bounce', 'shake', 'glow', 'none'
  const enableTTS = process.argv[6] !== 'false'; // Default to true

  console.log(`📢 Sending test alert: "${message}"`);
  console.log(`⏱️  Duration: ${durationSeconds} seconds`);
  console.log(`📺 Display style: ${displayStyle}`);
  console.log(`✨ Effect: ${effect}`);
  console.log(`🔊 TTS enabled: ${enableTTS}`);

  const alert = {
    title: 'Welcome Home!',
    message: message,
    type: 'info',
    priority: 'medium',
    active: true,
    dismissible: true,
    enable_tts: enableTTS,
    display_style: displayStyle,
    effect: effect,
    duration_seconds: durationSeconds,
    created_at: new Date().toISOString(),
    read_count: 0,
  };

  // Set expires_at based on duration
  if (durationSeconds > 0) {
    alert.expires_at = new Date(Date.now() + (durationSeconds * 1000)).toISOString();
  }

  const { data, error } = await supabase
    .from('kiosk_alerts')
    .insert(alert)
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to send alert:', error);
    process.exit(1);
  }

  console.log('✅ Alert sent successfully!');
  console.log('📋 Alert details:', data);
  console.log('\n💡 Usage: node scripts/send-test-alert.js "message" [duration] [style] [effect] [tts]');
  console.log('   duration: seconds (default: 30)');
  console.log('   style: overlay|scrollbar (default: overlay)');
  console.log('   effect: slide|fade|bounce|shake|glow|none (default: slide)');
  console.log('   tts: true|false (default: true)');
  console.log('\n   Example: node scripts/send-test-alert.js "Hello!" 60 overlay bounce true');
  console.log('   Example: node scripts/send-test-alert.js "Breaking News!" 45 scrollbar shake true');
}

sendTestAlert();
