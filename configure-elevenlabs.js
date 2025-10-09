/**
 * ElevenLabs Configuration Script
 *
 * Run this in the browser console on http://localhost:5173
 * to configure ElevenLabs TTS settings
 */

(async function configureElevenLabs() {
  console.log('🎙️ Configuring ElevenLabs TTS settings...');

  // Get current settings from localStorage
  const storageKey = 'adminSettings_v1';
  let currentSettings = {};

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      currentSettings = JSON.parse(stored);
      console.log('✓ Loaded current settings from localStorage');
    }
  } catch (e) {
    console.warn('⚠️ Could not load current settings:', e);
  }

  // Configure ElevenLabs settings
  const elevenlabsConfig = {
    ttsProvider: 'elevenlabs',
    elevenlabsApiKey: '3dc920776d9f94425a7ac398c897e0ad1156e4683579c3fcd2625e8e95be3c61',
    elevenlabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Default: Adam (deep, natural male voice)
    elevenlabsPhoneVoiceId: 'pNInz6obpgDQGcFmaJgB', // Same voice for phone
    elevenlabsModel: 'eleven_turbo_v2_5', // Fast, high-quality model
    elevenlabsStability: 0.5,
    elevenlabsSimilarity: 0.75,
  };

  // Merge with current settings
  const updatedSettings = {
    ...currentSettings,
    ...elevenlabsConfig
  };

  // Save to localStorage
  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
    console.log('✓ Saved ElevenLabs configuration to localStorage');
  } catch (e) {
    console.error('❌ Failed to save to localStorage:', e);
    return;
  }

  // Also save to Supabase if available
  if (window.supabase) {
    try {
      const { error } = await window.supabase
        .from('settings')
        .upsert({ key: 'app', value: updatedSettings }, { onConflict: 'key' });

      if (error) {
        console.warn('⚠️ Could not save to Supabase:', error);
      } else {
        console.log('✓ Saved ElevenLabs configuration to Supabase');
      }
    } catch (e) {
      console.warn('⚠️ Supabase not available or error occurred:', e);
    }
  }

  console.log('\n✅ ElevenLabs configuration complete!');
  console.log('\nConfigured settings:');
  console.log('• TTS Provider:', elevenlabsConfig.ttsProvider);
  console.log('• Voice ID:', elevenlabsConfig.elevenlabsVoiceId);
  console.log('• Model:', elevenlabsConfig.elevenlabsModel);
  console.log('\n📝 Reload the page to apply changes.');

  // Optionally reload the page
  const reload = confirm('Configuration saved! Reload the page now to apply changes?');
  if (reload) {
    window.location.reload();
  }
})();
