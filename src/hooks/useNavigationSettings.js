// src/hooks/useNavigationSettings.js
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function useNavigationSettings() {
  const [settings, setSettings] = useState({
    games_enabled: true,
    jukebox_enabled: true,
    order_enabled: true,
    explore_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
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
      const response = await fetch(`${API_BASE}/api/navigation-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update navigation settings');
      }

      const data = await response.json();
      setSettings(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Error updating navigation settings:', err);
      setError(err.message);
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
