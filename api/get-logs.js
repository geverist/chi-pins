// Simple endpoint to help debug - returns console logs from memory
// Note: This only works if logs are captured during the same function invocation

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // We can't actually access Vercel function logs from here
  // The user needs to check Vercel dashboard at:
  // https://vercel.com/geverists-projects/chi-pins/logs
  
  return res.status(200).json({
    message: 'Vercel function logs are not accessible via API.',
    instructions: [
      '1. Go to https://vercel.com/geverists-projects/chi-pins',
      '2. Click on "Logs" tab',
      '3. Filter by "api/submit-comment"',
      '4. Look for [submit-comment] log entries'
    ],
    alternative: 'Submit feedback again after deployment completes (1-2 min) and check the Vercel dashboard logs'
  });
}
