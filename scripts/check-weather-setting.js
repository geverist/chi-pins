#!/usr/bin/env node
// Check and update weather widget setting
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAndUpdateWeatherSetting() {
  console.log('🔍 Checking weather widget setting in Supabase...\n');

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'app')
    .maybeSingle();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data?.value) {
    console.log(`Current showWeatherWidget value: ${data.value.showWeatherWidget}`);

    if (data.value.showWeatherWidget !== false) {
      console.log('\n📝 Updating to false...\n');

      const updatedValue = {
        ...data.value,
        showWeatherWidget: false
      };

      const { error: updateError } = await supabase
        .from('settings')
        .update({ value: updatedValue })
        .eq('key', 'app');

      if (updateError) {
        console.error('❌ Update failed:', updateError);
      } else {
        console.log('✅ Updated showWeatherWidget to false in Supabase');
      }
    } else {
      console.log('✅ Weather widget is already set to false');
    }
  } else {
    console.log('ℹ️  No settings found in Supabase (will use code defaults)');
  }
}

checkAndUpdateWeatherSetting();
