// src/hooks/useNavigationSettings.js
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function useNavigationSettings() {
  const [settings, setSettings] = useState({
    games_enabled: true,
    jukebox_enabled: true,
    order_enabled: true,
    explore_enabled: true,
    photobooth_enabled: true,
    thenandnow_enabled: true,
    comments_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Listen for updates from other hook instances
  useEffect(() => {
    const handleUpdate = (event) => {
      setSettings(event.detail);
    };
    window.addEventListener('navigation-settings-updated', handleUpdate);
    return () => window.removeEventListener('navigation-settings-updated', handleUpdate);
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/navigation-settings`);
      if (!response.ok) {
        throw new Error('Failed to fetch navigation settings');
      }
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching navigation settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
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
      setSettings(data);
      setError(null);

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
