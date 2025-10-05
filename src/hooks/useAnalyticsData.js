// src/hooks/useAnalyticsData.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch and aggregate analytics data for dashboards
 */
export function useAnalyticsData(locationId = null, dateRange = 30) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [wordCloud, setWordCloud] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Fetch overall metrics
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq(locationId ? 'location_id' : 'id', locationId || 'id'); // Filter by location if provided

      if (eventsError) throw eventsError;

      // Calculate metrics
      const uniqueSessions = new Set(events.map(e => e.user_session_id)).size;
      const totalEvents = events.length;

      const metricsData = {
        totalEvents,
        uniqueUsers: uniqueSessions,
        pinsCreated: events.filter(e => e.event_type === 'pin_created').length,
        gamesPlayed: events.filter(e => e.event_category === 'game').length,
        photosToken: events.filter(e => e.event_type === 'photo_taken').length,
        jukeboxPlays: events.filter(e => e.event_type === 'jukebox_play').length,
        avgEventsPerSession: uniqueSessions > 0 ? (totalEvents / uniqueSessions).toFixed(1) : 0
      };

      setMetrics(metricsData);

      // Fetch word cloud data
      const { data: words, error: wordsError } = await supabase
        .from('analytics_word_frequency')
        .select('*')
        .eq(locationId ? 'location_id' : 'word', locationId || 'word') // Filter if location provided
        .order('count', { ascending: false })
        .limit(50);

      if (wordsError) throw wordsError;
      setWordCloud(words || []);

      // Fetch popular items
      const { data: popular, error: popularError } = await supabase
        .from('analytics_popular_items')
        .select('*')
        .eq(locationId ? 'location_id' : 'item_type', locationId || 'item_type')
        .order('interaction_count', { ascending: false })
        .limit(20);

      if (popularError) throw popularError;
      setPopularItems(popular || []);

      // Fetch daily stats
      const { data: daily, error: dailyError } = await supabase
        .from('analytics_daily_metrics')
        .select('*')
        .eq(locationId ? 'location_id' : 'date', locationId || new Date().toISOString().split('T')[0])
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (dailyError) throw dailyError;
      setDailyStats(daily || []);

    } catch (err) {
      console.error('[Analytics] Failed to load data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange]);

  useEffect(() => {
    loadAnalytics();

    // Subscribe to analytics updates
    const channel = supabase
      .channel('analytics_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'analytics_events'
      }, () => {
        console.log('[Analytics] New data, reloading...');
        loadAnalytics();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [loadAnalytics]);

  return {
    loading,
    error,
    metrics,
    wordCloud,
    popularItems,
    dailyStats,
    reload: loadAnalytics
  };
}
