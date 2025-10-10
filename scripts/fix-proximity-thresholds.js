#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixProximityThresholds() {
  try {
    console.log('🔧 Fixing proximity detection thresholds...')

    // Get current settings from the 'settings' table (key='app')
    const { data: before, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app')
      .maybeSingle()

    if (fetchError) {
      console.error('❌ Error fetching current settings:', fetchError)
      process.exit(1)
    }

    console.log('📊 Current values:')
    if (before?.value) {
      console.log('  - Proximity Threshold:', before.value.proximityThreshold || 'not set (using default: 30)')
      console.log('  - Ambient Music Threshold:', before.value.ambientMusicThreshold || 'not set (using default: 25)')
    } else {
      console.log('  - No settings found in database (using code defaults)')
    }

    // Update the settings
    const updatedValue = {
      ...(before?.value || {}),
      proximityThreshold: 30,
      ambientMusicThreshold: 25,
    }

    const { error: updateError } = await supabase
      .from('settings')
      .upsert({
        key: 'app',
        value: updatedValue
      }, {
        onConflict: 'key'
      })

    if (updateError) {
      console.error('❌ Error updating settings:', updateError)
      process.exit(1)
    }

    console.log('\n✅ Updated values:')
    console.log('  - Proximity Threshold: 30')
    console.log('  - Ambient Music Threshold: 25')

    // Trigger a push notification to the kiosk to reload settings immediately
    console.log('\n📢 Triggering push notification to kiosk...')
    const { error: notifyError } = await supabase
      .from('settings_updates')
      .insert({ trigger_reload: true })

    if (notifyError) {
      console.warn('⚠️  Could not send push notification:', notifyError.message)
      console.log('   Kiosk will sync settings within 5 minutes automatically.')
    } else {
      console.log('✅ Push notification sent! Kiosk should reload settings immediately.')
    }

    console.log('\n🎯 Thresholds fixed! Actions should now trigger when proximity reaches 49-50.')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    process.exit(1)
  }
}

fixProximityThresholds()
