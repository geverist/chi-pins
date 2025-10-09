#!/usr/bin/env node
/**
 * Configure ElevenLabs TTS settings in Supabase
 *
 * Usage: node configure-elevenlabs-node.js
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://aqvzccezxjgxjvrgrrel.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxdnpjY2V6eGpneGp2cmdycmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzgzOTAsImV4cCI6MjA0ODMxNDM5MH0.rTvmXcSfDYX6YP_t68bDBNFqm8F5lfmQfT-w_mDCMkg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function configureElevenLabs() {
  console.log('🎙️ Configuring ElevenLabs TTS settings...\n')

  // Get current settings
  const { data: currentData, error: fetchError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'app')
    .maybeSingle()

  if (fetchError) {
    console.error('❌ Error fetching current settings:', fetchError)
    return
  }

  const currentSettings = currentData?.value || {}
  console.log('✓ Loaded current settings from Supabase')

  // Configure ElevenLabs settings
  const elevenlabsConfig = {
    ttsProvider: 'elevenlabs',
    elevenlabsApiKey: '3dc920776d9f94425a7ac398c897e0ad1156e4683579c3fcd2625e8e95be3c61',
    elevenlabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Default: Adam (deep, natural male voice)
    elevenlabsPhoneVoiceId: 'pNInz6obpgDQGcFmaJgB', // Same voice for phone
    elevenlabsModel: 'eleven_turbo_v2_5', // Fast, high-quality model
    elevenlabsStability: 0.5,
    elevenlabsSimilarity: 0.75,
  }

  // Merge with current settings
  const updatedSettings = {
    ...currentSettings,
    ...elevenlabsConfig
  }

  // Save to Supabase
  const { error: saveError } = await supabase
    .from('settings')
    .upsert({ key: 'app', value: updatedSettings }, { onConflict: 'key' })

  if (saveError) {
    console.error('❌ Error saving to Supabase:', saveError)
    return
  }

  console.log('✓ Saved ElevenLabs configuration to Supabase\n')

  // Trigger reload notification for connected kiosks
  const { error: notifyError } = await supabase
    .from('settings_updates')
    .insert({ trigger_reload: true })

  if (notifyError) {
    console.warn('⚠️ Could not send reload notification:', notifyError)
  } else {
    console.log('✓ Sent reload notification to connected kiosks')
  }

  console.log('\n✅ ElevenLabs configuration complete!')
  console.log('\nConfigured settings:')
  console.log('• TTS Provider:', elevenlabsConfig.ttsProvider)
  console.log('• API Key:', elevenlabsConfig.elevenlabsApiKey.substring(0, 20) + '...')
  console.log('• Voice ID:', elevenlabsConfig.elevenlabsVoiceId, '(Adam - deep male voice)')
  console.log('• Model:', elevenlabsConfig.elevenlabsModel)
  console.log('• Stability:', elevenlabsConfig.elevenlabsStability)
  console.log('• Similarity:', elevenlabsConfig.elevenlabsSimilarity)
  console.log('\n📝 Settings will sync to kiosks within 5 minutes, or reload immediately.')
}

configureElevenLabs().catch(console.error)
