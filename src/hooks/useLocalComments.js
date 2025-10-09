// src/hooks/useLocalComments.js
// Local-first comments storage with Supabase background sync for high performance

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getPersistentStorage } from '../lib/persistentStorage';
import { filterComments, getRandomComments } from '../config/moderation';

const COMMENTS_KEY = 'comments_cache_v1';
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useLocalComments({
  maxComments = 20,
  customKeywords = [],
  enabled = true
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // Load comments from Supabase and cache locally
  const syncComments = useCallback(async () => {
    if (!enabled) return;

    try {
      console.log('[useLocalComments] Syncing comments from Supabase...');

      const { data: pins, error } = await supabase
        .from('pins')
        .select('id, note, name, neighborhood, slug')
        .not('note', 'is', null)
        .neq('note', '')
        .order('created_at', { ascending: false })
        .limit(100); // Get more than needed for variety

      if (error) throw error;

      // Filter and get random selection
      const filtered = filterComments(pins, customKeywords);
      const randomComments = getRandomComments(filtered, maxComments);

      // Save to local storage
      const storage = getPersistentStorage();
      await storage.set(COMMENTS_KEY, {
        comments: randomComments,
        timestamp: Date.now()
      });

      setComments(randomComments);
      setLastSync(Date.now());
      console.log('[useLocalComments] Synced', randomComments.length, 'comments');
    } catch (err) {
      console.error('[useLocalComments] Sync error:', err);
    }
  }, [enabled, customKeywords, maxComments]);

  // Initial load from local storage, then sync
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadComments = async () => {
      const storage = getPersistentStorage();

      try {
        // 1. Try local storage first (instant)
        const cached = await storage.get(COMMENTS_KEY);

        if (cached?.comments && mounted) {
          console.log('[useLocalComments] Loaded from cache:', cached.comments.length);
          setComments(cached.comments);
          setLastSync(cached.timestamp);
        }
      } catch (err) {
        console.error('[useLocalComments] Load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }

      // 2. Sync from Supabase in background
      if (mounted) {
        syncComments();
      }
    };

    loadComments();

    // Background sync interval
    const syncInterval = setInterval(syncComments, SYNC_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(syncInterval);
    };
  }, [enabled, syncComments]);

  // Refresh function (shuffles existing comments without network)
  const refresh = useCallback(() => {
    if (comments.length > 0) {
      const shuffled = [...comments].sort(() => Math.random() - 0.5);
      setComments(shuffled);
    }
  }, [comments]);

  return {
    comments,
    loading,
    lastSync,
    refresh,
    syncComments
  };
}
