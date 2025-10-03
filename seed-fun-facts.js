// seed-fun-facts.js
// Run with: node seed-fun-facts.js

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

const funFacts = [
  { key: 'chicago', fact: 'The Chicago River flows backwards! Engineers reversed it in 1900 to improve sanitation.' },
  { key: 'evanston', fact: 'Home to Northwestern University and birthplace of the ice cream sundae (1890s).' },
  { key: 'oakpark', fact: "Frank Lloyd Wright's architectural playground - 25 buildings still stand here." },
  { key: 'cicero', fact: 'Al Capone ran his empire from the Hawthorne Hotel, still standing on Ogden Ave.' },
  { key: 'skokie', fact: 'The "World\'s Largest Village" was called Niles Center until 1940.' },
  { key: 'schaumburg', fact: "Went from 130 residents (1956) to 75,000+ today - one of America's fastest-growing suburbs." },
  { key: 'naperville', fact: 'Named "Best Place to Live in America" twice by Money magazine.' },
  { key: 'aurora', fact: 'First U.S. city to illuminate its streets entirely with electric lights (1881).' },
  { key: 'joliet', fact: 'The Old Joliet Prison hosted Jake and Elwood in The Blues Brothers opening scene.' },
  { key: 'waukegan', fact: 'Ray Bradbury grew up here - Green Town in his novels is based on Waukegan.' },
  { key: 'oak lawn', fact: "The Hilltop restaurant's iconic neon sign has been a Route 66 landmark since 1961." },
  { key: 'des plaines', fact: "Home of the first McDonald's franchise opened by Ray Kroc in 1955." },
  { key: 'wilmette', fact: "The Baha'i House of Worship is the oldest surviving Baha'i temple in the world." },
  { key: 'berwyn', fact: "Features the world's largest laundromat and Cermak Plaza's iconic \"Spindle\" car sculpture." },
  { key: 'park ridge', fact: 'Hillary Clinton\'s hometown - she graduated from Maine South High School.' },
  { key: 'glen ellyn', fact: 'Lake Ellyn was created in 1889 by damming a creek to power a mill.' },
  { key: 'wheaton', fact: 'Red Grange, "The Galloping Ghost," played football at Wheaton College.' },
  { key: 'orland park', fact: "Named after the town's founder, John Orland, who arrived in the 1840s." },
  { key: 'tinley park', fact: "Home to the Hollywood Casino Amphitheatre, one of the Midwest's premier concert venues." },
  { key: 'oak brook', fact: "McDonald's global headquarters moved here in 2018 to a sprawling campus." },
  { key: 'lombard', fact: "The Lilac Village celebrates Lilacia Park's 1,200+ lilac bushes each May." },
  { key: 'downers grove', fact: 'The Pierce Downer cabin (1832) is one of the oldest structures in the area.' },
  { key: 'elmhurst', fact: 'York Theatre, built in 1924, is one of the few remaining atmospheric movie palaces.' },
  { key: 'palatine', fact: 'Named after Palatine, New York, by early settlers from that region.' },
  { key: 'arlington heights', fact: 'Arlington Park racetrack hosted the first million-dollar horse race in 1981.' },
  { key: 'buffalo grove', fact: 'Named after the buffalo that once roamed the prairie groves here.' },
  { key: 'mount prospect', fact: 'The Busse-Biermann mansion (1910) is now a historical museum.' },
  { key: 'hoffman', fact: 'Hoffman Estates was farmland until the 1950s when Sam Hoffman built planned suburbs.' },
  { key: 'bolingbrook', fact: "Incorporated in 1965, it's one of Illinois's youngest and fastest-growing towns." },
  { key: 'crystal lake', fact: 'The lake itself was formed by a glacier and is spring-fed - hence the crystal-clear water.' },
]

async function seedFunFacts() {
  console.log('Seeding fun facts...')

  // Delete existing facts (use key column instead of id)
  const { error: deleteError } = await supabase
    .from('fun_facts')
    .delete()
    .neq('key', '') // delete all rows

  if (deleteError && deleteError.code !== 'PGRST116') {
    // PGRST116 = table doesn't exist or is empty, which is fine
    console.error('Error deleting existing facts:', deleteError)
  } else {
    console.log('Deleted existing fun facts')
  }

  // Insert new facts
  const { data, error } = await supabase
    .from('fun_facts')
    .insert(funFacts)

  if (error) {
    console.error('Error inserting fun facts:', error)
    process.exit(1)
  }

  console.log(`✅ Successfully seeded ${funFacts.length} fun facts`)
  console.log('\nSample facts:')
  funFacts.slice(0, 3).forEach(f => {
    console.log(`  ${f.key}: ${f.fact}`)
  })
}

seedFunFacts()
