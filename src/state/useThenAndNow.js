// src/state/useThenAndNow.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPersistentStorage } from '../lib/persistentStorage';

const CACHE_KEY = 'then_and_now_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useThenAndNow() {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storage = getPersistentStorage();

    // Load from persistent cache first
    const loadCache = async () => {
      try {
        const cached = await storage.get(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = cached;
          if (Date.now() - timestamp < CACHE_DURATION) {
            setComparisons(data);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[useThenAndNow] Error loading cache:', err);
      }
    };

    loadCache();

    // Fetch from database
    const fetchComparisons = async () => {
      try {
        console.log('[useThenAndNow] Fetching then_and_now records');
        const { data, error } = await supabase
          .from('then_and_now')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;

        console.log('[useThenAndNow] Fetched', data?.length, 'comparisons');
        setComparisons(data || []);
        setError(null);

        // Update persistent cache
        await storage.set(CACHE_KEY, {
          data: data || [],
          timestamp: Date.now()
        });

        setLoading(false);
      } catch (err) {
        console.error('[useThenAndNow] Error fetching comparisons:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchComparisons();

    // Subscribe to real-time updates
    console.log('[useThenAndNow] Setting up real-time subscription');
    const channel = supabase
      .channel('then_and_now_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'then_and_now'
      }, (payload) => {
        console.log('[useThenAndNow] Real-time change detected:', payload);
        fetchComparisons();
      })
      .subscribe((status) => {
        console.log('[useThenAndNow] Subscription status:', status);
      });

    return () => {
      console.log('[useThenAndNow] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  return { comparisons, loading, error };
}
