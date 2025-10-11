/**
 * Offline tile storage system for Capacitor + Browser
 * Stores map tiles in native filesystem (Capacitor) or IndexedDB (browser)
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const TILE_CACHE_VERSION = 1;
const TILE_DB_NAME = 'chi-pins-tiles';
const TILE_STORE_NAME = 'tiles';
const TILE_DIR = 'map-tiles';

// Chicago bounds for tile prefetching
const CHICAGO_BOUNDS = {
  north: 42.0231,
  south: 41.6445,
  east: -87.5237,
  west: -87.9401,
};

// Global bounds (entire world)
const GLOBAL_BOUNDS = {
  north: 85,
  south: -85,
  east: 180,
  west: -180,
};

// Major metro areas for strategic tile preloading
// Limited to ~20 cities globally to keep storage manageable (~50MB total)
const MAJOR_METROS = [
  // North America
  { name: 'New York', lat: 40.7128, lng: -74.0060, radius: 0.3 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, radius: 0.3 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, radius: 0.3 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, radius: 0.25 },

  // Europe
  { name: 'London', lat: 51.5074, lng: -0.1278, radius: 0.25 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, radius: 0.25 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, radius: 0.25 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, radius: 0.25 },

  // Asia
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, radius: 0.3 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, radius: 0.3 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, radius: 0.25 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, radius: 0.2 },

  // Middle East
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, radius: 0.25 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, radius: 0.25 },

  // South America
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, radius: 0.3 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, radius: 0.25 },

  // Africa
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, radius: 0.25 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, radius: 0.25 },

  // Oceania
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, radius: 0.25 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, radius: 0.2 },
];

// Check if running in native Capacitor app
const isNative = Capacitor.isNativePlatform();

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const xtile = Math.floor((lng + 180) / 360 * n);
  const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  return { x: xtile, y: ytile };
}

/**
 * Get all tile coordinates for Chicago at given zoom levels
 */
function getChicagoTileCoords(zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17]) {
  const tiles = [];

  for (const zoom of zoomLevels) {
    const nw = latLngToTile(CHICAGO_BOUNDS.north, CHICAGO_BOUNDS.west, zoom);
    const se = latLngToTile(CHICAGO_BOUNDS.south, CHICAGO_BOUNDS.east, zoom);

    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles;
}

/**
 * Get all tile coordinates for global map at given zoom levels
 */
function getGlobalTileCoords(zoomLevels = [3, 4, 5]) {
  const tiles = [];

  for (const zoom of zoomLevels) {
    const nw = latLngToTile(GLOBAL_BOUNDS.north, GLOBAL_BOUNDS.west, zoom);
    const se = latLngToTile(GLOBAL_BOUNDS.south, GLOBAL_BOUNDS.east, zoom);

    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        tiles.push({ x, y, z: zoom });
      }
    }
  }

  return tiles;
}

/**
 * Get tile coordinates for all major metro areas
 * Limited zoom levels (10-12) to keep storage under ~50MB
 */
function getMetroTileCoords(zoomLevels = [10, 11, 12]) {
  const tiles = [];

  for (const metro of MAJOR_METROS) {
    // Calculate bounds based on radius (in degrees)
    const bounds = {
      north: metro.lat + metro.radius,
      south: metro.lat - metro.radius,
      east: metro.lng + metro.radius,
      west: metro.lng - metro.radius,
    };

    for (const zoom of zoomLevels) {
      const nw = latLngToTile(bounds.north, bounds.west, zoom);
      const se = latLngToTile(bounds.south, bounds.east, zoom);

      for (let x = nw.x; x <= se.x; x++) {
        for (let y = nw.y; y <= se.y; y++) {
          tiles.push({ x, y, z: zoom, metro: metro.name });
        }
      }
    }
  }

  return tiles;
}

/**
 * IndexedDB storage for browser fallback
 */
class IndexedDBTileStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(TILE_DB_NAME, TILE_CACHE_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(TILE_STORE_NAME)) {
          db.createObjectStore(TILE_STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  async saveTile(z, x, y, blob) {
    const db = await this.init();
    const key = `${z}/${x}/${y}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TILE_STORE_NAME);
      const request = store.put({ key, blob, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTile(z, x, y) {
    const db = await this.init();
    const key = `${z}/${x}/${y}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(TILE_STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(TILE_STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStats() {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TILE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(TILE_STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        resolve({
          tileCount: countRequest.result,
          storage: 'IndexedDB',
        });
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}

/**
 * Native filesystem storage for Capacitor
 */
class NativeTileStorage {
  async saveTile(z, x, y, blob) {
    try {
      const path = `${TILE_DIR}/${z}/${x}`;
      const fileName = `${y}.png`;

      // Convert blob to base64
      const base64 = await this.blobToBase64(blob);

      // Save to filesystem (recursive: true creates directories)
      await Filesystem.writeFile({
        path: `${path}/${fileName}`,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (err) {
      // Silently fail - tile will be fetched from network next time
      // Only log actual errors, not expected failures
      if (err.code !== 'OS-PLUG-FILE-0011') {
        console.warn('[NativeTileStorage] Failed to save tile:', err.message);
      }
      throw err;
    }
  }

  async getTile(z, x, y) {
    try {
      const path = `${TILE_DIR}/${z}/${x}/${y}.png`;

      const result = await Filesystem.readFile({
        path,
        directory: Directory.Data,
      });

      // Convert base64 back to blob
      return this.base64ToBlob(result.data, 'image/png');
    } catch (err) {
      // File doesn't exist - this is expected, don't log
      // Tiles will be downloaded on-demand or in background
      return null;
    }
  }

  async clearAll() {
    try {
      await Filesystem.rmdir({
        path: TILE_DIR,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (err) {
      console.warn('[NativeTileStorage] Failed to clear tiles:', err);
    }
  }

  async getStats() {
    try {
      // This is approximate - would need to recursively count files
      return {
        tileCount: 'N/A',
        storage: 'Native Filesystem',
      };
    } catch (err) {
      return {
        tileCount: 0,
        storage: 'Native Filesystem (not initialized)',
      };
    }
  }

  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  base64ToBlob(base64, type = 'image/png') {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }
}

/**
 * Unified storage interface - automatically uses native or browser storage
 */
class OfflineTileStorage {
  constructor() {
    this.storage = isNative ? new NativeTileStorage() : new IndexedDBTileStorage();
    this.pendingBatch = [];
    this.batchTimer = null;
    this.batchSize = 10; // Save 10 tiles at a time
    this.batchDelay = 1000; // Wait 1 second to collect more tiles

    console.log(`[OfflineTileStorage] Using ${isNative ? 'Native Filesystem' : 'IndexedDB'} storage with batching`);
  }

  async init() {
    if (this.storage.init) {
      await this.storage.init();
    }
  }

  /**
   * Save a single tile (non-batched)
   */
  async saveTile(z, x, y, blob) {
    return this.storage.saveTile(z, x, y, blob);
  }

  /**
   * Queue tile for batch saving (performance optimization for Android)
   * @param {number} z
   * @param {number} x
   * @param {number} y
   * @param {Blob} blob
   */
  queueTileSave(z, x, y, blob) {
    this.pendingBatch.push({ z, x, y, blob });

    // Flush immediately if batch is full
    if (this.pendingBatch.length >= this.batchSize) {
      this.flushBatch();
      return;
    }

    // Otherwise, debounce the flush
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.batchDelay);
  }

  /**
   * Save all queued tiles in parallel batches
   */
  async flushBatch() {
    if (this.pendingBatch.length === 0) return;

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];
    this.batchTimer = null;

    console.log(`[OfflineTileStorage] Flushing batch of ${batch.length} tiles`);

    // Save in parallel batches to avoid blocking
    const promises = batch.map(({ z, x, y, blob }) =>
      this.storage.saveTile(z, x, y, blob).catch(err => {
        // Silently fail individual tiles - don't block the batch
        console.warn(`[OfflineTileStorage] Failed to save tile ${z}/${x}/${y}:`, err.message);
      })
    );

    await Promise.all(promises);
  }

  async getTile(z, x, y) {
    return this.storage.getTile(z, x, y);
  }

  async clearAll() {
    // Clear pending batch
    this.pendingBatch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    return this.storage.clearAll();
  }

  async getStats() {
    return this.storage.getStats();
  }

  /**
   * Get tile URL - checks local storage first, falls back to network
   */
  async getTileUrl(z, x, y) {
    try {
      const blob = await this.getTile(z, x, y);
      if (blob) {
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('[OfflineTileStorage] Error getting tile:', err);
    }

    // Fallback to network
    const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
    return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  /**
   * Download tiles for the visible map area
   * Call this when the map moves in global mode to progressively cache tiles
   */
  async downloadVisibleTiles(map, options = {}) {
    const {
      maxConcurrent = 2,
      zoomBuffer = 1, // Download tiles for current zoom ± this value
      onProgress = null,
    } = options;

    if (!map) return;

    const bounds = map.getBounds();
    const currentZoom = Math.floor(map.getZoom());

    // Download tiles for current zoom level and one level up/down
    const minZoom = Math.max(0, currentZoom - zoomBuffer);
    const maxZoom = Math.min(18, currentZoom + zoomBuffer);

    const tiles = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const nw = latLngToTile(bounds.getNorth(), bounds.getWest(), z);
      const se = latLngToTile(bounds.getSouth(), bounds.getEast(), z);

      for (let x = nw.x; x <= se.x; x++) {
        for (let y = nw.y; y <= se.y; y++) {
          tiles.push({ x, y, z });
        }
      }
    }

    console.log(`[OfflineTileStorage] Downloading ${tiles.length} visible tiles (zoom ${minZoom}-${maxZoom})`);

    let completed = 0;
    let cached = 0;
    let skipped = 0;

    // Process tiles in batches
    for (let i = 0; i < tiles.length; i += maxConcurrent) {
      const batch = tiles.slice(i, i + maxConcurrent);

      await Promise.all(batch.map(async ({ x, y, z }) => {
        try {
          // Check if already cached
          const existing = await this.getTile(z, x, y);
          if (existing) {
            skipped++;
            completed++;
            return;
          }

          // Download tile
          const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
          const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

          const response = await fetch(url, {
            cache: 'force-cache',
            priority: 'low',
          });

          if (!response.ok) {
            console.warn(`[OfflineTileStorage] Failed to download tile ${z}/${x}/${y}`);
            return;
          }

          const blob = await response.blob();
          await this.saveTile(z, x, y, blob);
          cached++;
        } catch (err) {
          console.warn(`[OfflineTileStorage] Error downloading tile ${z}/${x}/${y}:`, err.message);
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, tiles.length, { cached, skipped });
          }
        }
      }));
    }

    console.log(`[OfflineTileStorage] Visible tiles cached: ${cached} new, ${skipped} already cached`);

    return { total: tiles.length, cached, skipped };
  }

  /**
   * Download and cache Chicago tiles in background
   */
  async downloadChicagoTiles(options = {}) {
    const {
      zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17],
      maxConcurrent = 4,
      onProgress = null,
      onComplete = null,
    } = options;

    console.log('[OfflineTileStorage] Starting Chicago tile download...');

    const tiles = getChicagoTileCoords(zoomLevels);
    let completed = 0;
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`[OfflineTileStorage] ${tiles.length} tiles to download`);

    // Process tiles in batches
    for (let i = 0; i < tiles.length; i += maxConcurrent) {
      const batch = tiles.slice(i, i + maxConcurrent);
      let batchHadDownloads = false;

      await Promise.all(batch.map(async ({ x, y, z }) => {
        try {
          // Check if already cached
          const existing = await this.getTile(z, x, y);
          if (existing) {
            skipped++;
            completed++;
            if (onProgress) onProgress(completed, tiles.length, { cached, failed, skipped });
            return;
          }

          batchHadDownloads = true;

          // Download tile
          const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
          const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

          const response = await fetch(url, {
            cache: 'force-cache',
            priority: 'low',
          });

          if (!response.ok) {
            failed++;
            console.warn(`[OfflineTileStorage] Failed to download tile ${z}/${x}/${y}: ${response.status}`);
            return;
          }

          const blob = await response.blob();
          await this.saveTile(z, x, y, blob);
          cached++;
        } catch (err) {
          failed++;
          console.warn(`[OfflineTileStorage] Error downloading tile ${z}/${x}/${y}:`, err.message);
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, tiles.length, { cached, failed, skipped });
          }
        }
      }));

      // Log progress every 100 tiles (less frequent logging for cached tiles)
      if (completed % 100 === 0 || batchHadDownloads) {
        console.log(`[OfflineTileStorage] Progress: ${completed}/${tiles.length} (${Math.round(completed / tiles.length * 100)}%) - ${skipped} cached, ${cached} downloaded`);
      }

      // Only delay if we actually downloaded tiles (not all cached)
      if (batchHadDownloads) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const stats = {
      total: tiles.length,
      cached,
      failed,
      skipped,
      completed,
    };

    console.log('[OfflineTileStorage] Download complete:', stats);

    if (onComplete) {
      onComplete(stats);
    }

    return stats;
  }

  /**
   * Download and cache global map tiles (zoom 3-5 for world overview)
   */
  async downloadGlobalTiles(options = {}) {
    const {
      zoomLevels = [3, 4, 5],
      maxConcurrent = 4,
      onProgress = null,
      onComplete = null,
    } = options;

    console.log('[OfflineTileStorage] Starting global tile download...');

    const tiles = getGlobalTileCoords(zoomLevels);
    let completed = 0;
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`[OfflineTileStorage] ${tiles.length} global tiles to download`);

    // Process tiles in batches
    for (let i = 0; i < tiles.length; i += maxConcurrent) {
      const batch = tiles.slice(i, i + maxConcurrent);
      let batchHadDownloads = false;

      await Promise.all(batch.map(async ({ x, y, z }) => {
        try {
          // Check if already cached
          const existing = await this.getTile(z, x, y);
          if (existing) {
            skipped++;
            completed++;
            if (onProgress) onProgress(completed, tiles.length, { cached, failed, skipped });
            return;
          }

          batchHadDownloads = true;

          // Download tile
          const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
          const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

          const response = await fetch(url, {
            cache: 'force-cache',
            priority: 'low',
          });

          if (!response.ok) {
            failed++;
            console.warn(`[OfflineTileStorage] Failed to download global tile ${z}/${x}/${y}: ${response.status}`);
            return;
          }

          const blob = await response.blob();
          await this.saveTile(z, x, y, blob);
          cached++;
        } catch (err) {
          failed++;
          console.warn(`[OfflineTileStorage] Error downloading global tile ${z}/${x}/${y}:`, err.message);
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, tiles.length, { cached, failed, skipped });
          }
        }
      }));

      // Log progress every 100 tiles (less frequent logging for cached tiles)
      if (completed % 100 === 0 || batchHadDownloads) {
        console.log(`[OfflineTileStorage] Global progress: ${completed}/${tiles.length} (${Math.round(completed / tiles.length * 100)}%) - ${skipped} cached, ${cached} downloaded`);
      }

      // Only delay if we actually downloaded tiles (not all cached)
      if (batchHadDownloads) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const stats = {
      total: tiles.length,
      cached,
      failed,
      skipped,
      completed,
    };

    console.log('[OfflineTileStorage] Global download complete:', stats);

    if (onComplete) {
      onComplete(stats);
    }

    return stats;
  }

  /**
   * Download and cache major metro area tiles (strategic preloading)
   * Limited to zoom 10-12 for ~20 major cities globally (~50MB total)
   */
  async downloadMetroTiles(options = {}) {
    const {
      zoomLevels = [10, 11, 12], // Limited zoom for storage efficiency
      maxConcurrent = 3, // Lower concurrency to be respectful to tile server
      onProgress = null,
      onComplete = null,
    } = options;

    console.log('[OfflineTileStorage] Starting major metro tiles download...');
    console.log(`[OfflineTileStorage] Preloading ${MAJOR_METROS.length} cities: ${MAJOR_METROS.map(m => m.name).join(', ')}`);

    const tiles = getMetroTileCoords(zoomLevels);
    let completed = 0;
    let cached = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`[OfflineTileStorage] ${tiles.length} metro tiles to download across ${MAJOR_METROS.length} cities`);

    // Process tiles in batches
    for (let i = 0; i < tiles.length; i += maxConcurrent) {
      const batch = tiles.slice(i, i + maxConcurrent);
      let batchHadDownloads = false;

      await Promise.all(batch.map(async ({ x, y, z, metro }) => {
        try {
          // Check if already cached
          const existing = await this.getTile(z, x, y);
          if (existing) {
            skipped++;
            completed++;
            if (onProgress) onProgress(completed, tiles.length, { cached, failed, skipped });
            return;
          }

          batchHadDownloads = true;

          // Download tile
          const subdomain = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];
          const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

          const response = await fetch(url, {
            cache: 'force-cache',
            priority: 'low',
          });

          if (!response.ok) {
            failed++;
            console.warn(`[OfflineTileStorage] Failed to download metro tile ${z}/${x}/${y} (${metro}): ${response.status}`);
            return;
          }

          const blob = await response.blob();
          await this.saveTile(z, x, y, blob);
          cached++;
        } catch (err) {
          failed++;
          console.warn(`[OfflineTileStorage] Error downloading metro tile ${z}/${x}/${y}:`, err.message);
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, tiles.length, { cached, failed, skipped });
          }
        }
      }));

      // Log progress every 200 tiles
      if (completed % 200 === 0 || batchHadDownloads) {
        console.log(`[OfflineTileStorage] Metro progress: ${completed}/${tiles.length} (${Math.round(completed / tiles.length * 100)}%) - ${skipped} cached, ${cached} downloaded`);
      }

      // Longer delay to be respectful to tile server (75ms vs 50ms)
      if (batchHadDownloads) {
        await new Promise(resolve => setTimeout(resolve, 75));
      }
    }

    const stats = {
      total: tiles.length,
      cached,
      failed,
      skipped,
      completed,
      cities: MAJOR_METROS.length,
    };

    console.log('[OfflineTileStorage] Metro download complete:', stats);

    if (onComplete) {
      onComplete(stats);
    }

    return stats;
  }

  /**
   * Check if Chicago tiles download is complete
   * Returns { isComplete: boolean, stats: { total, cached, missing } }
   */
  async isChicagoDownloadComplete(zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17]) {
    const tiles = getChicagoTileCoords(zoomLevels);
    let cached = 0;

    // Sample check - check every 10th tile for performance
    const sampleSize = Math.min(100, Math.ceil(tiles.length / 10));
    const step = Math.floor(tiles.length / sampleSize);

    for (let i = 0; i < tiles.length; i += step) {
      const { x, y, z } = tiles[i];
      const existing = await this.getTile(z, x, y);
      if (existing) {
        cached++;
      }
    }

    const percentCached = (cached / sampleSize) * 100;
    const isComplete = percentCached >= 95; // Consider complete if 95%+ cached

    return {
      isComplete,
      stats: {
        total: tiles.length,
        sampleSize,
        cachedInSample: cached,
        percentCached: Math.round(percentCached),
      },
    };
  }

  /**
   * Check if global tiles download is complete
   */
  async isGlobalDownloadComplete(zoomLevels = [3, 4, 5]) {
    const tiles = getGlobalTileCoords(zoomLevels);
    let cached = 0;

    // Check all global tiles (there aren't many)
    for (const { x, y, z } of tiles) {
      const existing = await this.getTile(z, x, y);
      if (existing) {
        cached++;
      }
    }

    const percentCached = (cached / tiles.length) * 100;
    const isComplete = percentCached >= 95;

    return {
      isComplete,
      stats: {
        total: tiles.length,
        cached,
        percentCached: Math.round(percentCached),
      },
    };
  }

  /**
   * Check if metro tiles download is complete
   */
  async isMetroDownloadComplete(zoomLevels = [10, 11, 12]) {
    const tiles = getMetroTileCoords(zoomLevels);
    let cached = 0;

    // Sample check for performance (check every 20th tile)
    const sampleSize = Math.min(100, Math.ceil(tiles.length / 20));
    const step = Math.floor(tiles.length / sampleSize);

    for (let i = 0; i < tiles.length; i += step) {
      const { x, y, z } = tiles[i];
      const existing = await this.getTile(z, x, y);
      if (existing) {
        cached++;
      }
    }

    const percentCached = (cached / sampleSize) * 100;
    const isComplete = percentCached >= 95;

    return {
      isComplete,
      stats: {
        total: tiles.length,
        sampleSize,
        cachedInSample: cached,
        percentCached: Math.round(percentCached),
        cities: MAJOR_METROS.length,
      },
    };
  }
}

// Singleton instance
let instance = null;

export function getOfflineTileStorage() {
  if (!instance) {
    instance = new OfflineTileStorage();
  }
  return instance;
}

export { OfflineTileStorage };
