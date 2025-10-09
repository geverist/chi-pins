#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function forcePerformanceMode() {
  try {
    console.log('Forcing performance mode...')

    // Update navigation settings
    const { data: navData, error: navError } = await supabase
      .from('navigation_settings')
      .update({
        games_enabled: false,
        jukebox_enabled: false,
        order_enabled: false,
        explore_enabled: true,
        photobooth_enabled: false,
        thenandnow_enabled: false,
        comments_enabled: false,
        recommendations_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()

    if (navError) {
      console.error('❌ Navigation settings update failed:', navError)
      process.exit(1)
    }

    console.log('✅ Navigation settings updated successfully!')
    console.log('Updated navigation settings:', navData)

    // Also enable attractor hint for startup text overlays
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app')
      .single()

    if (!settingsError && settingsData) {
      const currentSettings = settingsData.value || {}
      const updatedSettings = {
        ...currentSettings,
        attractorHintEnabled: true // Enable text overlays on startup
      }

      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: updatedSettings })
        .eq('key', 'app')

      if (updateError) {
        console.warn('⚠️  Failed to enable attractor hint:', updateError)
      } else {
        console.log('✅ Enabled attractor hint for startup text overlays')
      }
    }

    console.log('✅ Performance mode with startup overlays enabled successfully!')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

forcePerformanceMode()
