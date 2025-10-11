/**
 * In-memory LRU cache for map tiles
 * Dramatically improves performance by avoiding filesystem/IndexedDB reads
 *
 * ADAPTIVE CACHE SIZING:
 * - Detects device RAM and adjusts cache size automatically
 * - Prevents OOM (Out Of Memory) errors on low-end Android devices
 * - Maximizes performance on high-end devices
 */

/**
 * Detect optimal cache size based on device hardware
 * @returns {number} Optimal cache size (number of tiles)
 */
function detectOptimalCacheSize() {
  // Try to detect device memory (available in modern browsers)
  const deviceMemoryGB = navigator?.deviceMemory || null;

  if (deviceMemoryGB) {
    console.log(`[TileCache] Detected device memory: ${deviceMemoryGB}GB`);

    // Adaptive sizing based on available RAM
    // Each tile is ~15KB average, so we allocate 0.5-2% of RAM for tile cache
    if (deviceMemoryGB >= 8) {
      // High-end device (8GB+): 1000 tiles = ~15MB = 0.19% of 8GB
      console.log('[TileCache] High-end device detected, using 1000 tiles (~15MB)');
      return 1000;
    } else if (deviceMemoryGB >= 4) {
      // Mid-range device (4-8GB): 700 tiles = ~10.5MB = 0.26% of 4GB
      console.log('[TileCache] Mid-range device detected, using 700 tiles (~10.5MB)');
      return 700;
    } else if (deviceMemoryGB >= 2) {
      // Low-mid device (2-4GB): 400 tiles = ~6MB = 0.3% of 2GB
      console.log('[TileCache] Low-mid device detected, using 400 tiles (~6MB)');
      return 400;
    } else {
      // Low-end device (<2GB): 200 tiles = ~3MB = 0.15% of 2GB
      console.log('[TileCache] Low-end device detected, using 200 tiles (~3MB)');
      return 200;
    }
  }

  // Fallback: detect by user agent (less accurate)
  const ua = navigator?.userAgent?.toLowerCase() || '';

  // Check if it's a tablet (usually more RAM)
  if (ua.includes('tablet') || ua.includes('ipad')) {
    console.log('[TileCache] Tablet detected (UA), using 700 tiles (~10.5MB)');
    return 700;
  }

  // Check if it's Android
  if (ua.includes('android')) {
    // Newer Android versions tend to have more RAM
    const androidVersion = parseFloat((ua.match(/android\s([0-9\.]+)/) || [])[1]);
    if (androidVersion >= 11) {
      console.log('[TileCache] Android 11+ detected, using 500 tiles (~7.5MB)');
      return 500;
    } else if (androidVersion >= 8) {
      console.log('[TileCache] Android 8-10 detected, using 300 tiles (~4.5MB)');
      return 300;
    } else {
      console.log('[TileCache] Older Android detected, using 200 tiles (~3MB)');
      return 200;
    }
  }

  // Default for unknown devices: conservative
  console.log('[TileCache] Unknown device, using conservative 500 tiles (~7.5MB)');
  return 500;
}

class TileCache {
  constructor(maxSize = null) {
    // Auto-detect optimal size if not specified
    if (maxSize === null) {
      maxSize = detectOptimalCacheSize();
    }

    this.cache = new Map(); // key -> { blob, timestamp }
    this.maxSize = maxSize;
    this.hits = 0;
    this.misses = 0;

    console.log(`[TileCache] Initialized with maxSize=${maxSize} tiles (~${Math.round(maxSize * 15 / 1024)}MB)`);
  }

  /**
   * Get cached tile blob
   * @returns {Blob|null}
   */
  get(z, x, y) {
    const key = `${z}/${x}/${y}`;

    if (this.cache.has(key)) {
      this.hits++;

      // Move to end (LRU - most recently used)
      const entry = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, entry);

      return entry.blob;
    }

    this.misses++;
    return null;
  }

  /**
   * Cache tile blob
   */
  set(z, x, y, blob) {
    const key = `${z}/${x}/${y}`;

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      blob,
      timestamp: Date.now()
    });
  }

  /**
   * Check if tile is cached
   */
  has(z, x, y) {
    const key = `${z}/${x}/${y}`;
    return this.cache.has(key);
  }

  /**
   * Clear all cached tiles
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      memoryEstimate: `${Math.round(this.cache.size * 15 / 1024)}KB` // ~15KB per tile average
    };
  }

  /**
   * Remove old tiles (older than maxAge ms)
   */
  evictOldTiles(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    const toRemove = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        toRemove.push(key);
      }
    }

    toRemove.forEach(key => this.cache.delete(key));

    return toRemove.length;
  }
}

// Singleton instance
let instance = null;

export function getTileCache() {
  if (!instance) {
    // Let TileCache auto-detect optimal size based on device hardware
    instance = new TileCache(null);
  }
  return instance;
}

export { TileCache };
