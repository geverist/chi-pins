/**
 * Offline Map Downloader Component - Bottom Bar
 * Shows progress and manages downloading Chicago map tiles for offline use
 */

import { useState, useEffect } from 'react';
import { getOfflineTileStorage } from '../lib/offlineTileStorage';
import { Capacitor } from '@capacitor/core';

export default function OfflineMapDownloader({ autoStart = false }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Auto-start download if enabled and running in native app
    if (autoStart && isNative && !downloading) {
      // Start download after 5 second delay to let app initialize
      const timer = setTimeout(() => {
        startDownload();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [autoStart, isNative]);

  async function startDownload() {
    if (downloading) return;

    setDownloading(true);
    setError(null);
    setProgress({ current: 0, total: 0, cached: 0, failed: 0, skipped: 0 });

    try {
      const storage = getOfflineTileStorage();

      await storage.downloadChicagoTiles({
        zoomLevels: [10, 11, 12, 13],
        maxConcurrent: isNative ? 6 : 4,
        onProgress: (current, total, { cached, failed, skipped }) => {
          setProgress({ current, total, cached, failed, skipped });
        },
        onComplete: (finalStats) => {
          setStats(finalStats);
          setDownloading(false);

          // Auto-hide after 10 seconds if download was successful
          if (autoStart && finalStats.cached > 0) {
            setTimeout(() => {
              setIsVisible(false);
            }, 10000);
          }
        },
      });
    } catch (err) {
      console.error('[OfflineMapDownloader] Download failed:', err);
      setError(err.message);
      setDownloading(false);
    }
  }

  // Don't show UI in browser mode with auto-start (runs silently in background)
  if (autoStart && !isNative) {
    return null;
  }

  // Hide if user closed it
  if (!isVisible) {
    return null;
  }

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
        padding: '10px 20px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 9000,
        color: '#f4f6f8',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>

        {/* Left side - Icon and status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <span style={{ fontSize: 20 }}>📍</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
              {downloading ? `Downloading tiles (${progressPercent}%)` : stats ? '✅ Map tiles cached' : 'Offline Maps'}
            </div>
            {progress && downloading && (
              <div style={{ fontSize: 10, color: '#a7b0b8', marginTop: 2 }}>
                {progress.current} of {progress.total} • {progress.cached} cached, {progress.skipped} skipped
              </div>
            )}
            {stats && !downloading && (
              <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>
                {stats.total} tiles ready for offline use
              </div>
            )}
          </div>
        </div>

        {/* Center - Progress bar (when downloading) */}
        {downloading && progress && (
          <div style={{ flex: '1 1 300px', minWidth: 200, maxWidth: 500 }}>
            <div
              style={{
                width: '100%',
                height: 6,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Right side - Close button */}
        <div style={{ flex: '0 0 auto' }}>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '6px 12px',
              color: '#a7b0b8',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              fontWeight: 600,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

      </div>
    </div>
  );
}
