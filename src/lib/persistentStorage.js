/**
 * Persistent Storage - survives app updates and reboots
 * Uses Capacitor Preferences on native platforms (persists across APK updates)
 * Falls back to localStorage on web
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Persistent storage that survives:
 * - App reboots
 * - APK updates
 * - Cache clears
 *
 * Data is stored in native SharedPreferences (Android) or UserDefaults (iOS)
 */
class PersistentStorage {
  constructor() {
    console.log(`[PersistentStorage] Using ${isNative ? 'Capacitor Preferences (native)' : 'localStorage (web)'} storage`);
  }

  /**
   * Set a value in persistent storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store (will be JSON stringified)
   */
  async set(key, value) {
    try {
      const serialized = JSON.stringify(value);

      if (isNative) {
        await Preferences.set({ key, value: serialized });
      } else {
        localStorage.setItem(key, serialized);
      }

      console.log(`[PersistentStorage] Saved ${key}`);
    } catch (err) {
      console.error(`[PersistentStorage] Error setting ${key}:`, err);
      throw err;
    }
  }

  /**
   * Get a value from persistent storage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Parsed value or null if not found
   */
  async get(key) {
    try {
      let serialized;

      if (isNative) {
        const result = await Preferences.get({ key });
        serialized = result.value;
      } else {
        serialized = localStorage.getItem(key);
      }

      if (serialized === null || serialized === undefined) {
        return null;
      }

      return JSON.parse(serialized);
    } catch (err) {
      console.error(`[PersistentStorage] Error getting ${key}:`, err);
      return null;
    }
  }

  /**
   * Remove a value from persistent storage
   * @param {string} key - Storage key
   */
  async remove(key) {
    try {
      if (isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }

      console.log(`[PersistentStorage] Removed ${key}`);
    } catch (err) {
      console.error(`[PersistentStorage] Error removing ${key}:`, err);
      throw err;
    }
  }

  /**
   * Clear all persistent storage (use with caution!)
   */
  async clear() {
    try {
      if (isNative) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }

      console.log('[PersistentStorage] Cleared all storage');
    } catch (err) {
      console.error('[PersistentStorage] Error clearing storage:', err);
      throw err;
    }
  }

  /**
   * Get all keys in persistent storage
   * @returns {Promise<string[]>} Array of keys
   */
  async keys() {
    try {
      if (isNative) {
        const result = await Preferences.keys();
        return result.keys || [];
      } else {
        return Object.keys(localStorage);
      }
    } catch (err) {
      console.error('[PersistentStorage] Error getting keys:', err);
      return [];
    }
  }

  /**
   * Migrate data from localStorage to Preferences (for native apps)
   * Call this once on app startup to migrate existing localStorage data
   */
  async migrateFromLocalStorage() {
    if (!isNative) {
      console.log('[PersistentStorage] Not on native platform, skipping migration');
      return;
    }

    try {
      console.log('[PersistentStorage] Starting migration from localStorage to Preferences...');

      // Get all localStorage keys
      const localStorageKeys = Object.keys(localStorage);
      let migratedCount = 0;

      for (const key of localStorageKeys) {
        try {
          const value = localStorage.getItem(key);

          // Check if already exists in Preferences
          const existing = await Preferences.get({ key });
          if (existing.value !== null && existing.value !== undefined) {
            console.log(`[PersistentStorage] Skipping ${key} (already in Preferences)`);
            continue;
          }

          // Migrate to Preferences
          await Preferences.set({ key, value });
          migratedCount++;
          console.log(`[PersistentStorage] Migrated ${key}`);
        } catch (err) {
          console.warn(`[PersistentStorage] Failed to migrate ${key}:`, err);
        }
      }

      console.log(`[PersistentStorage] Migration complete. Migrated ${migratedCount}/${localStorageKeys.length} items`);
    } catch (err) {
      console.error('[PersistentStorage] Migration failed:', err);
    }
  }
}

// Singleton instance
let instance = null;

export function getPersistentStorage() {
  if (!instance) {
    instance = new PersistentStorage();
  }
  return instance;
}

export { PersistentStorage };
