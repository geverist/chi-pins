// api/generate-pin-image.js
// Generates a static image of a pin card with details and map view

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Pin slug is required' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Fetch pin data
    const { data: pin, error } = await supabase
      .from('pins')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !pin) {
      return res.status(404).json({ error: 'Pin not found' });
    }

    // Generate static map image URL using Mapbox or similar
    const mapWidth = 400;
    const mapHeight = 200;
    const zoom = 14;
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || '';

    const staticMapUrl = mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+3b82f6(${pin.longitude},${pin.latitude})/${pin.longitude},${pin.latitude},${zoom},0/${mapWidth}x${mapHeight}@2x?access_token=${mapboxToken}`
      : `https://www.openstreetmap.org/export/embed.html?bbox=${pin.longitude - 0.01},${pin.latitude - 0.01},${pin.longitude + 0.01},${pin.latitude + 0.01}&marker=${pin.latitude},${pin.longitude}`;

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
          </style>
        </head>
        <body>
          <div class="card">
            <div class="map">
              <img src="${staticMapUrl}" alt="Map location" />
            </div>
            <div class="content">
              ${pin.icon ? `<div class="emoji">${pin.icon}</div>` : ''}
              ${pin.name ? `<div class="name">${pin.name}</div>` : ''}
              <div class="slug">#${pin.slug}</div>
              ${pin.note ? `<div class="note">${pin.note}</div>` : ''}
              <div class="location">
                📍 <span class="coordinates">${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}</span>
              </div>
            </div>
            <div class="footer">
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
