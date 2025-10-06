/**
 * Tile prefetching utilities to cache Chicago map tiles on startup
 */

// Chicago bounds
const CHICAGO_BOUNDS = {
  north: 42.0231,
  south: 41.6445,
  east: -87.5237,
  west: -87.9401,
};

// Calculate tile numbers from lat/lng
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const xtile = Math.floor((lng + 180) / 360 * n);
  const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { x: xtile, y: ytile };
}

// Get all tile URLs for a given zoom level within Chicago bounds
function getChicagoTiles(zoom) {
  const nw = latLngToTile(CHICAGO_BOUNDS.north, CHICAGO_BOUNDS.west, zoom);
  const se = latLngToTile(CHICAGO_BOUNDS.south, CHICAGO_BOUNDS.east, zoom);

  const tiles = [];

  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      // Rotate through OSM subdomains a, b, c
      const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
      const url = `https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      tiles.push(url);
    }
  }

  return tiles;
}

// Prefetch tiles for specific zoom levels
export async function prefetchChicagoTiles(options = {}) {
  const {
    zoomLevels = [10, 11, 12, 13], // Default: cache zoom levels 10-13
    maxConcurrent = 6, // Max concurrent requests
    onProgress = null, // Progress callback (current, total)
  } = options;

  console.log('[TilePrefetch] Starting prefetch for Chicago...');
  console.log('[TilePrefetch] Zoom levels:', zoomLevels);

  // Check if service worker and caches are available
  if (!('caches' in window)) {
    console.warn('[TilePrefetch] Cache API not available');
    return;
  }

  const cache = await caches.open('chi-pins-map-tiles-v1');

  // Collect all tile URLs
  const allTiles = [];
  for (const zoom of zoomLevels) {
    const tiles = getChicagoTiles(zoom);
    allTiles.push(...tiles);
    console.log(`[TilePrefetch] Zoom ${zoom}: ${tiles.length} tiles`);
  }

  console.log(`[TilePrefetch] Total tiles to fetch: ${allTiles.length}`);

  let completed = 0;
  let cached = 0;
  let failed = 0;

  // Process tiles in batches to avoid overwhelming the browser
  const processBatch = async (batch) => {
    const promises = batch.map(async (url) => {
      try {
        // Check if already cached
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          completed++;
          cached++;
          return;
        }

        // Fetch and cache
        const response = await fetch(url, {
          cache: 'force-cache',
          priority: 'low',
        });

        if (response.ok) {
          await cache.put(url, response);
          cached++;
        } else {
          failed++;
        }
      } catch (err) {
        console.warn(`[TilePrefetch] Failed to fetch ${url}:`, err.message);
        failed++;
      } finally {
        completed++;
        if (onProgress) {
          onProgress(completed, allTiles.length);
        }
      }
    });

    await Promise.all(promises);
  };

  // Process in batches
  for (let i = 0; i < allTiles.length; i += maxConcurrent) {
    const batch = allTiles.slice(i, i + maxConcurrent);
    await processBatch(batch);

    // Log progress every 50 tiles
    if (completed % 50 === 0 && completed > 0) {
      console.log(`[TilePrefetch] Progress: ${completed}/${allTiles.length} (${Math.round(completed / allTiles.length * 100)}%)`);
    }
  }

  console.log(`[TilePrefetch] Complete! Cached: ${cached}, Failed: ${failed}, Total: ${allTiles.length}`);

  return {
    total: allTiles.length,
    cached,
    failed,
  };
}

// Start prefetching in the background after page load
export function startBackgroundPrefetch(options = {}) {
  const {
    delay = 3000, // Wait 3 seconds after load before starting
    ...prefetchOptions
  } = options;

  // Wait for page to be fully loaded and idle
  if (document.readyState === 'complete') {
    setTimeout(() => prefetchChicagoTiles(prefetchOptions), delay);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => prefetchChicagoTiles(prefetchOptions), delay);
    });
  }
}

// Estimate cache size
export async function estimateCacheSize() {
  if (!('caches' in window)) return 0;

  try {
    const cache = await caches.open('chi-pins-map-tiles-v1');
    const requests = await cache.keys();
    return requests.length;
  } catch (err) {
    console.error('[TilePrefetch] Failed to estimate cache size:', err);
    return 0;
  }
}

// Clear tile cache
export async function clearTileCache() {
  if (!('caches' in window)) return;

  try {
    await caches.delete('chi-pins-map-tiles-v1');
    console.log('[TilePrefetch] Tile cache cleared');
  } catch (err) {
    console.error('[TilePrefetch] Failed to clear cache:', err);
  }
}

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.tilePrefetch = {
    start: prefetchChicagoTiles,
    clear: clearTileCache,
    estimateSize: estimateCacheSize,
  };

  console.log(`
Tile Prefetch utilities available!
- tilePrefetch.start()         - Start prefetching Chicago tiles
- tilePrefetch.estimateSize()  - Check how many tiles are cached
- tilePrefetch.clear()          - Clear tile cache
  `);
}
