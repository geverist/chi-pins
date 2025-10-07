// scripts/populate-marketplace.js
// Populate marketplace with existing widgets from the codebase

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

// Define marketplace widgets based on existing codebase features
const widgets = [
  // SCROLL BARS (Banners)
  {
    slug: 'now-playing-banner',
    name: 'Now Playing Banner',
    category: 'scroll-bars',
    description: 'Scrolling banner showing currently playing music from jukebox',
    price_monthly: 29,
    features: [
      'Real-time now playing display',
      'Scrolling animation',
      'Album art and artist info',
      'Configurable scroll speed',
      'Mobile responsive'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      scrollSpeedKiosk: { type: 'number', default: 30, min: 10, max: 120 },
      scrollSpeedMobile: { type: 'number', default: 20, min: 10, max: 120 },
      showOnMobile: { type: 'boolean', default: true }
    }
  },
  {
    slug: 'news-ticker',
    name: 'News Ticker',
    category: 'scroll-bars',
    description: 'Scrolling RSS news feed banner',
    price_monthly: 29,
    features: [
      'RSS feed integration',
      'Customizable scroll speed',
      'Multiple feed sources',
      'Auto-refresh',
      'Kiosk and mobile display'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      rssUrl: { type: 'string', default: 'https://news.google.com/rss' },
      scrollSpeedKiosk: { type: 'number', default: 30 },
      scrollSpeedMobile: { type: 'number', default: 20 },
      enabled: { type: 'boolean', default: false }
    }
  },

  // OVERLAY WIDGETS
  {
    slug: 'weather-widget',
    name: 'Weather Widget',
    category: 'overlay-widgets',
    description: 'Local weather display with conditions and recommendations',
    price_monthly: 19,
    features: [
      'Current weather conditions',
      'Temperature and forecast',
      'Weather-based recommendations',
      'Customizable location',
      'Auto-refresh'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      enabled: { type: 'boolean', default: true },
      location: { type: 'string', default: 'Chicago, IL' },
      lat: { type: 'number', default: 41.8781 },
      lng: { type: 'number', default: -87.6298 },
      timezone: { type: 'string', default: 'America/Chicago' }
    }
  },
  {
    slug: 'popular-spots-overlay',
    name: 'Popular Spots Overlay',
    category: 'overlay-widgets',
    description: 'Map overlay showing popular locations with pins',
    price_monthly: 39,
    features: [
      'Custom location markers',
      'Category-based filtering (hotdog, pizza, beef)',
      'Zoom-based label display',
      'Database-backed locations',
      'Auto-sync with database'
    ],
    active: true,
    featured: true
  },

  // NAVIGATION ITEMS
  {
    slug: 'games-menu',
    name: 'Games Menu',
    category: 'navigation-items',
    description: 'Interactive games including trivia, hot dog assembly, deep dish, and popcorn wind',
    price_monthly: 79,
    features: [
      'Trivia game with leaderboard',
      'Hot dog assembly game',
      'Deep dish pizza game',
      'Popcorn wind game',
      'Global leaderboards',
      'Configurable difficulty',
      'Achievement system',
      'Idle timeout protection'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      enabled: { type: 'boolean', default: true },
      idleTimeout: { type: 'number', default: 180 },
      triviaQuestions: { type: 'number', default: 8 },
      triviaTimeLimit: { type: 'number', default: 12 },
      hotdogTimeLimit: { type: 'number', default: 90 },
      deepDishStartSpeed: { type: 'number', default: 2 },
      deepDishEndSpeed: { type: 'number', default: 5 }
    }
  },
  {
    slug: 'jukebox',
    name: 'Jukebox',
    category: 'navigation-items',
    description: 'Music selection and playback with Spotify integration',
    price_monthly: 99,
    features: [
      'Spotify integration',
      'Song search',
      'Queue management',
      'Now playing display',
      'Local and Bluetooth audio output',
      'Sonos integration',
      'Auto-play option',
      'Idle timeout protection'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      enabled: { type: 'boolean', default: true },
      idleTimeout: { type: 'number', default: 120 },
      audioOutputType: { type: 'string', default: 'local', enum: ['local', 'bluetooth', 'sonos'] },
      autoPlay: { type: 'boolean', default: false }
    }
  },
  {
    slug: 'ordering-menu',
    name: 'Ordering Menu',
    category: 'navigation-items',
    description: 'Food ordering system with menu display and cart',
    price_monthly: 129,
    features: [
      'Menu display with categories',
      'Shopping cart',
      'Order customization',
      'POS integration ready',
      'SMS order notifications',
      'Order history',
      'Idle timeout protection'
    ],
    active: true,
    featured: true,
    configuration_schema: {
      enabled: { type: 'boolean', default: true },
      idleTimeout: { type: 'number', default: 300 }
    }
  },

  // Already existing widgets from migration
  // These are included in the seed data, so we use ON CONFLICT to update if needed
];

async function populateMarketplace() {
  console.log('🧩 Populating marketplace with widgets...\n');

  let added = 0;
  let updated = 0;
  let errors = 0;

  for (const widget of widgets) {
    try {
      // Check if widget exists
      const { data: existing } = await supabase
        .from('marketplace_widgets')
        .select('id, slug')
        .eq('slug', widget.slug)
        .maybeSingle();

      if (existing) {
        // Update existing widget
        const { error } = await supabase
          .from('marketplace_widgets')
          .update(widget)
          .eq('slug', widget.slug);

        if (error) throw error;

        console.log(`✓ Updated: ${widget.name}`);
        updated++;
      } else {
        // Insert new widget
        const { error } = await supabase
          .from('marketplace_widgets')
          .insert([widget]);

        if (error) throw error;

        console.log(`✓ Added: ${widget.name}`);
        added++;
      }
    } catch (error) {
      console.error(`✗ Failed to process ${widget.name}:`, error.message);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Added: ${added}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${widgets.length}`);
}

// Run the population
populateMarketplace()
  .then(() => {
    console.log('\n✅ Marketplace population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
