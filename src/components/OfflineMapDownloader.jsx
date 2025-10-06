/**
 * Offline Map Downloader Component
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
  const [storageStats, setStorageStats] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    // Load storage stats on mount
    loadStats();

    // Auto-start download if enabled and running in native app
    if (autoStart && isNative && !downloading) {
      // Start download after 5 second delay to let app initialize
      const timer = setTimeout(() => {
        startDownload();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [autoStart, isNative]);

  async function loadStats() {
    try {
      const storage = getOfflineTileStorage();
      const data = await storage.getStats();
      setStorageStats(data);
    } catch (err) {
      console.error('[OfflineMapDownloader] Failed to load stats:', err);
    }
  }

  async function startDownload() {
    if (downloading) return;

    setDownloading(true);
    setError(null);
    setProgress({ current: 0, total: 0, cached: 0, failed: 0, skipped: 0 });

    try {
      const storage = getOfflineTileStorage();

      const result = await storage.downloadChicagoTiles({
        zoomLevels: [10, 11, 12, 13],
        maxConcurrent: isNative ? 6 : 4, // More concurrent in native
        onProgress: (current, total, { cached, failed, skipped }) => {
          setProgress({ current, total, cached, failed, skipped });
        },
        onComplete: (finalStats) => {
          setStats(finalStats);
          setDownloading(false);
          loadStats(); // Refresh storage stats

          // Auto-hide after 10 seconds if download was successful
          if (autoStart && finalStats.cached > 0) {
            setTimeout(() => {
              setIsVisible(false);
            }, 10000);
          }
        },
      });

      console.log('[OfflineMapDownloader] Download complete:', result);
    } catch (err) {
      console.error('[OfflineMapDownloader] Download failed:', err);
      setError(err.message);
      setDownloading(false);
    }
  }

  async function clearCache() {
    if (!confirm('Clear all cached map tiles? This will require re-downloading them.')) {
      return;
    }

    try {
      const storage = getOfflineTileStorage();
      await storage.clearAll();
      setStorageStats(null);
      setStats(null);
      setProgress(null);
      await loadStats();
    } catch (err) {
      console.error('[OfflineMapDownloader] Failed to clear cache:', err);
      setError(err.message);
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
        bottom: 20,
        right: 20,
        background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 300,
        maxWidth: 400,
        zIndex: 9000,
        color: '#f4f6f8',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          📍 Offline Maps
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {storageStats && (
            <div style={{ fontSize: 12, color: '#a7b0b8' }}>
              {storageStats.storage}
            </div>
          )}
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '4px 8px',
              color: '#a7b0b8',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {downloading && progress && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span>Downloading Chicago tiles...</span>
            <span style={{ fontWeight: 600 }}>{progressPercent}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
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
          <div style={{ marginTop: 8, fontSize: 11, color: '#a7b0b8', display: 'flex', gap: 16 }}>
            <span>📥 Cached: {progress.cached}</span>
            <span>⏭️ Skipped: {progress.skipped}</span>
            <span>❌ Failed: {progress.failed}</span>
          </div>
        </div>
      )}

      {stats && !downloading && (
        <div
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 4 }}>
            ✅ Download Complete!
          </div>
          <div style={{ color: '#a7b0b8', fontSize: 12 }}>
            {stats.cached} new tiles cached, {stats.skipped} already cached
            {stats.failed > 0 && `, ${stats.failed} failed`}
          </div>
        </div>
      )}

      {storageStats && (
        <div style={{ fontSize: 13, color: '#a7b0b8', marginBottom: 12 }}>
          Cached tiles: {storageStats.tileCount !== 'N/A' ? storageStats.tileCount : 'Active'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={startDownload}
          disabled={downloading}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: downloading
              ? 'rgba(100,100,100,0.3)'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.5 : 1,
          }}
        >
          {downloading ? 'Downloading...' : 'Download Chicago'}
        </button>

        <button
          onClick={clearCache}
          disabled={downloading}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.1)',
            color: '#fca5a5',
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.5 : 1,
          }}
        >
          Clear
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
        Downloads ~2,000-5,000 map tiles for Chicago area (zoom 10-13) for offline use.
        {isNative && ' Stored in native filesystem for best performance.'}
      </div>
    </div>
  );
}
