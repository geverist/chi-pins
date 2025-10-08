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

      // Save to filesystem
      await Filesystem.writeFile({
        path: `${path}/${fileName}`,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (err) {
      console.warn('[NativeTileStorage] Failed to save tile:', err);
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
      // File doesn't exist
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
    console.log(`[OfflineTileStorage] Using ${isNative ? 'Native Filesystem' : 'IndexedDB'} storage`);
  }

  async init() {
    if (this.storage.init) {
      await this.storage.init();
    }
  }

  async saveTile(z, x, y, blob) {
    return this.storage.saveTile(z, x, y, blob);
  }

  async getTile(z, x, y) {
    return this.storage.getTile(z, x, y);
  }

  async clearAll() {
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

      // Log progress every batch
      if (completed % 50 === 0) {
        console.log(`[OfflineTileStorage] Progress: ${completed}/${tiles.length} (${Math.round(completed / tiles.length * 100)}%)`);
      }

      // Small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
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

      // Log progress every batch
      if (completed % 50 === 0) {
        console.log(`[OfflineTileStorage] Global progress: ${completed}/${tiles.length} (${Math.round(completed / tiles.length * 100)}%)`);
      }

      // Small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
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
