// src/state/useThenAndNow.js
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const CACHE_KEY = 'then_and_now_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useThenAndNow() {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setComparisons(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('[useThenAndNow] Error loading cache:', err);
      }
    }

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

        // Update cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: data || [],
          timestamp: Date.now()
        }));

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
