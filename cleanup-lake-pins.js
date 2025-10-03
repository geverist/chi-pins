// cleanup-lake-pins.js
// Remove pins that are in Lake Michigan
// Run with: node cleanup-lake-pins.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Lake Michigan shoreline polygon (copied from mapUtils.js)
const LAKE_MICHIGAN_SHORELINE = [
  [41.60, -87.52],
  [41.65, -87.53],
  [41.70, -87.54],
  [41.73, -87.55],
  [41.78, -87.58],
  [41.79, -87.59],
  [41.86, -87.61],
  [41.88, -87.61],
  [41.89, -87.61],
  [41.90, -87.62],
  [41.91, -87.63],
  [41.92, -87.64],
  [41.93, -87.64],
  [41.94, -87.65],
  [41.96, -87.65],
  [41.97, -87.65],
  [41.98, -87.66],
  [41.99, -87.66],
  [42.00, -87.66],
  [42.01, -87.66],
  [42.04, -87.67],
  [42.05, -87.67],
  [42.07, -87.68],
  [42.08, -87.69],
  [42.10, -87.69],
  [42.13, -87.70],
  [42.18, -87.70],
  [42.24, -87.68],
  [42.35, -87.82],
  [42.40, -87.82],
  [42.45, -87.81],
  [42.48, -87.81],
  [42.50, -87.80],
];

function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];

    const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isInLakeMichigan(lat, lng) {
  if (lat < 41.6 || lat > 42.5 || lng < -87.9 || lng > -87.5) {
    return false;
  }

  const polygon = [
    ...LAKE_MICHIGAN_SHORELINE,
    [42.50, -86.0],
    [41.60, -86.0],
  ];

  return pointInPolygon(lat, lng, polygon);
}

async function cleanupLakePins() {
  console.log('Fetching all pins...')

  // Get all pins
  const { data: pins, error } = await supabase
    .from('pins')
    .select('id,slug,lat,lng')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pins:', error)
    process.exit(1)
  }

  console.log(`Checking ${pins.length} pins...`)

  // Find pins in the lake
  const lakePins = pins.filter(pin => isInLakeMichigan(pin.lat, pin.lng))

  console.log(`\nFound ${lakePins.length} pins in Lake Michigan:`)
  lakePins.forEach(pin => {
    console.log(`  - ${pin.slug} (${pin.lat}, ${pin.lng})`)
  })

  if (lakePins.length === 0) {
    console.log('\n✅ No pins in the lake!')
    return
  }

  console.log(`\nDeleting ${lakePins.length} pins...`)

  // Delete pins in the lake
  const idsToDelete = lakePins.map(pin => pin.id)
  const { error: deleteError } = await supabase
    .from('pins')
    .delete()
    .in('id', idsToDelete)

  if (deleteError) {
    console.error('Error deleting pins:', deleteError)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${lakePins.length} pins from Lake Michigan`)
}

cleanupLakePins()
