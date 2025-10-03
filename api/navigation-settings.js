// api/navigation-settings.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
        });
      }

      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      // Update navigation settings
      const { games_enabled, jukebox_enabled, order_enabled, explore_enabled } = req.body;

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
