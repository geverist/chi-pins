// src/lib/localDatabase.js
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'engageos.db';
const DB_VERSION = 1;

/**
 * Local SQLite database for offline-first caching
 * Syncs with Supabase every 5 minutes or on app start
 */
class LocalDatabase {
  constructor() {
    this.db = null;
    this.sqlite = null;
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    if (!this.isNative) {
      console.log('[LocalDB] Not on native platform, using Supabase only');
      return;
    }

    try {
      console.log('[LocalDB] Initializing SQLite database...');

      this.sqlite = new SQLiteConnection(CapacitorSQLite);

      // Create connection
      this.db = await this.sqlite.createConnection(
        DB_NAME,
        false, // encrypted
        'no-encryption',
        DB_VERSION,
        false // readonly
      );

      // Open database
      await this.db.open();

      // Create tables
      await this.createTables();

      console.log('[LocalDB] Database initialized successfully');
    } catch (error) {
      console.error('[LocalDB] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create database schema
   */
  async createTables() {
    const statements = [
      // Pins table
      `CREATE TABLE IF NOT EXISTS pins (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        team TEXT,
        name TEXT,
        neighborhood TEXT,
        hotdog TEXT,
        note TEXT,
        photo TEXT,
        continent TEXT,
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Trivia questions table
      `CREATE TABLE IF NOT EXISTS trivia_questions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        incorrect_answers TEXT NOT NULL,
        category TEXT,
        difficulty TEXT,
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Jukebox songs table
      `CREATE TABLE IF NOT EXISTS jukebox_songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        album TEXT,
        duration INTEGER,
        url TEXT,
        cover_art TEXT,
        genre TEXT,
        created_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Navigation settings table
      `CREATE TABLE IF NOT EXISTS nav_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Admin settings table
      `CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Sync metadata table
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_sync TEXT,
        sync_count INTEGER DEFAULT 0,
        last_error TEXT
      )`,

      // Indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_pins_created ON pins(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_pins_location ON pins(lat, lng)`,
      `CREATE INDEX IF NOT EXISTS idx_pins_continent ON pins(continent)`,
      `CREATE INDEX IF NOT EXISTS idx_trivia_category ON trivia_questions(category)`,
      `CREATE INDEX IF NOT EXISTS idx_songs_artist ON jukebox_songs(artist)`,
    ];

    for (const statement of statements) {
      await this.db.execute(statement);
    }

    console.log('[LocalDB] Tables created successfully');
  }

  /**
   * Check if database is initialized and available
   */
  isAvailable() {
    return this.isNative && this.db !== null;
  }

  /* ==================== PINS ==================== */

  /**
   * Get all pins from local cache
   */
  async getPins() {
    if (!this.isAvailable()) return [];

    try {
      const result = await this.db.query('SELECT * FROM pins ORDER BY created_at DESC');
      return result.values || [];
    } catch (error) {
      console.error('[LocalDB] Failed to get pins:', error);
      return [];
    }
  }

  /**
   * Get pins by continent
   */
  async getPinsByContinent(continent) {
    if (!this.isAvailable()) return [];

    try {
      const result = await this.db.query(
        'SELECT * FROM pins WHERE continent = ? ORDER BY created_at DESC',
        [continent]
      );
      return result.values || [];
    } catch (error) {
      console.error('[LocalDB] Failed to get pins by continent:', error);
      return [];
    }
  }

  /**
   * Insert or update pin
   */
  async upsertPin(pin) {
    if (!this.isAvailable()) return;

    try {
      const sql = `
        INSERT OR REPLACE INTO pins (
          id, user_id, lat, lng, team, name, neighborhood,
          hotdog, note, photo, continent, created_at, updated_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.db.run(sql, [
        pin.id,
        pin.user_id,
        pin.lat,
        pin.lng,
        pin.team,
        pin.name,
        pin.neighborhood,
        pin.hotdog,
        pin.note,
        pin.photo,
        pin.continent,
        pin.created_at,
        pin.updated_at,
      ]);
    } catch (error) {
      console.error('[LocalDB] Failed to upsert pin:', error);
    }
  }

  /**
   * Bulk insert/update pins
   */
  async bulkUpsertPins(pins) {
    if (!this.isAvailable() || !pins.length) return;

    try {
      for (const pin of pins) {
        await this.upsertPin(pin);
      }
      console.log(`[LocalDB] Synced ${pins.length} pins`);
    } catch (error) {
      console.error('[LocalDB] Failed to bulk upsert pins:', error);
    }
  }

  /* ==================== TRIVIA ==================== */

  /**
   * Get trivia questions
   */
  async getTriviaQuestions(limit = 10) {
    if (!this.isAvailable()) return [];

    try {
      const result = await this.db.query(
        'SELECT * FROM trivia_questions ORDER BY RANDOM() LIMIT ?',
        [limit]
      );

      // Parse JSON arrays
      return (result.values || []).map(q => ({
        ...q,
        incorrect_answers: JSON.parse(q.incorrect_answers || '[]')
      }));
    } catch (error) {
      console.error('[LocalDB] Failed to get trivia questions:', error);
      return [];
    }
  }

  /**
   * Insert or update trivia question
   */
  async upsertTriviaQuestion(question) {
    if (!this.isAvailable()) return;

    try {
      const sql = `
        INSERT OR REPLACE INTO trivia_questions (
          id, question, correct_answer, incorrect_answers,
          category, difficulty, created_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.db.run(sql, [
        question.id,
        question.question,
        question.correct_answer,
        JSON.stringify(question.incorrect_answers || []),
        question.category,
        question.difficulty,
        question.created_at,
      ]);
    } catch (error) {
      console.error('[LocalDB] Failed to upsert trivia question:', error);
    }
  }

  /* ==================== JUKEBOX ==================== */

  /**
   * Get jukebox songs
   */
  async getJukeboxSongs() {
    if (!this.isAvailable()) return [];

    try {
      const result = await this.db.query('SELECT * FROM jukebox_songs ORDER BY artist, title');
      return result.values || [];
    } catch (error) {
      console.error('[LocalDB] Failed to get jukebox songs:', error);
      return [];
    }
  }

  /**
   * Insert or update jukebox song
   */
  async upsertJukeboxSong(song) {
    if (!this.isAvailable()) return;

    try {
      const sql = `
        INSERT OR REPLACE INTO jukebox_songs (
          id, title, artist, album, duration, url,
          cover_art, genre, created_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.db.run(sql, [
        song.id,
        song.title,
        song.artist,
        song.album,
        song.duration,
        song.url,
        song.cover_art,
        song.genre,
        song.created_at,
      ]);
    } catch (error) {
      console.error('[LocalDB] Failed to upsert jukebox song:', error);
    }
  }

  /* ==================== SETTINGS ==================== */

  /**
   * Get navigation settings
   */
  async getNavSettings() {
    if (!this.isAvailable()) return null;

    try {
      const result = await this.db.query('SELECT * FROM nav_settings');
      const settings = {};

      (result.values || []).forEach(row => {
        settings[row.key] = JSON.parse(row.value || 'null');
      });

      return settings;
    } catch (error) {
      console.error('[LocalDB] Failed to get nav settings:', error);
      return null;
    }
  }

  /**
   * Save navigation setting
   */
  async saveNavSetting(key, value) {
    if (!this.isAvailable()) return;

    try {
      const sql = `
        INSERT OR REPLACE INTO nav_settings (id, key, value, updated_at, synced_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      await this.db.run(sql, [key, key, JSON.stringify(value)]);
    } catch (error) {
      console.error('[LocalDB] Failed to save nav setting:', error);
    }
  }

  /* ==================== SYNC METADATA ==================== */

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(tableName, error = null) {
    if (!this.isAvailable()) return;

    try {
      const sql = `
        INSERT OR REPLACE INTO sync_metadata (table_name, last_sync, sync_count, last_error)
        VALUES (
          ?,
          CURRENT_TIMESTAMP,
          COALESCE((SELECT sync_count FROM sync_metadata WHERE table_name = ?), 0) + 1,
          ?
        )
      `;

      await this.db.run(sql, [tableName, tableName, error]);
    } catch (err) {
      console.error('[LocalDB] Failed to update sync metadata:', err);
    }
  }

  /**
   * Get sync metadata for all tables
   */
  async getSyncMetadata() {
    if (!this.isAvailable()) return [];

    try {
      const result = await this.db.query('SELECT * FROM sync_metadata');
      return result.values || [];
    } catch (error) {
      console.error('[LocalDB] Failed to get sync metadata:', error);
      return [];
    }
  }

  /**
   * Clear all data (for debugging)
   */
  async clearAll() {
    if (!this.isAvailable()) return;

    try {
      await this.db.execute('DELETE FROM pins');
      await this.db.execute('DELETE FROM trivia_questions');
      await this.db.execute('DELETE FROM jukebox_songs');
      await this.db.execute('DELETE FROM nav_settings');
      await this.db.execute('DELETE FROM admin_settings');
      await this.db.execute('DELETE FROM sync_metadata');

      console.log('[LocalDB] All data cleared');
    } catch (error) {
      console.error('[LocalDB] Failed to clear data:', error);
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let dbInstance = null;

export async function getLocalDatabase() {
  if (!dbInstance) {
    dbInstance = new LocalDatabase();
    await dbInstance.init();
  }
  return dbInstance;
}

export default LocalDatabase;
