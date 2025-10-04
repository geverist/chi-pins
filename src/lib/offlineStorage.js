// src/lib/offlineStorage.js
// Offline storage manager using IndexedDB for robust offline support

const DB_NAME = 'ChiPinsOffline';
const DB_VERSION = 1;

// Store names
const STORES = {
  PINS: 'pins',
  PENDING_PINS: 'pending_pins',
  MEDIA: 'media',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
};

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Pins store (cached from Supabase)
      if (!db.objectStoreNames.contains(STORES.PINS)) {
        const pinsStore = db.createObjectStore(STORES.PINS, { keyPath: 'slug' });
        pinsStore.createIndex('created_at', 'created_at', { unique: false });
        pinsStore.createIndex('team', 'team', { unique: false });
      }

      // Pending pins store (created offline, waiting to sync)
      if (!db.objectStoreNames.contains(STORES.PENDING_PINS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_PINS, {
          keyPath: 'id',
          autoIncrement: true
        });
        pendingStore.createIndex('created_at', 'created_at', { unique: false });
        pendingStore.createIndex('slug', 'slug', { unique: false });
      }

      // Media store (photos, audio files)
      if (!db.objectStoreNames.contains(STORES.MEDIA)) {
        const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
        mediaStore.createIndex('type', 'type', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Sync queue (operations to perform when back online)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('type', 'type', { unique: false });
      }

      console.log('IndexedDB schema created');
    };
  });
}

/**
 * Generic store operations
 */
async function getStore(storeName, mode = 'readonly') {
  await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Save pins to local cache
 */
export async function cachePins(pins) {
  try {
    const store = await getStore(STORES.PINS, 'readwrite');

    // Clear existing pins
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add all pins
    for (const pin of pins) {
      await new Promise((resolve, reject) => {
        const request = store.put(pin);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log(`Cached ${pins.length} pins to IndexedDB`);
    return true;
  } catch (error) {
    console.error('Error caching pins:', error);
    return false;
  }
}

/**
 * Get cached pins
 */
export async function getCachedPins() {
  try {
    const store = await getStore(STORES.PINS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached pins:', error);
    return [];
  }
}

/**
 * Add a pending pin (created offline)
 */
export async function addPendingPin(pin) {
  try {
    const store = await getStore(STORES.PENDING_PINS, 'readwrite');

    const pendingPin = {
      ...pin,
      created_at: new Date().toISOString(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(pendingPin);
      request.onsuccess = () => {
        console.log('Added pending pin:', pendingPin.slug);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error adding pending pin:', error);
    throw error;
  }
}

/**
 * Get all pending pins
 */
export async function getPendingPins() {
  try {
    const store = await getStore(STORES.PENDING_PINS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting pending pins:', error);
    return [];
  }
}

/**
 * Remove a pending pin after successful sync
 */
export async function removePendingPin(id) {
  try {
    const store = await getStore(STORES.PENDING_PINS, 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('Removed pending pin:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing pending pin:', error);
  }
}

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(operation) {
  try {
    const store = await getStore(STORES.SYNC_QUEUE, 'readwrite');

    const queueItem = {
      ...operation,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => {
        console.log('Added to sync queue:', operation.type);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
}

/**
 * Get sync queue items
 */
export async function getSyncQueue() {
  try {
    const store = await getStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
}

/**
 * Remove from sync queue after successful sync
 */
export async function removeFromSyncQueue(id) {
  try {
    const store = await getStore(STORES.SYNC_QUEUE, 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

/**
 * Save media file locally
 */
export async function saveMedia(id, blob, type) {
  try {
    const store = await getStore(STORES.MEDIA, 'readwrite');

    const mediaItem = {
      id,
      blob,
      type,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(mediaItem);
      request.onsuccess = () => {
        console.log('Saved media:', id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving media:', error);
  }
}

/**
 * Get media file
 */
export async function getMedia(id) {
  try {
    const store = await getStore(STORES.MEDIA);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting media:', error);
    return null;
  }
}

/**
 * Save app setting
 */
export async function saveSetting(key, value) {
  try {
    const store = await getStore(STORES.SETTINGS, 'readwrite');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving setting:', error);
  }
}

/**
 * Get app setting
 */
export async function getSetting(key) {
  try {
    const store = await getStore(STORES.SETTINGS);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting setting:', error);
    return null;
  }
}

/**
 * Clear all offline data (useful for debugging)
 */
export async function clearOfflineData() {
  try {
    await initDB();

    const storeNames = Object.values(STORES);
    for (const storeName of storeNames) {
      const store = await getStore(storeName, 'readwrite');
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('Cleared all offline data');
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}

/**
 * Get storage usage info
 */
export async function getStorageInfo() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { usage: 0, quota: 0, percentage: 0 };
    }

    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}
