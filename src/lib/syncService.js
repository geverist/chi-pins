// src/lib/syncService.js
import { supabase } from './supabase';
import { getLocalDatabase } from './localDatabase';
import { perfMonitor } from './performanceMonitor';

const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes (default)

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
    this.syncIntervalMs = DEFAULT_SYNC_INTERVAL_MS;
  }

  /**
   * Start background sync with configurable interval
   */
  async start(syncIntervalMinutes = 30) {
    console.log('[SyncService] Starting background sync...');

    this.syncIntervalMs = syncIntervalMinutes * 60 * 1000;
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
    }, this.syncIntervalMs);

    console.log(`[SyncService] Sync scheduled every ${syncIntervalMinutes} minutes`);
  }

  /**
   * Update sync interval (restarts timer)
   */
  async updateInterval(syncIntervalMinutes) {
    console.log(`[SyncService] Updating sync interval to ${syncIntervalMinutes} minutes`);
    this.stop();
    await this.start(syncIntervalMinutes);
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
   * Sync all tables: Upload local changes and download remote updates
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
      learningSessions: 0,
      learningSessionsUploaded: 0,
      errors: [],
    };

    try {
      console.log('[SyncService] Starting bidirectional sync...');

      // PHASE 1: Upload local changes to Supabase (write-first)
      try {
        stats.learningSessionsUploaded = await this.uploadLearningSessions();
      } catch (error) {
        console.error('[SyncService] Failed to upload learning sessions:', error);
        stats.errors.push({ table: 'learning_sessions_upload', error: error.message });
      }

      // PHASE 2: Download remote data to local cache (read-only)

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

      // Sync proximity learning sessions (optional - for analytics/debugging)
      try {
        stats.learningSessions = await this.syncLearningSessions();
      } catch (error) {
        console.error('[SyncService] Failed to sync learning sessions:', error);
        stats.errors.push({ table: 'learning_sessions', error: error.message });
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
   * Upload local learning sessions to Supabase (LOCAL → CLOUD)
   * This is the key method for local-first architecture
   */
  async uploadLearningSessions() {
    console.log('[SyncService] Uploading local learning sessions to Supabase...');

    // Get all local sessions (we don't track sync status yet, so upload all recent)
    const sessions = await this.db.getLearningSessions(1000);

    if (!sessions || sessions.length === 0) {
      console.log('[SyncService] No local sessions to upload');
      return 0;
    }

    let uploadedCount = 0;
    let errorCount = 0;

    // Upload in batches of 50 to avoid overwhelming Supabase
    const batchSize = 50;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);

      try {
        // Use upsert to avoid duplicate key errors
        const { error } = await supabase
          .from('proximity_learning_sessions')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

        if (error) {
          console.error(`[SyncService] Failed to upload batch ${Math.floor(i / batchSize) + 1}:`, error);
          errorCount += batch.length;
        } else {
          uploadedCount += batch.length;
          console.log(`[SyncService] Uploaded batch ${Math.floor(i / batchSize) + 1} (${batch.length} sessions)`);
        }
      } catch (err) {
        console.error(`[SyncService] Error uploading batch:`, err);
        errorCount += batch.length;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[SyncService] Upload complete: ${uploadedCount} succeeded, ${errorCount} failed`);
    return uploadedCount;
  }

  /**
   * Sync proximity learning sessions from Supabase to SQLite (CLOUD → LOCAL, for analytics)
   */
  async syncLearningSessions() {
    console.log('[SyncService] Syncing learning sessions from Supabase...');

    // Only sync recent sessions (last 24 hours) to keep local DB small
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: sessions, error } = await supabase
      .from('proximity_learning_sessions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      await this.db.updateSyncMetadata('proximity_learning_sessions', error.message);
      throw error;
    }

    // Insert sessions
    for (const session of (sessions || [])) {
      await this.db.upsertLearningSession(session);
    }

    await this.db.updateSyncMetadata('proximity_learning_sessions');

    console.log(`[SyncService] Synced ${sessions?.length || 0} learning sessions from Supabase`);
    return sessions?.length || 0;
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
