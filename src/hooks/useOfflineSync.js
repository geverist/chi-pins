// src/hooks/useOfflineSync.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  initDB,
  getPendingPins,
  removePendingPin,
  getSyncQueue,
  removeFromSyncQueue,
  cachePins,
  getCachedPins,
} from '../lib/offlineStorage';

/**
 * Hook to manage offline/online state and sync operations
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncIntervalRef = useRef(null);

  // Initialize IndexedDB
  useEffect(() => {
    initDB().catch(err => console.error('Failed to initialize IndexedDB:', err));
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingPins();
      const queue = await getSyncQueue();
      setPendingCount(pending.length + queue.length);
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('App is back online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('App is offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending pins when coming back online
  const syncPendingPins = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync - offline');
      return { success: false, synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const pendingPins = await getPendingPins();
      console.log(`Syncing ${pendingPins.length} pending pins...`);

      for (const pin of pendingPins) {
        try {
          // Remove the IndexedDB id before syncing
          const { id, synced: _, ...pinData } = pin;

          // Insert into Supabase
          const { error } = await supabase
            .from('pins')
            .insert(pinData);

          if (error) throw error;

          // Remove from pending queue
          await removePendingPin(id);
          synced++;
          console.log(`Synced pin: ${pin.slug}`);
        } catch (error) {
          console.error(`Failed to sync pin ${pin.slug}:`, error);
          failed++;
        }
      }

      console.log(`Sync complete: ${synced} synced, ${failed} failed`);
      await updatePendingCount();

      return { success: true, synced, failed };
    } catch (error) {
      console.error('Error syncing pending pins:', error);
      return { success: false, synced, failed };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, updatePendingCount]);

  // Sync queue items (other operations like updates, deletes)
  const syncQueue = useCallback(async () => {
    if (!isOnline) return { success: false, synced: 0, failed: 0 };

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const queueItems = await getSyncQueue();
      console.log(`Syncing ${queueItems.length} queue items...`);

      for (const item of queueItems) {
        try {
          // Execute the queued operation
          switch (item.type) {
            case 'update_pin':
              await supabase
                .from('pins')
                .update(item.data)
                .eq('slug', item.slug);
              break;

            case 'delete_pin':
              await supabase
                .from('pins')
                .delete()
                .eq('slug', item.slug);
              break;

            case 'add_comment':
              await supabase
                .from('comments')
                .insert(item.data);
              break;

            default:
              console.warn('Unknown sync operation type:', item.type);
          }

          await removeFromSyncQueue(item.id);
          synced++;
        } catch (error) {
          console.error(`Failed to sync queue item ${item.id}:`, error);
          failed++;
        }
      }

      console.log(`Queue sync complete: ${synced} synced, ${failed} failed`);
      await updatePendingCount();

      return { success: true, synced, failed };
    } catch (error) {
      console.error('Error syncing queue:', error);
      return { success: false, synced, failed };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, updatePendingCount]);

  // Full sync: pins + queue
  const syncAll = useCallback(async () => {
    if (!isOnline) {
      console.log('Cannot sync - offline');
      return { success: false };
    }

    console.log('Starting full sync...');
    const pinsResult = await syncPendingPins();
    const queueResult = await syncQueue();

    return {
      success: pinsResult.success && queueResult.success,
      pins: pinsResult,
      queue: queueResult,
    };
  }, [isOnline, syncPendingPins, syncQueue]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      console.log('Online - triggering auto-sync');
      syncAll();
    }
  }, [isOnline, isSyncing, syncAll]);

  // Periodic sync check (every 5 minutes when online)
  useEffect(() => {
    if (isOnline) {
      syncIntervalRef.current = setInterval(() => {
        updatePendingCount();
        // Optional: Auto-sync if there are pending items
        syncAll();
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, syncAll, updatePendingCount]);

  // Update pending count on mount and when online status changes
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncAll,
    syncPendingPins,
    syncQueue,
    updatePendingCount,
  };
}

/**
 * Hook to cache pins for offline use
 */
export function useOfflinePinCache(pins) {
  const cacheTimeoutRef = useRef(null);

  useEffect(() => {
    // Debounce caching to avoid too frequent writes
    if (cacheTimeoutRef.current) {
      clearTimeout(cacheTimeoutRef.current);
    }

    cacheTimeoutRef.current = setTimeout(() => {
      if (pins && pins.length > 0) {
        cachePins(pins).catch(err =>
          console.error('Failed to cache pins:', err)
        );
      }
    }, 1000);

    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [pins]);
}

/**
 * Hook to load cached pins when offline
 */
export function useOfflinePins() {
  const [cachedPins, setCachedPins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedPins()
      .then(pins => {
        setCachedPins(pins);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load cached pins:', err);
        setLoading(false);
      });
  }, []);

  return { cachedPins, loading };
}
