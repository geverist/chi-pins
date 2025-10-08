// src/lib/syncService.js
import { supabase } from './supabase';
import { getLocalDatabase } from './localDatabase';
import { perfMonitor } from './performanceMonitor';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Background sync service
 * Periodically syncs Supabase data to local SQLite cache
 */
class SyncService {
  constructor() {
    this.db = null;
    this.syncTimer = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncCallbacks = [];
  }

  /**
   * Start background sync
   */
  async start() {
    console.log('[SyncService] Starting background sync...');

    this.db = await getLocalDatabase();

    if (!this.db.isAvailable()) {
      console.log('[SyncService] Local database not available, skipping sync');
      return;
    }

    // Initial sync
    await this.syncAll();

    // Schedule periodic sync
    this.syncTimer = setInterval(() => {
      this.syncAll();
    }, SYNC_INTERVAL_MS);

    console.log(`[SyncService] Sync scheduled every ${SYNC_INTERVAL_MS / 1000}s`);
  }

  /**
   * Stop background sync
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    console.log('[SyncService] Sync stopped');
  }

  /**
   * Register callback for sync completion
   */
  onSync(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Notify listeners that sync completed
   */
  notifySync(stats) {
    this.syncCallbacks.forEach(cb => cb(stats));
  }

  /**
   * Sync all tables from Supabase to SQLite
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const stats = {
      pins: 0,
      trivia: 0,
      jukebox: 0,
      settings: 0,
      errors: [],
    };

    try {
      console.log('[SyncService] Starting sync...');

      // Sync pins
      try {
        stats.pins = await this.syncPins();
      } catch (error) {
        console.error('[SyncService] Failed to sync pins:', error);
        stats.errors.push({ table: 'pins', error: error.message });
      }

      // Sync trivia questions
      try {
        stats.trivia = await this.syncTriviaQuestions();
      } catch (error) {
        console.error('[SyncService] Failed to sync trivia:', error);
        stats.errors.push({ table: 'trivia', error: error.message });
      }

      // Sync jukebox songs
      try {
        stats.jukebox = await this.syncJukeboxSongs();
      } catch (error) {
        console.error('[SyncService] Failed to sync jukebox:', error);
        stats.errors.push({ table: 'jukebox', error: error.message });
      }

      // Sync navigation settings
      try {
        stats.settings = await this.syncNavigationSettings();
      } catch (error) {
        console.error('[SyncService] Failed to sync settings:', error);
        stats.errors.push({ table: 'settings', error: error.message });
      }

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      console.log(`[SyncService] Sync completed in ${duration}ms:`, stats);

      // Notify listeners
      this.notifySync({ ...stats, duration, timestamp: this.lastSyncTime });

    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      stats.errors.push({ table: 'general', error: error.message });
    } finally {
      this.isSyncing = false;
    }

    return stats;
  }

  /**
   * Sync pins from Supabase to SQLite
   */
  async syncPins() {
    const startTime = performance.now();
    console.log('[SyncService] Syncing pins...');

    // Get pins from Supabase (last 1000 pins)
    const { data: pins, error } = await supabase
      .from('pins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      await this.db.updateSyncMetadata('pins', error.message);
      throw error;
    }

    // Bulk insert into SQLite
    const dbStartTime = performance.now();
    await this.db.bulkUpsertPins(pins || []);
    perfMonitor.trackDatabaseOp('bulkUpsertPins', dbStartTime, 'pins');

    await this.db.updateSyncMetadata('pins');

    perfMonitor.trackSync('syncPins', startTime, pins?.length || 0);
    console.log(`[SyncService] Synced ${pins?.length || 0} pins`);
    return pins?.length || 0;
  }

  /**
   * Sync trivia questions from Supabase to SQLite
   */
  async syncTriviaQuestions() {
    console.log('[SyncService] Syncing trivia questions...');

    const { data: questions, error } = await supabase
      .from('trivia_questions')
      .select('*')
      .limit(500);

    if (error) {
      await this.db.updateSyncMetadata('trivia_questions', error.message);
      throw error;
    }

    // Insert questions
    for (const question of (questions || [])) {
      await this.db.upsertTriviaQuestion(question);
    }

    await this.db.updateSyncMetadata('trivia_questions');

    console.log(`[SyncService] Synced ${questions?.length || 0} trivia questions`);
    return questions?.length || 0;
  }

  /**
   * Sync jukebox songs from Supabase to SQLite
   */
  async syncJukeboxSongs() {
    console.log('[SyncService] Syncing jukebox songs...');

    const { data: songs, error } = await supabase
      .from('jukebox_songs')
      .select('*')
      .limit(1000);

    if (error) {
      await this.db.updateSyncMetadata('jukebox_songs', error.message);
      throw error;
    }

    // Insert songs
    for (const song of (songs || [])) {
      await this.db.upsertJukeboxSong(song);
    }

    await this.db.updateSyncMetadata('jukebox_songs');

    console.log(`[SyncService] Synced ${songs?.length || 0} jukebox songs`);
    return songs?.length || 0;
  }

  /**
   * Sync navigation settings from Supabase to SQLite
   */
  async syncNavigationSettings() {
    console.log('[SyncService] Syncing navigation settings...');

    const { data: settings, error } = await supabase
      .from('nav_settings')
      .select('*')
      .limit(100);

    if (error) {
      await this.db.updateSyncMetadata('nav_settings', error.message);
      throw error;
    }

    // Insert settings
    for (const setting of (settings || [])) {
      await this.db.saveNavSetting(setting.key, setting.value);
    }

    await this.db.updateSyncMetadata('nav_settings');

    console.log(`[SyncService] Synced ${settings?.length || 0} settings`);
    return settings?.length || 0;
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    console.log('[SyncService] Force sync requested');
    return await this.syncAll();
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    if (!this.db.isAvailable()) {
      return null;
    }

    const metadata = await this.db.getSyncMetadata();

    return {
      lastSync: this.lastSyncTime,
      isSyncing: this.isSyncing,
      tables: metadata,
    };
  }
}

// Singleton instance
let syncInstance = null;

export function getSyncService() {
  if (!syncInstance) {
    syncInstance = new SyncService();
  }
  return syncInstance;
}

export default SyncService;
