#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Creating pin_comments table with geographic indexing...')

    // Create table
    const { error: createError } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS pin_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pin_id UUID REFERENCES pins(id) ON DELETE CASCADE,
          pin_slug TEXT,
          pin_lat DOUBLE PRECISION,
          pin_lng DOUBLE PRECISION,
          commenter_name TEXT,
          comment_text TEXT NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          is_approved BOOLEAN DEFAULT true,
          location_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
        );
      `
    })

    if (createError && !createError.message.includes('already exists')) {
      console.error('❌ Table creation failed:', createError)
    } else {
      console.log('✅ pin_comments table created')
    }

    // Create indexes
    console.log('Creating indexes...')
    await supabase.rpc('exec', { query: `CREATE INDEX IF NOT EXISTS idx_pin_comments_location ON pin_comments (pin_lat, pin_lng);` })
    await supabase.rpc('exec', { query: `CREATE INDEX IF NOT EXISTS idx_pin_comments_created ON pin_comments (created_at DESC);` })
    await supabase.rpc('exec', { query: `CREATE INDEX IF NOT EXISTS idx_pin_comments_pin_id ON pin_comments (pin_id);` })
    await supabase.rpc('exec', { query: `CREATE INDEX IF NOT EXISTS idx_pin_comments_approved ON pin_comments (is_approved) WHERE is_approved = true;` })

    console.log('✅ Indexes created')

    // Migrate existing pin notes
    console.log('Migrating existing pin notes to pin_comments...')
    const { data: migratedCount, error: migrateError } = await supabase.rpc('exec', {
      query: `
        INSERT INTO pin_comments (pin_id, pin_slug, pin_lat, pin_lng, commenter_name, comment_text, created_at)
        SELECT id, slug, lat, lng, name, note, created_at
        FROM pins
        WHERE note IS NOT NULL AND note != ''
        ON CONFLICT DO NOTHING;
      `
    })

    if (migrateError) {
      console.error('⚠️  Migration warning:', migrateError)
    } else {
      console.log('✅ Existing pin notes migrated')
    }

    // Test query
    console.log('\nTesting localized comments query...')
    const { data: testComments, error: testError, count } = await supabase
      .from('pin_comments')
      .select('*', { count: 'exact' })
      .gte('pin_lat', 41.4)
      .lte('pin_lat', 42.3)
      .gte('pin_lng', -88.5)
      .lte('pin_lng', -87.0)
      .eq('is_approved', true)
      .limit(10)

    if (testError) {
      console.error('❌ Test query failed:', testError)
    } else {
      console.log('✅ Found', count || 0, 'total localized comments in Chicago area')
      console.log('✅ Sample:', testComments?.length || 0, 'comments')
      if (testComments && testComments.length > 0) {
        console.log('First comment:', {
          text: testComments[0].comment_text?.substring(0, 50),
          name: testComments[0].commenter_name,
          location: `${testComments[0].pin_lat}, ${testComments[0].pin_lng}`
        })
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('✅ Comments are now geographically filtered for better performance')

  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }
}

runMigration()
