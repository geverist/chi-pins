#!/usr/bin/env node
// scripts/enable-proximity-detection.js
// Updates Supabase settings to enable proximity detection

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function enableProximityDetection() {
  console.log('🔍 Fetching current settings from Supabase...')

  // Use service role to bypass RLS - query directly
  const { data: allSettings, error: fetchError } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'app')

  if (fetchError) {
    console.error('❌ Error fetching settings:', fetchError)
    process.exit(1)
  }

  if (!allSettings || allSettings.length === 0) {
    console.error('❌ No settings found in Supabase')
    process.exit(1)
  }

  const currentSettings = allSettings[0]
  console.log('✅ Current settings fetched')
  console.log('📊 Current proximityDetectionEnabled:', currentSettings.value.proximityDetectionEnabled)
  console.log('📊 Tenant ID:', currentSettings.tenant_id)

  // Update settings to enable proximity detection
  const targetState = process.argv[2] === 'false' ? false : true;
  const updatedSettings = {
    ...currentSettings.value,
    proximityDetectionEnabled: targetState
  }

  console.log(`\n🔧 Updating settings to ${targetState ? 'enable' : 'disable'} proximity detection...`)

  // Update with service role (bypasses RLS)
  const { error: updateError } = await supabase
    .from('settings')
    .update({ value: updatedSettings })
    .eq('id', currentSettings.id)

  if (updateError) {
    console.error('❌ Error updating settings:', updateError)
    process.exit(1)
  }

  console.log('✅ Settings updated successfully!')
  console.log('📊 New proximityDetectionEnabled:', updatedSettings.proximityDetectionEnabled)

  // Trigger push notification to kiosk
  console.log('\n📢 Sending push notification to kiosk to reload settings...')

  const { error: notifyError } = await supabase
    .from('settings_updates')
    .insert({
      trigger_reload: true,
      updated_at: new Date().toISOString()
    })

  if (notifyError) {
    console.warn('⚠️  Warning: Could not send push notification:', notifyError)
    console.log('💡 The kiosk will pick up the changes within 5 minutes (automatic sync)')
  } else {
    console.log('✅ Push notification sent! Kiosk should reload settings immediately.')
  }

  console.log('\n🎉 Done! Proximity detection is now enabled.')
  console.log('📹 The camera should activate on the kiosk within a few seconds.')
}

enableProximityDetection()
