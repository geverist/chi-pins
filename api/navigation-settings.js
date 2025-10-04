// api/navigation-settings.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Rate limiting
const rateLimitMap = new Map()
const RATE_LIMIT = 30
const RATE_WINDOW = 60000 // 1 minute

function checkRateLimit(ip) {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  try {
    if (req.method === 'GET') {
      // Fetch navigation settings
      const { data, error } = await supabase
        .from('navigation_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching navigation settings:', error);
        return res.status(500).json({ error: error.message });
      }

      // Return default settings if none exist
      if (!data) {
        return res.status(200).json({
          games_enabled: true,
          jukebox_enabled: true,
          order_enabled: true,
          explore_enabled: true,
          photobooth_enabled: true,
          thenandnow_enabled: true,
          comments_enabled: true,
        });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      // Update navigation settings
      const {
        games_enabled,
        jukebox_enabled,
        order_enabled,
        explore_enabled,
        photobooth_enabled,
        thenandnow_enabled,
        comments_enabled
      } = req.body;

      // Validate input - must be booleans
      if (
        typeof games_enabled !== 'boolean' ||
        typeof jukebox_enabled !== 'boolean' ||
        typeof order_enabled !== 'boolean' ||
        typeof explore_enabled !== 'boolean' ||
        typeof photobooth_enabled !== 'boolean' ||
        typeof thenandnow_enabled !== 'boolean' ||
        typeof comments_enabled !== 'boolean'
      ) {
        return res.status(400).json({ error: 'Invalid input: all fields must be boolean' });
      }

      // First, get the existing record
      const { data: existing } = await supabase
        .from('navigation_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('navigation_settings')
          .update({
            games_enabled,
            jukebox_enabled,
            order_enabled,
            explore_enabled,
            photobooth_enabled,
            thenandnow_enabled,
            comments_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating navigation settings:', error);
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
      } else {
        // Insert new record if none exists
        const { data, error } = await supabase
          .from('navigation_settings')
          .insert({
            games_enabled,
            jukebox_enabled,
            order_enabled,
            explore_enabled,
            photobooth_enabled,
            thenandnow_enabled,
            comments_enabled,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating navigation settings:', error);
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error in navigation-settings API:', error);
    return res.status(500).json({ error: error.message });
  }
}
