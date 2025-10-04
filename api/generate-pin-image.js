// api/generate-pin-image.js
// Generates a static image of a pin card with details and map view

// Rate limiting map: IP -> { count, resetTime }
const rateLimitMap = new Map()
const RATE_LIMIT = 20 // requests
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
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const { slug } = req.query;

  // Validate slug
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Pin slug is required' });
  }

  // Sanitize slug (alphanumeric, hyphens, underscores only)
  const sanitizedSlug = slug.replace(/[^a-z0-9-_]/gi, '').slice(0, 100)
  if (!sanitizedSlug) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Fetch pin data using sanitized slug
    const { data: pin, error } = await supabase
      .from('pins')
      .select('slug, name, note, lat, lng, icon')
      .eq('slug', sanitizedSlug)
      .single();

    if (error || !pin) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    // HTML escape function to prevent XSS
    function escapeHTML(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
    }

    // Validate coordinates
    const lat = parseFloat(pin.lat)
    const lng = parseFloat(pin.lng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Generate static map image URL using Mapbox or similar
    const mapWidth = 400;
    const mapHeight = 200;
    const zoom = 14;
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || '';

    const staticMapUrl = mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+3b82f6(${lng},${lat})/${lng},${lat},${zoom},0/${mapWidth}x${mapHeight}@2x?access_token=${mapboxToken}`
      : `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&marker=${lat},${lng}`;

    // Escape all user-provided content
    const safeName = escapeHTML(pin.name)
    const safeNote = escapeHTML(pin.note)
    const safeSlug = escapeHTML(pin.slug)
    const safeIcon = escapeHTML(pin.icon)

    // Generate HTML for the pin card
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              overflow: hidden;
            }
            .map {
              width: 100%;
              height: 240px;
              background: #e5e7eb;
              position: relative;
            }
            .map img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .content {
              padding: 24px;
            }
            .emoji {
              font-size: 48px;
              margin-bottom: 16px;
              text-align: center;
            }
            .name {
              font-size: 28px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 8px;
              text-align: center;
            }
            .slug {
              font-size: 14px;
              color: #6b7280;
              font-family: monospace;
              text-align: center;
              margin-bottom: 16px;
            }
            .note {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.6;
              margin-bottom: 20px;
              text-align: center;
            }
            .location {
              background: #f3f4f6;
              padding: 12px;
              border-radius: 8px;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .coordinates {
              font-family: monospace;
              color: #3b82f6;
            }
            .footer {
              background: #f9fafb;
              padding: 16px 24px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            }
            .branding {
              font-size: 12px;
              color: #9ca3af;
            }
            .logo {
              font-weight: bold;
              color: #3b82f6;
            }
            .share-btn {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
              margin: 16px 0;
              transition: background 0.2s;
            }
            .share-btn:hover {
              background: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="map">
              <img src="${staticMapUrl}" alt="Map location" />
            </div>
            <div class="content">
              ${safeIcon ? `<div class="emoji">${safeIcon}</div>` : ''}
              ${safeName ? `<div class="name">${safeName}</div>` : ''}
              <div class="slug">#${safeSlug}</div>
              ${safeNote ? `<div class="note">${safeNote}</div>` : ''}
              <div class="location">
                📍 <span class="coordinates">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
              </div>
            </div>
            <div class="footer">
              <div style="text-align: center; margin-bottom: 12px;">
                <a href="sms:&body=${encodeURIComponent(`Check out this pin from Chi-Pins!\n\n${pin.note || pin.name || ''}\n\n${req.headers.host}/api/generate-pin-image?slug=${sanitizedSlug}`)}" class="share-btn">
                  💬 Share via Text
                </a>
              </div>
              <div class="branding">
                <span class="logo">Chi-Pins</span> • Share your Chicago moments
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Return HTML that can be screenshot or used as OG image
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error generating pin image:', error);
    res.status(500).json({ error: 'Failed to generate pin image' });
  }
}
