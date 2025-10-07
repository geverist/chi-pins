/**
 * Offline-capable Leaflet TileLayer component
 * Uses local storage first, falls back to network
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getOfflineTileStorage } from '../lib/offlineTileStorage';

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

    const storage = getOfflineTileStorage();

    // Custom tile layer that checks offline storage first
    const OfflineTileLayerClass = L.TileLayer.extend({
      createTile: function (coords, done) {
        const tile = document.createElement('img');
        const { x, y, z } = coords;

        // Try to load from offline storage first
        storage.getTile(z, x, y).then(blob => {
          if (blob) {
            // Use cached tile
            const url = URL.createObjectURL(blob);
            tile.src = url;

            // Clean up blob URL after tile loads
            tile.onload = () => {
              URL.revokeObjectURL(url);
              done(null, tile);
              if (onTileLoad) onTileLoad({ x, y, z, cached: true });
            };

            tile.onerror = () => {
              URL.revokeObjectURL(url);
              // Fallback to network
              this.loadFromNetwork(tile, coords, done);
            };
          } else {
            // Load from network and cache
            this.loadFromNetwork(tile, coords, done);
          }
        }).catch(err => {
          console.warn('[OfflineTileLayer] Storage error, falling back to network:', err);
          this.loadFromNetwork(tile, coords, done);
        });

        return tile;
      },

      loadFromNetwork: function (tile, coords, done) {
        const { x, y, z } = coords;
        const subdomain = this.options.subdomains[Math.floor(Math.random() * this.options.subdomains.length)];
        const url = this.getTileUrl(coords).replace('{s}', subdomain);

        tile.src = url;

        tile.onload = () => {
          done(null, tile);
          if (onTileLoad) onTileLoad({ x, y, z, cached: false });

          // Cache tile for offline use
          fetch(url)
            .then(response => response.blob())
            .then(blob => storage.saveTile(z, x, y, blob))
            .catch(err => console.warn('[OfflineTileLayer] Failed to cache tile:', err));
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
      if (!enableProgressiveCaching) return;

      // Debounce tile downloads to avoid excessive requests
      clearTimeout(downloadTimeout);
      downloadTimeout = setTimeout(() => {
        storage.downloadVisibleTiles(map, {
          maxConcurrent: 2,
          zoomBuffer: 1,
        }).catch(err => {
          console.warn('[OfflineTileLayer] Error downloading visible tiles:', err);
        });
      }, 1000); // Wait 1 second after map stops moving
    };

    if (enableProgressiveCaching) {
      map.on('moveend', handleMoveEnd);
      // Initial download
      handleMoveEnd();
    }

    return () => {
      map.removeLayer(tileLayer);
      if (enableProgressiveCaching) {
        map.off('moveend', handleMoveEnd);
        clearTimeout(downloadTimeout);
      }
    };
  }, [map, attribution, maxZoom, minZoom, onTileLoad, onTileError, enableProgressiveCaching, otherProps]);

  return null;
}
