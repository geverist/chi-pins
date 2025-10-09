// src/hooks/useNavigationSettings.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const CACHE_KEY = 'navigation_settings_cache';
const CACHE_VERSION = 1; // Increment to invalidate old caches
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'; // Fixed UUID for single settings row

const DEFAULT_SETTINGS = {
  games_enabled: false,
  jukebox_enabled: false,
  order_enabled: false,
  explore_enabled: true,
  photobooth_enabled: false,
  thenandnow_enabled: false,
  comments_enabled: false,
  recommendations_enabled: false,
  default_navigation_app: 'map',
};

export function useNavigationSettings() {
  // Initialize with cached data if available, otherwise use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, version } = JSON.parse(cached);
        // Check cache version - invalidate if old version
        // Accept undefined version (from before versioning was added) or matching version
        if (version === undefined || version === CACHE_VERSION) {
          // Use cache regardless of age - API fetch will update it
          console.log('[useNavigationSettings] Initializing with cached settings:', data);
          return data;
        } else {
          console.log('[useNavigationSettings] Cache version mismatch, clearing cache');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (err) {
      console.warn('[useNavigationSettings] Failed to load cache:', err);
    }
    return DEFAULT_SETTINGS;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settings on mount - always fetch fresh data to update cache
  useEffect(() => {
    fetchSettings();
  }, []);

  // Listen for updates from other hook instances
  useEffect(() => {
    const handleUpdate = (event) => {
      setSettings(event.detail);
      // Update cache when settings change
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: event.detail,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }));
    };
    window.addEventListener('navigation-settings-updated', handleUpdate);
    return () => window.removeEventListener('navigation-settings-updated', handleUpdate);
  }, []);

  // Real-time subscription to navigation_settings table
  useEffect(() => {
    console.log('[useNavigationSettings] Setting up real-time subscription');
    const channel = supabase
      .channel('navigation_settings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'navigation_settings'
      }, (payload) => {
        console.log('[useNavigationSettings] Real-time change detected:', payload);
        if (payload.new) {
          setSettings(payload.new);
          // Update cache
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: payload.new,
            timestamp: Date.now(),
            version: CACHE_VERSION
          }));
          // Notify other instances
          window.dispatchEvent(new CustomEvent('navigation-settings-updated', { detail: payload.new }));
        }
      })
      .subscribe((status) => {
        console.log('[useNavigationSettings] Subscription status:', status);
      });

    return () => {
      console.log('[useNavigationSettings] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('[useNavigationSettings] Fetching from Supabase navigation_settings table');

      const { data, error: supabaseError } = await supabase
        .from('navigation_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (supabaseError) {
        console.error('[useNavigationSettings] Supabase error:', supabaseError);
        throw new Error(`Failed to fetch navigation settings: ${supabaseError.message}`);
      }

      console.log('[useNavigationSettings] Fetched from Supabase:', data);
      console.log('[useNavigationSettings] games_enabled:', data?.games_enabled);

      const settingsData = data || DEFAULT_SETTINGS;
      setSettings(settingsData);
      setError(null);

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: settingsData,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }));
    } catch (err) {
      console.error('[useNavigationSettings] Error fetching navigation settings:', err);
      setError(err.message);
      // Use default settings on error
      console.log('[useNavigationSettings] Using default settings due to error');
      setSettings(DEFAULT_SETTINGS);

      // Cache default settings
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: DEFAULT_SETTINGS,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }));
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      console.log('[useNavigationSettings] Updating settings:', newSettings);

      // Optimistically update UI immediately
      setSettings(newSettings);

      // Save to Supabase navigation_settings table
      const { data, error: supabaseError } = await supabase
        .from('navigation_settings')
        .upsert({
          id: SETTINGS_ID, // Single row for global settings (UUID)
          ...newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (supabaseError) {
        console.error('Navigation settings update failed:', supabaseError);
        throw new Error(`Failed to update navigation settings: ${supabaseError.message}`);
      }

      console.log('[useNavigationSettings] Update successful, Supabase returned:', data);
      setSettings(data);
      setError(null);

      // Update cache immediately
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }));

      // Trigger a global event to notify other hook instances
      window.dispatchEvent(new CustomEvent('navigation-settings-updated', { detail: data }));

      return data;
    } catch (err) {
      console.error('Error updating navigation settings:', err);
      setError(err.message);
      // Revert optimistic update on error
      await fetchSettings();
      throw err;
    }
  };

  // Calculate how many navigation items are enabled
  const enabledCount = Object.values(settings).filter(v => v === true).length;

  return {
    settings,
    loading,
    error,
    updateSettings,
    fetchSettings,
    enabledCount,
  };
}
