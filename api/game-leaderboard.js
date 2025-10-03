// api/game-leaderboard.js
// Vercel serverless function to manage game leaderboards

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    if (req.method === 'GET') {
      // Get leaderboard
      const { game, limit = 10 } = req.query;

      if (!game) {
        return res.status(400).json({ error: 'game parameter required' });
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/game_scores?game=eq.${game}&order=score.desc,created_at.asc&limit=${limit}`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const scores = await response.json();

      return res.status(200).json({ scores });
    } else if (req.method === 'POST') {
      // Submit score
      const { game, initials, score, accuracy, time } = req.body;

      if (!game || !initials || score === undefined) {
        return res.status(400).json({ error: 'game, initials, and score are required' });
      }

      // Validate initials (3 characters, alphanumeric)
      if (!/^[A-Z0-9]{3}$/.test(initials)) {
        return res.status(400).json({ error: 'initials must be 3 alphanumeric characters' });
      }

      const scoreData = {
        game,
        initials: initials.toUpperCase(),
        score: parseInt(score),
        accuracy: accuracy !== undefined ? parseFloat(accuracy) : null,
        time: time !== undefined ? parseFloat(time) : null,
        created_at: new Date().toISOString(),
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/game_scores`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(scoreData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save score');
      }

      const savedScore = await response.json();

      // Get rank
      const rankResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/game_scores?game=eq.${game}&score=gt.${score}&select=id`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );

      const higherScores = rankResponse.ok ? await rankResponse.json() : [];
      const rank = higherScores.length + 1;

      return res.status(200).json({
        score: savedScore[0],
        rank,
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
