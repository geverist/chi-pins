/**
 * Performance Diagnostics for Kiosk
 * Provides real-time monitoring of cache performance and memory usage
 *
 * Usage in console:
 *   window.performanceDiagnostics.getReport()
 *   window.performanceDiagnostics.startMonitoring()
 *   window.performanceDiagnostics.stopMonitoring()
 */

import { getTileCache } from './tileCache'
import { getBlobUrlManager } from './blobUrlManager'
import { getOfflineTileStorage } from './offlineTileStorage'

class PerformanceDiagnostics {
  constructor() {
    this.monitoringInterval = null
    this.startTime = Date.now()
  }

  /**
   * Get comprehensive performance report
   */
  getReport() {
    const tileCache = getTileCache()
    const blobManager = getBlobUrlManager()
    const storage = getOfflineTileStorage()

    // Device info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      connection: this._getConnectionInfo(),
    }

    // Memory info (if available)
    const memoryInfo = this._getMemoryInfo()

    // Cache stats
    const cacheStats = tileCache.getStats()
    const blobStats = blobManager.getStats()

    // Storage stats
    const storageInfo = this._getStorageInfo()

    // Performance timing
    const timing = this._getPerformanceTiming()

    const report = {
      timestamp: new Date().toISOString(),
      uptime: this._formatUptime(Date.now() - this.startTime),
      device: deviceInfo,
      memory: memoryInfo,
      cache: {
        tiles: cacheStats,
        blobs: blobStats,
      },
      storage: storageInfo,
      performance: timing,
      recommendations: this._generateRecommendations(cacheStats, memoryInfo),
    }

    console.log('========== PERFORMANCE DIAGNOSTICS ==========')
    console.log('Device:', report.device)
    console.log('Memory:', report.memory)
    console.log('Tile Cache:', report.cache.tiles)
    console.log('Blob Manager:', report.cache.blobs)
    console.log('Storage:', report.storage)
    console.log('Performance:', report.performance)
    console.log('Recommendations:', report.recommendations)
    console.log('===========================================')

    return report
  }

  /**
   * Start continuous monitoring (logs every 30 seconds)
   */
  startMonitoring(intervalMs = 30000) {
    if (this.monitoringInterval) {
      console.warn('[PerformanceDiagnostics] Monitoring already running')
      return
    }

    console.log(`[PerformanceDiagnostics] Starting monitoring (interval: ${intervalMs}ms)`)

    this.monitoringInterval = setInterval(() => {
      this.getReport()
    }, intervalMs)

    // Initial report
    this.getReport()
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      console.log('[PerformanceDiagnostics] Monitoring stopped')
    }
  }

  /**
   * Get memory info (Chrome only)
   */
  _getMemoryInfo() {
    if (!performance.memory) {
      return { available: false }
    }

    const mem = performance.memory
    return {
      available: true,
      usedJSHeapSize: this._formatBytes(mem.usedJSHeapSize),
      totalJSHeapSize: this._formatBytes(mem.totalJSHeapSize),
      jsHeapSizeLimit: this._formatBytes(mem.jsHeapSizeLimit),
      usagePercent: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1) + '%',
    }
  }

  /**
   * Get connection info
   */
  _getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!conn) return { available: false }

    return {
      available: true,
      effectiveType: conn.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: conn.downlink ? `${conn.downlink}Mbps` : 'Unknown',
      rtt: conn.rtt ? `${conn.rtt}ms` : 'Unknown',
      saveData: conn.saveData || false,
    }
  }

  /**
   * Get storage info
   */
  async _getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { available: false }
    }

    try {
      const estimate = await navigator.storage.estimate()
      return {
        available: true,
        usage: this._formatBytes(estimate.usage),
        quota: this._formatBytes(estimate.quota),
        usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%',
      }
    } catch (err) {
      return { available: false, error: err.message }
    }
  }

  /**
   * Get performance timing
   */
  _getPerformanceTiming() {
    if (!performance.timing) return { available: false }

    const t = performance.timing
    return {
      available: true,
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      loadComplete: t.loadEventEnd - t.navigationStart,
      domReady: t.domComplete - t.navigationStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 'Unknown',
    }
  }

  /**
   * Generate recommendations based on stats
   */
  _generateRecommendations(cacheStats, memoryInfo) {
    const recommendations = []

    // Cache hit rate
    const hitRate = parseFloat(cacheStats.hitRate)
    if (hitRate < 80) {
      recommendations.push({
        type: 'warning',
        message: `Cache hit rate is ${hitRate}% (target: >80%). Consider increasing cache size.`,
      })
    } else if (hitRate > 95) {
      recommendations.push({
        type: 'success',
        message: `Excellent cache hit rate: ${hitRate}%!`,
      })
    }

    // Memory usage
    if (memoryInfo.available) {
      const usage = parseFloat(memoryInfo.usagePercent)
      if (usage > 80) {
        recommendations.push({
          type: 'critical',
          message: `High memory usage: ${usage}%. Reduce cache size or restart app.`,
        })
      } else if (usage < 50) {
        recommendations.push({
          type: 'info',
          message: `Low memory usage: ${usage}%. You can increase cache size for better performance.`,
        })
      }
    }

    // Cache size
    const cacheSize = parseInt(cacheStats.size)
    const maxSize = parseInt(cacheStats.maxSize)
    if (cacheSize === maxSize) {
      recommendations.push({
        type: 'info',
        message: 'Cache is full. This is normal during active use.',
      })
    }

    return recommendations
  }

  /**
   * Format bytes to human-readable
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Format uptime
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Create singleton instance
const diagnostics = new PerformanceDiagnostics()

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.performanceDiagnostics = diagnostics
}

export default diagnostics
