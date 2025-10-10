// scripts/check-learning-data.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkLearningData() {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('proximity_learning_sessions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('Error querying table:', countError.message);
      return;
    }

    console.log('📊 Total proximity_learning_sessions:', count || 0);

    if (count > 0) {
      // Get breakdown by outcome
      const { data, error } = await supabase
        .from('proximity_learning_sessions')
        .select('outcome, converted, engaged_duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        const engaged = data.filter(s => s.outcome === 'engaged').length;
        const abandoned = data.filter(s => s.outcome === 'abandoned').length;
        const converted = data.filter(s => s.outcome === 'converted').length;
        const avgEngagement = data
          .filter(s => s.engaged_duration_ms)
          .reduce((sum, s) => sum + s.engaged_duration_ms, 0) / (data.filter(s => s.engaged_duration_ms).length || 1);

        console.log('\n📈 Breakdown:');
        console.log('  - Engaged:', engaged);
        console.log('  - Abandoned:', abandoned);
        console.log('  - Converted:', converted);
        console.log('  - Avg engagement duration:', Math.round(avgEngagement / 1000), 'seconds');
        console.log('\n🕐 Latest sessions:');
        data.slice(0, 5).forEach(s => {
          console.log('  -', s.outcome, '|', new Date(s.created_at).toLocaleString());
        });
      }
    } else {
      console.log('\n❌ No learning sessions captured yet.');
      console.log('💡 Sessions will be recorded when users interact with proximity detection.');
    }

  } catch (err) {
    console.error('Query error:', err.message);
  }
}

checkLearningData();
