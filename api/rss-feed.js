// api/rss-feed.js
// Fetches and parses RSS feeds for news ticker

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'RSS feed URL is required' });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Whitelist of allowed RSS feed domains for security
  const allowedDomains = [
    'chicagotribune.com',
    'chicago.suntimes.com',
    'chicagomag.com',
    'wgntv.com',
    'abc7chicago.com',
    'nbcchicago.com',
    'cbschicago.com',
    'blockclubchicago.org',
    'news.google.com',
    'rss.cnn.com',
    'feeds.bbci.co.uk',
  ];

  const urlObj = new URL(url);
  const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));

  if (!isAllowed) {
    return res.status(403).json({
      error: 'RSS feed domain not allowed',
      hint: 'Only Chicago news sources and major news outlets are permitted'
    });
  }

  try {
    // Fetch RSS feed
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Chi-Pins News Ticker/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xmlText = await response.text();

    // Simple RSS/Atom parsing (without external dependencies)
    const items = [];

    // Match both RSS <item> and Atom <entry> tags
    const itemRegex = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    const matches = xmlText.matchAll(itemRegex);

    for (const match of matches) {
      const itemXml = match[1];

      // Extract title (supports both <title> and <title><![CDATA[...]]></title>)
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : '';

      // Extract link
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i) ||
                        itemXml.match(/<link[^>]*href=["'](.*?)["']/i);
      const link = linkMatch ? linkMatch[1].trim() : '';

      // Extract pubDate or published
      const dateMatch = itemXml.match(/<(?:pubDate|published)[^>]*>(.*?)<\/(?:pubDate|published)>/i);
      const pubDate = dateMatch ? dateMatch[1].trim() : '';

      if (title) {
        items.push({
          title,
          link,
          pubDate,
        });
      }

      // Limit to 20 items
      if (items.length >= 20) break;
    }

    return res.status(200).json({
      items,
      count: items.length,
      source: urlObj.hostname,
    });

  } catch (error) {
    console.error('RSS feed error:', error);
    return res.status(500).json({
      error: 'Failed to fetch or parse RSS feed',
      details: error.message
    });
  }
}

function cleanText(text) {
  if (!text) return '';

  // Remove HTML tags
  let cleaned = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return cleaned.trim();
}
