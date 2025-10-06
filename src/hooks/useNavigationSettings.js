// src/hooks/useNavigationSettings.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const CACHE_KEY = 'navigation_settings_cache';
const CACHE_VERSION = 1; // Increment to invalidate old caches
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

const DEFAULT_SETTINGS = {
  games_enabled: true,
  jukebox_enabled: true,
  order_enabled: true,
  explore_enabled: true,
  photobooth_enabled: true,
  thenandnow_enabled: true,
  comments_enabled: true,
  recommendations_enabled: false,
  appointment_checkin_enabled: false,
  reservation_checkin_enabled: false,
  guestbook_enabled: false,
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
      console.log('[useNavigationSettings] Fetching from API:', `${API_BASE}/api/navigation-settings`);
      const response = await fetch(`${API_BASE}/api/navigation-settings`);
      console.log('[useNavigationSettings] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useNavigationSettings] API error:', errorText);
        throw new Error(`Failed to fetch navigation settings: ${response.status}`);
      }
      const data = await response.json();
      console.log('[useNavigationSettings] Fetched from API:', data);
      console.log('[useNavigationSettings] games_enabled:', data.games_enabled);
      setSettings(data);
      setError(null);

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
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

      const response = await fetch(`${API_BASE}/api/navigation-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Navigation settings update failed:', response.status, errorText);
        throw new Error(`Failed to update navigation settings: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useNavigationSettings] Update successful, API returned:', data);
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
