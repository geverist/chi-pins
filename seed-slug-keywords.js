// seed-slug-keywords.js
// Run with: node seed-slug-keywords.js

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

// Improved and expanded Chicago-themed slug keywords
const slugKeywords = [
  // Sports Figures
  'Jordan', 'Pippen', 'Rodman', 'Kerr', 'Kukoc', 'Rose', 'Noah', 'Butler', 'DeRozan', 'LaVine',
  'Ditka', 'Payton', 'Butkus', 'Urlacher', 'Hester', 'Fields', 'Mack',
  'Rizzo', 'Bryant', 'Sandberg', 'Banks', 'Sosa', 'Maddux', 'Zambrano',
  'Konerko', 'Buehrle', 'Fisk', 'Thome', 'Abreu', 'Anderson',
  'Kane', 'Toews', 'Hull', 'Mikita', 'Crawford', 'Keith',

  // Neighborhoods
  'Wicker Park', 'Logan Square', 'Hyde Park', 'Bronzeville', 'Pilsen', 'Lincoln Park',
  'Lakeview', 'Uptown', 'Bridgeport', 'West Loop', 'South Loop', 'Old Town',
  'Chinatown', 'Rogers Park', 'Avondale', 'Humboldt Park', 'Bucktown', 'Albany Park',
  'Andersonville', 'Edgewater', 'Little Italy', 'Little Village', 'Garfield Ridge',
  'Beverly', 'Kenwood', 'Woodlawn', 'Streeterville', 'Gold Coast', 'River North',
  'Boystown', 'Greektown', 'Ukrainian Village', 'West Town', 'Near North',

  // Streets & Infrastructure
  'Michigan Ave', 'State Street', 'Clark', 'Halsted', 'Ashland', 'Damen', 'Western',
  'Lake Shore Drive', 'Wabash', 'Dearborn', 'LaSalle', 'Milwaukee', 'Elston',
  'Roosevelt', 'Madison', 'Belmont', 'Fullerton', 'Addison', 'Irving Park',
  'Red Line', 'Blue Line', 'Brown Line', 'Green Line', 'Orange Line', 'Pink Line',
  'Purple Line', 'Yellow Line', 'CTA', 'Metra', 'L Train', 'Elevated',

  // Food & Restaurants
  'Deep Dish', 'Tavern Style', 'Italian Beef', 'Chicago Dog', 'Maxwell Street Polish',
  'Rainbow Cone', 'Malort', 'Old Style', 'Goose Island', 'Garrett Popcorn',
  'Giardiniera', 'Sport Peppers', 'Celery Salt', 'Vienna Beef', 'Dragged Through Garden',
  'Portillos', 'Gene and Judes', 'Superdawg', 'Als Beef', 'Pequods',
  'Lou Malnatis', 'Giordanos', 'Ginos East', 'Pizzeria Uno', 'Harolds Chicken',
  'Billy Goat', 'Wieners Circle', 'Jims Original', 'Hot Doug', 'Big Star',
  'Au Cheval', 'Girl and the Goat', 'Smoque BBQ', 'Kumas Corner', 'Johnnie\'s Beef',

  // Landmarks & Attractions
  'Bean', 'Willis Tower', 'Sears Tower', 'Hancock', 'Navy Pier', 'Magnificent Mile',
  'Wrigley Field', 'Soldier Field', 'United Center', 'Guaranteed Rate Field',
  'Field Museum', 'Shedd Aquarium', 'Adler Planetarium', 'Art Institute',
  'Museum of Science', 'Chicago Theatre', 'Auditorium Theatre', 'Lyric Opera',
  'Buckingham Fountain', 'Cloud Gate', 'Millennium Park', 'Grant Park',
  'Jackson Park', 'Lincoln Park Zoo', 'Garfield Park Conservatory',
  '606 Trail', 'Riverwalk', 'Water Tower', 'Tribune Tower', 'Merchandise Mart',
  'Union Station', 'Rookery', 'Marina City', 'Aqua Tower', 'Monadnock Building',

  // History & Culture
  'Great Chicago Fire', 'Worlds Fair', 'Haymarket', 'Pullman Strike', 'Prohibition',
  'Columbian Exposition', 'Fort Dearborn', 'Union Stockyards', 'Route 66',
  'Al Capone', 'Jane Addams', 'Hull House', 'Daniel Burnham', 'Frank Lloyd Wright',
  'Carl Sandburg', 'Studs Terkel', 'Saul Bellow', 'Gwendolyn Brooks',

  // Nicknames & Slang
  'Windy City', 'Second City', 'Chi-Town', 'City of Big Shoulders', 'The Chi',
  'Hog Butcher', 'Sweet Home', '312', '773', '847', '630',
  'Dibs', 'Pop', 'Gym Shoes', 'Front Room', 'Frunchroom', 'Gangway',
  'The Loop', 'The L', 'The Lake', 'LSD',

  // Weather & Nature
  'Lake Michigan', 'Chicago River', 'Polar Vortex', 'Lake Effect', 'Blizzard',
  'Lakefront', 'Shoreline', 'Harbor', 'Beach', 'Skyline',
  'Prairie', 'Wetlands', 'Calumet', 'Des Plaines River',

  // Architecture & Housing
  'Bungalow', 'Greystone', 'Brownstone', 'Two Flat', 'Three Flat', 'Six Flat',
  'Courtyard Building', 'Art Deco', 'Prairie Style', 'Chicago School',
  'Skyscraper', 'High Rise', 'Drawbridge', 'Fire Escape', 'Back Porch',

  // Events & Festivals
  'Taste of Chicago', 'Lollapalooza', 'Pitchfork', 'Chicago Blues Festival',
  'Chicago Jazz Festival', 'Air and Water Show', 'St Patricks Day', 'Pride Parade',
  'Chicago Marathon', 'Venetian Night', 'Christkindlmarket',

  // Teams & Sports
  'Cubs', 'White Sox', 'Sox', 'Bulls', 'Bears', 'Blackhawks', 'Hawks',
  'Fire', 'Sky', 'Red Stars', 'Monsters', 'Wolves',
  'Da Bears', 'North Side', 'South Side', 'Cubbies',

  // Music & Arts
  'Chicago Blues', 'House Music', 'Chess Records', 'Second City Comedy',
  'Steppenwolf Theatre', 'Goodman Theatre', 'Chicago Symphony',
  'Muddy Waters', 'Buddy Guy', 'Common', 'Kanye', 'Chance the Rapper',
  'Smashing Pumpkins', 'Wilco', 'Ministry', 'Earth Wind Fire',

  // Misc Chicago Icons
  'Divvy', 'Ventra', 'I-PASS', 'Chicagoan', 'Mayor Daley', 'City Hall',
  'Picasso', 'Flamingo', 'Four Seasons', 'Calder', 'Miró',
  'Public Art', 'Street Art', 'Murals', 'Graffiti',
  'Corner Store', 'Mom and Pop', 'Bodega', 'Corner Tavern',
  'Neighborhood Bar', 'Dive Bar', 'Sports Bar', 'Brewpub',
]

async function seedSlugKeywords() {
  console.log('Seeding slug keywords...')

  // Delete existing keywords
  const { error: deleteError } = await supabase
    .from('slug_keywords')
    .delete()
    .neq('id', -1)

  if (deleteError && deleteError.code !== 'PGRST116') {
    console.error('Error deleting existing keywords:', deleteError)
  } else {
    console.log('Deleted existing keywords')
  }

  // Prepare keywords for insert
  const keywords = slugKeywords.map(word => ({ word: word.trim() }))

  // Insert new keywords
  const { error } = await supabase
    .from('slug_keywords')
    .insert(keywords)

  if (error) {
    console.error('Error inserting keywords:', error)
    process.exit(1)
  }

  console.log(`✅ Successfully seeded ${slugKeywords.length} slug keywords`)
  console.log('\nSample keywords:')
  slugKeywords.slice(0, 10).forEach(word => {
    console.log(`  - ${word}`)
  })
}

seedSlugKeywords()
