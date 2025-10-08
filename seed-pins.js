// seed-pins.js - Seed database with sample Chicago-themed pins
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Chicago-themed words for slugs
const chicagoWords = [
  'deep-dish', 'wind', 'lakefront', 'blues', 'jazz', 'portillos', 'wrigley',
  'bean', 'sears', 'hancock', 'navy-pier', 'magnificent-mile', 'loop', 'el-train',
  'hot-dog', 'italian-beef', 'garrett-popcorn', 'superdawg', 'giordanos',
  'chicago-river', 'grant-park', 'millennium-park', 'buckingham', 'shedd',
  'field-museum', 'adler', 'art-institute', 'lincoln-park', 'humboldt',
  'pilsen', 'bridgeport', 'uptown', 'edgewater', 'andersonville', 'boystown',
  'wicker-park', 'logan-square', 'ukrainians', 'chinatown', 'bronzeville',
  'hyde-park', 'south-loop', 'west-loop', 'river-north', 'gold-coast',
  'old-town', 'lakeview', 'roscoe', 'belmont', 'fullerton', 'armitage',
  'division', 'chicago-ave', 'clark', 'state', 'wabash', 'michigan',
  'pizza', 'tavern-style', 'malort', 'old-style', 'goose-island',
  'cubs', 'sox', 'bulls', 'bears', 'blackhawks', 'fire', 'sky',
  'prairie', 'skyscraper', 'windy-city', 'chi-town', '312', '773',
  'l-platform', 'cta', 'metra', 'divvy', 'lsd', 'lake-shore',
  'rainbow-cone', 'vienna-beef', 'celery-salt', 'sport-peppers',
  'giardiniera', 'dragged-through-garden', 'combo', 'cheezborger',
  'dibs', 'shotgun-house', 'bungalow', 'greystone', 'brownstone',
  'alley', 'gangway', 'prairie-ave', 'front-room', 'pop', 'gym-shoes',
];

const teams = ['cubs', 'whitesox', 'other'];

// Custom pin styles from src/config/pinStyles.js
const pinStyles = ['bears', 'bulls', 'cubs', 'whitesox', 'blackhawks', 'chicagostar'];

const hotdogStands = [
  "Portillo's", "Gene & Jude's", "Superdawg", "Jim's Original",
  "The Wieners Circle", "Byron's Hot Dogs", "Wolfy's", "Devil Dawgs",
  "Jimmy's Red Hots", "Phil's Last Stand", "Fatso's Last Stand"
];

const sampleNotes = [
  "Best deep dish I've ever had! The crust is buttery and flaky.",
  "Amazing Italian beef - get it dipped!",
  "Great spot for people watching and grabbing a beer.",
  "Hidden gem with incredible views of the skyline.",
  "Perfect place to catch the sunset over the lake.",
  "The breakfast here is unbeatable - try the chilaquiles!",
  "Cozy neighborhood bar with friendly locals.",
  "Best coffee in the city, hands down.",
  "Live music on weekends - highly recommend!",
  "Historic building with fascinating architecture.",
  "Family-friendly spot with a great patio.",
  "Cash only, but totally worth it!",
  "Get here early - the line gets long!",
  "Ask for extra giardiniera - you won't regret it.",
  "The pizza tavern-style is the real Chicago experience.",
  "Great spot before a game at Wrigley.",
  "Perfect divey atmosphere with strong drinks.",
  "The outdoor seating area is a hidden oasis.",
  "Try the Chicago-style tamales - different but delicious!",
  "Best gyros outside of Greektown.",
  "The bone-in rib tips are incredible here.",
  "Classic Chicago diner vibes - straight from the 50s.",
  "Get the combo - you can't go wrong.",
  "Dragged through the garden is the only way to order.",
  "Sport peppers and celery salt make it authentic.",
];

// Chicago metro area bounds (roughly)
const CHI_BOUNDS = {
  north: 42.05,
  south: 41.65,
  west: -87.95,
  east: -87.52,
};

// Global locations for visual diversity
const globalLocations = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522, continent: 'Europe' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, continent: 'Asia' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, continent: 'Oceania' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, continent: 'South America' },
  { name: 'Cape Town', lat: -33.9249, lng: 18.4241, continent: 'Africa' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, continent: 'North America' },
  { name: 'London', lat: 51.5074, lng: -0.1278, continent: 'Europe' },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, continent: 'Asia' },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChicagoLocation() {
  return {
    lat: randomBetween(CHI_BOUNDS.south, CHI_BOUNDS.north),
    lng: randomBetween(CHI_BOUNDS.west, CHI_BOUNDS.east),
  };
}

function generateSlug() {
  const word1 = randomChoice(chicagoWords);
  const word2 = randomChoice(chicagoWords);
  const num = Math.floor(Math.random() * 1000);
  return word1 === word2 ? `${word1}-${num}` : `${word1}-${word2}`;
}

function generateNeighborhood() {
  const neighborhoods = [
    'Loop', 'River North', 'Gold Coast', 'Lincoln Park', 'Lakeview',
    'Wicker Park', 'Logan Square', 'Pilsen', 'Bridgeport', 'Hyde Park',
    'Andersonville', 'Uptown', 'Edgewater', 'Rogers Park', 'West Loop',
    'South Loop', 'Chinatown', 'Little Italy', 'Old Town', 'Bucktown',
    'Humboldt Park', 'Albany Park', 'Ravenswood', 'Lincoln Square',
  ];
  return randomChoice(neighborhoods);
}

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  // Delete all existing pins
  console.log('🗑️  Deleting existing pins...');
  const { error: deleteError } = await supabase
    .from('pins')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error deleting pins:', deleteError);
    return;
  }

  console.log('✅ Existing pins deleted');

  const pins = [];
  const usedSlugs = new Set();

  function getUniqueSlug() {
    let slug;
    let attempts = 0;
    do {
      slug = generateSlug();
      attempts++;
      if (attempts > 100) {
        // Fallback to guaranteed unique slug
        slug = `${slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        break;
      }
    } while (usedSlugs.has(slug));
    usedSlugs.add(slug);
    return slug;
  }

  // Generate 150 Chicago pins
  console.log('📍 Generating 150 Chicago pins...');
  for (let i = 0; i < 150; i++) {
    const location = randomChicagoLocation();
    const team = randomChoice(teams);
    const slug = getUniqueSlug();
    const note = randomChoice(sampleNotes);
    const hotdog = Math.random() > 0.6 ? randomChoice(hotdogStands) : null;

    // Randomly assign a custom pin style (70% chance to get one, 30% default)
    const pinStyle = Math.random() > 0.3 ? randomChoice(pinStyles) : null;

    pins.push({
      slug,
      name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      team,
      pinStyle,
      lat: location.lat,
      lng: location.lng,
      neighborhood: generateNeighborhood(),
      hotdog,
      note,
      source: 'kiosk',
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Generate 8 global pins
  console.log('🌍 Generating 8 global pins...');
  globalLocations.forEach(loc => {
    const slug = getUniqueSlug();

    // Randomly assign a custom pin style (70% chance to get one, 30% default)
    const pinStyle = Math.random() > 0.3 ? randomChoice(pinStyles) : null;

    pins.push({
      slug,
      name: `${loc.name} - ${slug.split('-').join(' ')}`,
      team: randomChoice(teams),
      pinStyle,
      lat: loc.lat,
      lng: loc.lng,
      continent: loc.continent,
      note: `Visited ${loc.name} and had an amazing time! ${randomChoice(sampleNotes)}`,
      source: 'global',
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  // Insert pins in batches of 50
  console.log('💾 Inserting pins into database...');
  const batchSize = 50;
  for (let i = 0; i < pins.length; i += batchSize) {
    const batch = pins.slice(i, i + batchSize);
    const { error } = await supabase.from('pins').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} pins)`);
    }
  }

  console.log(`🎉 Database seeded with ${pins.length} pins!`);
  console.log('   - 150 Chicago pins');
  console.log('   - 8 global pins');
}

seedDatabase().catch(console.error);
