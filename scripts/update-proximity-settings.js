#!/usr/bin/env node

// Update proximity detection settings in Supabase for aggressive data capture
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTEyMDksImV4cCI6MjA3NDU2NzIwOX0.nmF6ZnPtlCLK93ZcI_TmDcpT9Hi3YNnxFBjjA-RQyrA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSettings() {
  try {
    console.log('[Update] Fetching current settings...');
    const { data: current, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'app')
      .single();

    if (fetchError) {
      console.error('[Update] Error fetching settings:', fetchError);
      process.exit(1);
    }

    console.log('[Update] Current interval:', current.value.proximityDetectionInterval);
    console.log('[Update] Current sensitivity:', current.value.proximitySensitivity);
    console.log('[Update] Current audio feedback:', current.value.proximityAudioFeedbackEnabled);
    console.log('[Update] Current feedback mode:', current.value.proximityFeedbackMode);

    // Update settings for aggressive data capture
    const updated = {
      ...current.value,
      proximityDetectionInterval: 50,          // 50ms = 20fps
      proximitySensitivity: 10,                // Lower = more sensitive
      proximityAudioFeedbackEnabled: true,     // Enable audio feedback
      proximityFeedbackMode: 'debug',          // Debug mode with beeps
    };

    console.log('\n[Update] Updating to aggressive settings...');
    const { error: updateError } = await supabase
      .from('settings')
      .update({ value: updated })
      .eq('key', 'app');

    if (updateError) {
      console.error('[Update] Error updating settings:', updateError);
      process.exit(1);
    }

    console.log('[Update] ✅ Settings updated successfully!');
    console.log('[Update] New interval:', updated.proximityDetectionInterval, 'ms (20fps)');
    console.log('[Update] New sensitivity:', updated.proximitySensitivity, '(more sensitive)');
    console.log('[Update] Audio feedback:', updated.proximityAudioFeedbackEnabled);
    console.log('[Update] Feedback mode:', updated.proximityFeedbackMode);

    // Trigger reload notification
    console.log('\n[Update] Triggering app reload notification...');
    const { error: notifyError } = await supabase
      .from('settings_updates')
      .insert({ trigger_reload: true, updated_at: new Date().toISOString() });

    if (notifyError) {
      console.warn('[Update] Could not send reload notification:', notifyError.message);
    } else {
      console.log('[Update] ✅ Reload notification sent!');
    }

    console.log('\n[Update] App should reload within 5 seconds...');
    process.exit(0);
  } catch (error) {
    console.error('[Update] Unexpected error:', error);
    process.exit(1);
  }
}

updateSettings();
