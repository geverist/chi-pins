// src/hooks/useLocalComments.js
// Local-first comments storage with Supabase background sync for high performance
// Uses geographic filtering to show only relevant local comments

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getPersistentStorage } from '../lib/persistentStorage';
import { filterComments, getRandomComments } from '../config/moderation';
import { CHI } from '../lib/mapUtils';

const COMMENTS_KEY = 'comments_cache_v2'; // Updated cache key for new format
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Chicago area bounds (roughly 50 mile radius)
const CHICAGO_BOUNDS = {
  minLat: 41.4,  // South
  maxLat: 42.3,  // North
  minLng: -88.5, // West
  maxLng: -87.0  // East
};

export function useLocalComments({
  maxComments = 20,
  customKeywords = [],
  enabled = true,
  bounds = CHICAGO_BOUNDS // Allow custom bounds for other locations
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // Load comments from Supabase with geographic filtering
  const syncComments = useCallback(async () => {
    if (!enabled) return;

    try {
      console.log('[useLocalComments] Syncing localized comments from Supabase...', bounds);

      // Try new pin_comments table first (with geographic filtering function)
      let commentsData = [];

      try {
        const { data: localComments, error: rpcError } = await supabase.rpc('get_comments_in_bounds', {
          min_lat: bounds.minLat,
          max_lat: bounds.maxLat,
          min_lng: bounds.minLng,
          max_lng: bounds.maxLng,
          max_results: 100
        });

        if (!rpcError && localComments) {
          console.log('[useLocalComments] Found', localComments.length, 'localized comments from pin_comments table');
          commentsData = localComments.map(c => ({
            id: c.id,
            note: c.comment_text,
            name: c.commenter_name,
            slug: c.pin_slug,
            neighborhood: null, // Not stored in comments table
            rating: c.rating
          }));
        }
      } catch (rpcErr) {
        console.warn('[useLocalComments] RPC function not available, falling back to pins table:', rpcErr);
      }

      // Fallback: Use pins table with geographic filtering
      if (commentsData.length === 0) {
        const { data: pins, error } = await supabase
          .from('pins')
          .select('id, note, name, neighborhood, slug, lat, lng')
          .not('note', 'is', null)
          .neq('note', '')
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('lng', bounds.minLng)
          .lte('lng', bounds.maxLng)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        console.log('[useLocalComments] Found', pins.length, 'localized comments from pins table');
        commentsData = pins;
      }

      // Filter and get random selection
      const filtered = filterComments(commentsData, customKeywords);
      const randomComments = getRandomComments(filtered, maxComments);

      // Save to local storage
      const storage = getPersistentStorage();
      await storage.set(COMMENTS_KEY, {
        comments: randomComments,
        timestamp: Date.now(),
        bounds // Store bounds for cache validation
      });

      setComments(randomComments);
      setLastSync(Date.now());
      console.log('[useLocalComments] Synced', randomComments.length, 'localized comments');
    } catch (err) {
      console.error('[useLocalComments] Sync error:', err);
    }
  }, [enabled, customKeywords, maxComments, bounds]);

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
