/**
 * Blob URL manager to prevent memory leaks
 * Tracks all created blob URLs and ensures proper cleanup
 */

class BlobUrlManager {
  constructor() {
    this.urls = new Map(); // url -> { blob, createdAt, revokeTimer }
    this.autoRevokeDelay = 30000; // 30 seconds default
  }

  /**
   * Create a tracked blob URL with automatic cleanup
   * @param {Blob} blob
   * @param {number} autoRevokeMs - Auto-revoke after this many ms (0 = no auto-revoke)
   * @returns {string} Blob URL
   */
  create(blob, autoRevokeMs = 0) {
    const url = URL.createObjectURL(blob);

    const entry = {
      blob,
      createdAt: Date.now(),
      revokeTimer: null
    };

    // Auto-revoke after delay if specified
    if (autoRevokeMs > 0) {
      entry.revokeTimer = setTimeout(() => {
        this.revoke(url);
      }, autoRevokeMs);
    }

    this.urls.set(url, entry);
    return url;
  }

  /**
   * Revoke a blob URL and clean up tracking
   * @param {string} url
   */
  revoke(url) {
    if (this.urls.has(url)) {
      const entry = this.urls.get(url);

      // Clear auto-revoke timer if exists
      if (entry.revokeTimer) {
        clearTimeout(entry.revokeTimer);
      }

      URL.revokeObjectURL(url);
      this.urls.delete(url);

      return true;
    }
    return false;
  }

  /**
   * Revoke all tracked blob URLs
   */
  revokeAll() {
    for (const [url, entry] of this.urls.entries()) {
      if (entry.revokeTimer) {
        clearTimeout(entry.revokeTimer);
      }
      URL.revokeObjectURL(url);
    }
    this.urls.clear();
  }

  /**
   * Revoke old blob URLs (older than maxAge ms)
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {number} Number of URLs revoked
   */
  revokeOld(maxAge = 60000) { // 1 minute default
    const now = Date.now();
    const toRevoke = [];

    for (const [url, entry] of this.urls.entries()) {
      if (now - entry.createdAt > maxAge) {
        toRevoke.push(url);
      }
    }

    toRevoke.forEach(url => this.revoke(url));

    return toRevoke.length;
  }

  /**
   * Get statistics about tracked URLs
   */
  getStats() {
    return {
      trackedUrls: this.urls.size,
      oldestAge: this._getOldestAge(),
      memoryEstimate: `~${Math.round(this.urls.size * 15 / 1024)}KB`
    };
  }

  _getOldestAge() {
    if (this.urls.size === 0) return 0;

    const now = Date.now();
    let oldest = 0;

    for (const entry of this.urls.values()) {
      const age = now - entry.createdAt;
      if (age > oldest) oldest = age;
    }

    return Math.round(oldest / 1000); // Return in seconds
  }
}

// Singleton instance
let instance = null;

export function getBlobUrlManager() {
  if (!instance) {
    instance = new BlobUrlManager();

    // Auto-cleanup old URLs every 30 seconds
    setInterval(() => {
      const revoked = instance.revokeOld(60000); // Revoke URLs older than 1 minute
      if (revoked > 0) {
        console.log(`[BlobUrlManager] Auto-cleanup: revoked ${revoked} old blob URLs`);
      }
    }, 30000);
  }
  return instance;
}

export { BlobUrlManager };
