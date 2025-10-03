// api/square-menu.js
// Vercel serverless function to fetch Square catalog menu items

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID } = process.env;

  if (!SQUARE_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Square API not configured' });
  }

  try {
    // Fetch catalog items from Square
    const response = await fetch('https://connect.squareup.com/v2/catalog/list?types=ITEM', {
      method: 'GET',
      headers: {
        'Square-Version': '2024-10-17',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Square API error:', errorData);
      return res.status(response.status).json({
        error: 'Failed to fetch menu from Square',
        details: errorData
      });
    }

    const data = await response.json();
    const items = data.objects || [];

    // Transform Square catalog format into simpler menu format
    const menu = items
      .filter(item => item.type === 'ITEM' && !item.is_deleted)
      .map(item => {
        const itemData = item.item_data || {};
        const variations = itemData.variations || [];

        return {
          id: item.id,
          name: itemData.name || 'Unnamed Item',
          description: itemData.description || '',
          category: itemData.category_id || 'uncategorized',
          imageUrl: itemData.image_ids?.[0] ? `/api/square-image?id=${itemData.image_ids[0]}` : null,
          variations: variations.map(v => {
            const vData = v.item_variation_data || {};
            const priceMoney = vData.price_money || {};
            return {
              id: v.id,
              name: vData.name || 'Regular',
              price: priceMoney.amount ? priceMoney.amount / 100 : 0, // Convert cents to dollars
              currency: priceMoney.currency || 'USD',
              ordinal: vData.ordinal || 0,
            };
          }).sort((a, b) => a.ordinal - b.ordinal),
        };
      })
      .filter(item => item.variations.length > 0); // Only include items with valid variations

    return res.status(200).json({
      menu,
      locationId: SQUARE_LOCATION_ID || null,
    });
  } catch (error) {
    console.error('Error fetching Square menu:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
