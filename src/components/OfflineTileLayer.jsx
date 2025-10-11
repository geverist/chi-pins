/**
 * Offline-capable Leaflet TileLayer component
 * Uses 3-tier caching: Memory → Storage → Network
 *
 * Performance optimizations:
 * - In-memory LRU cache (500 tiles, ~7.5MB)
 * - No double-fetching (converts loaded image to blob)
 * - Tracked blob URLs with automatic cleanup
 * - Batch tile saving for Android performance
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getOfflineTileStorage } from '../lib/offlineTileStorage';
import { getTileCache } from '../lib/tileCache';
import { getBlobUrlManager } from '../lib/blobUrlManager';

/**
 * Convert loaded image element to blob without re-fetching from network
 * @param {HTMLImageElement} imgElement
 * @returns {Promise<Blob>}
 */
async function imageToBlob(imgElement) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0);

      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert image to blob'));
        }
      }, 'image/png', 0.95);
    } catch (err) {
      reject(err);
    }
  });
}

export default function OfflineTileLayer({
  attribution,
  maxZoom = 18,
  minZoom = 0,
  onTileLoad,
  onTileError,
  enableProgressiveCaching = false, // Enable in global mode
  ...otherProps
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    console.log('[OfflineTileLayer] Initializing with 3-tier caching (Memory → Storage → Network)');
    const storage = getOfflineTileStorage();
    const memoryCache = getTileCache();
    const blobUrlManager = getBlobUrlManager();

    // Log cache stats periodically in development
    if (process.env.NODE_ENV === 'development') {
      const statsInterval = setInterval(() => {
        const cacheStats = memoryCache.getStats();
        const blobStats = blobUrlManager.getStats();
        console.log('[OfflineTileLayer] Cache stats:', cacheStats, 'Blob URLs:', blobStats);
      }, 30000);

      // Cleanup interval on unmount
      setTimeout(() => clearInterval(statsInterval), 0);
    }

    // Custom tile layer with 3-tier caching
    const OfflineTileLayerClass = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement('img');
        const { x, y, z } = coords;

        // TIER 1: Check memory cache (instant - 0ms)
        const cachedBlob = memoryCache.get(z, x, y);
        if (cachedBlob) {
          const url = blobUrlManager.create(cachedBlob, 5000); // Auto-revoke after 5 seconds
          tile.src = url;

          tile.onload = () => {
            blobUrlManager.revoke(url); // Clean up immediately after load
            done(null, tile);
            if (onTileLoad) onTileLoad({ x, y, z, cached: true, source: 'memory' });
          };

          tile.onerror = () => {
            blobUrlManager.revoke(url);
            // Memory cache had corrupted data, fallback
            this.loadFromStorage(tile, coords, done);
          };

          return tile;
        }

        // TIER 2: Check persistent storage (5-20ms on mobile)
        this.loadFromStorage(tile, coords, done);
        return tile;
      },

      loadFromStorage: function (tile, coords, done) {
        const { x, y, z } = coords;

        storage.getTile(z, x, y).then(blob => {
          if (blob) {
            // Cache in memory for next time
            memoryCache.set(z, x, y, blob);

            const url = blobUrlManager.create(blob, 5000); // Auto-revoke after 5 seconds
            tile.src = url;

            tile.onload = () => {
              blobUrlManager.revoke(url);
              done(null, tile);
              if (onTileLoad) onTileLoad({ x, y, z, cached: true, source: 'storage' });
            };

            tile.onerror = () => {
              blobUrlManager.revoke(url);
              // Storage had corrupted data, fallback to network
              this.loadFromNetwork(tile, coords, done);
            };
          } else {
            // Not in storage, load from network
            this.loadFromNetwork(tile, coords, done);
          }
        }).catch(err => {
          console.warn('[OfflineTileLayer] Storage error, falling back to network:', err);
          this.loadFromNetwork(tile, coords, done);
        });
      },

      loadFromNetwork: function (tile, coords, done) {
        const { x, y, z } = coords;
        const subdomain = this.options.subdomains[Math.floor(Math.random() * this.options.subdomains.length)];
        const url = this.getTileUrl(coords).replace('{s}', subdomain);

        tile.src = url;

        tile.onload = () => {
          done(null, tile);
          if (onTileLoad) onTileLoad({ x, y, z, cached: false, source: 'network' });

          // Convert loaded image to blob WITHOUT re-fetching (MAJOR FIX)
          imageToBlob(tile)
            .then(blob => {
              // Cache in memory immediately
              memoryCache.set(z, x, y, blob);

              // Queue for batch save (performance optimization for Android)
              storage.queueTileSave(z, x, y, blob);
            })
            .catch(err => {
              console.warn('[OfflineTileLayer] Failed to convert tile to blob:', err);
            });
        };

        tile.onerror = (err) => {
          if (onTileError) onTileError({ x, y, z, error: err });
          done(err, tile);
        };
      }
    });

    // Create and add tile layer
    const tileLayer = new OfflineTileLayerClass(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom,
        minZoom,
        subdomains: ['a', 'b', 'c'],
        crossOrigin: true,
        ...otherProps
      }
    );

    tileLayer.addTo(map);

    // Progressive tile caching for global mode
    let downloadTimeout = null;
    const handleMoveEnd = () => {
      if (!enableProgressiveCaching) {
        console.log('[OfflineTileLayer] handleMoveEnd called but progressive caching is DISABLED');
        return;
      }

      console.log('[OfflineTileLayer] Map moved, scheduling tile download in 1 second...');
      // Debounce tile downloads to avoid excessive requests
      clearTimeout(downloadTimeout);
      downloadTimeout = setTimeout(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        console.log('[OfflineTileLayer] Starting progressive tile download - zoom:', zoom, 'bounds:', bounds);

        storage.downloadVisibleTiles(map, {
          maxConcurrent: 2,
          zoomBuffer: 1,
        }).then(() => {
          console.log('[OfflineTileLayer] Progressive tile download completed');
        }).catch(err => {
          console.error('[OfflineTileLayer] Error downloading visible tiles:', err);
        });
      }, 1000); // Wait 1 second after map stops moving
    };

    if (enableProgressiveCaching) {
      console.log('[OfflineTileLayer] Progressive caching ENABLED - attaching moveend listener');
      map.on('moveend', handleMoveEnd);
      // Initial download
      handleMoveEnd();
    } else {
      console.log('[OfflineTileLayer] Progressive caching DISABLED');
    }

    return () => {
      map.removeLayer(tileLayer);
      if (enableProgressiveCaching) {
        map.off('moveend', handleMoveEnd);
        clearTimeout(downloadTimeout);
      }
    };
  }, [map, attribution, maxZoom, minZoom, enableProgressiveCaching]);
  // Removed onTileLoad, onTileError, and otherProps from dependencies to prevent unnecessary re-renders

  return null;
}
