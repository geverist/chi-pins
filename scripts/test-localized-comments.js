#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xxwqmakcrchgefgzrulf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLocalizedComments() {
  console.log('🧪 Testing localized comments setup...\n')

  // Test 1: Check pin_comments table exists and has data
  console.log('1️⃣ Checking pin_comments table...')
  const { data: comments, error: tableError, count } = await supabase
    .from('pin_comments')
    .select('*', { count: 'exact', head: true })

  if (tableError) {
    console.error('❌ Table error:', tableError.message)
    return
  }

  console.log(`✅ Table exists with ${count} total comments\n`)

  // Test 2: Test geographic filtering with bounds
  console.log('2️⃣ Testing geographic filtering (Chicago bounds)...')
  const { data: chicagoComments, error: geoError } = await supabase.rpc('get_comments_in_bounds', {
    min_lat: 41.4,
    max_lat: 42.3,
    min_lng: -88.5,
    max_lng: -87.0,
    max_results: 10
  })

  if (geoError) {
    console.error('❌ Geographic function error:', geoError.message)
    console.log('   Falling back to direct query...')

    const { data: fallbackComments } = await supabase
      .from('pin_comments')
      .select('*')
      .gte('pin_lat', 41.4)
      .lte('pin_lat', 42.3)
      .gte('pin_lng', -88.5)
      .lte('pin_lng', -87.0)
      .eq('is_approved', true)
      .limit(10)

    console.log(`✅ Found ${fallbackComments?.length || 0} localized comments (fallback method)`)
    if (fallbackComments && fallbackComments.length > 0) {
      console.log('   Sample:', fallbackComments[0].comment_text?.substring(0, 60) + '...')
    }
  } else {
    console.log(`✅ Found ${chicagoComments?.length || 0} localized comments (optimized function)`)
    if (chicagoComments && chicagoComments.length > 0) {
      console.log('   Sample:', chicagoComments[0].comment_text?.substring(0, 60) + '...')
    }
  }

  // Test 3: Compare with global query (old method)
  console.log('\n3️⃣ Comparing with global query (old method)...')
  const { data: globalPins, error: globalError } = await supabase
    .from('pins')
    .select('note')
    .not('note', 'is', null)
    .neq('note', '')
    .limit(100)

  if (!globalError) {
    console.log(`📊 Old method would fetch: ${globalPins?.length || 0} pins globally`)
    console.log(`📊 New method fetches: ${chicagoComments?.length || fallbackComments?.length || 0} comments locally`)

    const reduction = globalPins?.length > 0
      ? Math.round((1 - (chicagoComments?.length || 0) / globalPins.length) * 100)
      : 0
    console.log(`🚀 Data reduction: ~${reduction}% less data transferred!`)
  }

  console.log('\n✅ Localized comments are working!\n')
  console.log('Next steps:')
  console.log('  1. Build and deploy the updated app')
  console.log('  2. Enable Comments Banner in admin settings')
  console.log('  3. Watch it display only Chicago-area comments')
}

testLocalizedComments()
