// api/debug-log.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Allow both GET (to retrieve logs) and POST (to store logs)
  if (req.method === 'GET') {
    try {
      // Retrieve recent debug logs
      const { data, error } = await supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return res.status(200).json({ logs: data || [] });
    } catch (error) {
      console.error('Error retrieving debug logs:', error);
      return res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { logs, timestamp, userAgent, url, sessionId } = req.body;

    // Store in Supabase
    const { error } = await supabase
      .from('debug_logs')
      .insert({
        session_id: sessionId || null,
        user_agent: userAgent || req.headers['user-agent'],
        url: url || req.headers.referer,
        logs: Array.isArray(logs) ? logs : [logs],
        created_at: timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase error:', error);
      // Still log to console as fallback
      console.log('=== DEBUG LOGS FROM CLIENT ===');
      console.log(JSON.stringify({ userAgent, url, logs }, null, 2));
      console.log('==============================');
    }

    return res.status(200).json({
      success: true,
      message: 'Logs received',
    });
  } catch (error) {
    console.error('Error handling debug logs:', error);
    return res.status(500).json({ error: 'Failed to log' });
  }
}

