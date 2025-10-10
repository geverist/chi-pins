// Quick script to check voice configuration in admin settings
const { getPersistentStorage } = require('../src/lib/persistentStorage');

async function checkConfig() {
  const storage = getPersistentStorage();
  const settings = await storage.get('adminSettings');

  console.log('\n=== Voice Configuration ===\n');
  console.log('TTS Provider:', settings?.ttsProvider || 'NOT SET');
  console.log('ElevenLabs API Key:', settings?.elevenlabsApiKey ? 'SET (length: ' + settings.elevenlabsApiKey.length + ')' : 'NOT SET');
  console.log('ElevenLabs Voice ID:', settings?.elevenlabsVoiceId || 'NOT SET');
  console.log('ElevenLabs Model:', settings?.elevenlabsModel || 'NOT SET');

  console.log('\n=== Proximity Settings ===\n');
  console.log('Proximity Detection Enabled:', settings?.proximityDetectionEnabled ?? 'NOT SET');
  console.log('Walkup Attractor Enabled:', settings?.walkupAttractorEnabled ?? 'NOT SET');
  console.log('Walkup Voice Enabled:', settings?.walkupAttractorVoiceEnabled ?? 'NOT SET');
  console.log('Proximity Threshold:', settings?.proximityThreshold || 30, '(default: 30)');
  console.log('Ambient Threshold:', settings?.ambientMusicThreshold || 25, '(default: 25)');
  console.log('Sensitivity:', settings?.proximitySensitivity || 15, '(default: 15)');

  console.log('\n=== Diagnosis ===\n');

  if (!settings?.ttsProvider || settings.ttsProvider !== 'elevenlabs') {
    console.log('⚠️  TTS Provider not set to "elevenlabs" - will use Web Speech API fallback');
  }

  if (!settings?.elevenlabsApiKey || !settings?.elevenlabsVoiceId) {
    console.log('⚠️  ElevenLabs not fully configured - will use Web Speech API fallback');
  }

  if (!settings?.proximityDetectionEnabled) {
    console.log('❌ Proximity detection is DISABLED');
  }

  if (!settings?.walkupAttractorEnabled) {
    console.log('❌ Walkup attractor is DISABLED');
  }

  const proxThreshold = settings?.proximityThreshold || 30;
  const ambThreshold = settings?.ambientMusicThreshold || 25;

  if (proxThreshold <= ambThreshold) {
    console.log('⚠️  Proximity threshold (' + proxThreshold + ') is <= ambient threshold (' + ambThreshold + ')');
    console.log('    This means voice greeting and ambient music trigger at same time');
  } else {
    console.log('✓ Proximity threshold (' + proxThreshold + ') > ambient threshold (' + ambThreshold + ')');
    console.log('   Voice greeting requires closer approach than ambient music');
  }

  console.log('\n');
}

checkConfig().catch(console.error);
