// src/hooks/useKioskCluster.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to manage kiosk cluster data for multi-location businesses
 * Automatically detects current location based on URL params or localStorage
 */
export function useKioskCluster() {
  const [cluster, setCluster] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [otherLocations, setOtherLocations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get location ID from URL or localStorage
  const getLocationId = useCallback(() => {
    // Check URL params first
    const params = new URLSearchParams(window.location.search);
    const urlLocationId = params.get('location');

    if (urlLocationId) {
      localStorage.setItem('kioskLocationId', urlLocationId);
      return urlLocationId;
    }

    // Fall back to localStorage
    return localStorage.getItem('kioskLocationId');
  }, []);

  // Load cluster data
  const loadClusterData = useCallback(async () => {
    const locationId = getLocationId();

    if (!locationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch current location with cluster data
      const { data: locationData, error: locationError } = await supabase
        .from('kiosk_locations')
        .select(`
          *,
          cluster:kiosk_clusters(*)
        `)
        .eq('id', locationId)
        .eq('active', true)
        .single();

      if (locationError) throw locationError;

      if (locationData) {
        setCurrentLocation(locationData);
        setCluster(locationData.cluster);

        // Fetch other locations in the same cluster
        const { data: siblingsData, error: siblingsError } = await supabase
          .from('kiosk_locations')
          .select('*')
          .eq('cluster_id', locationData.cluster.id)
          .eq('active', true)
          .neq('id', locationId)
          .order('display_order', { ascending: true });

        if (siblingsError) throw siblingsError;
        setOtherLocations(siblingsData || []);

        // Fetch location-specific settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('kiosk_location_settings')
          .select('*')
          .eq('location_id', locationId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }
        setSettings(settingsData || {});
      }
    } catch (err) {
      console.error('Failed to load cluster data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getLocationId]);

  // Subscribe to real-time updates
  useEffect(() => {
    loadClusterData();

    const locationId = getLocationId();
    if (!locationId) return;

    // Subscribe to location changes
    const locationChannel = supabase
      .channel('kiosk_location_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kiosk_locations',
        filter: `id=eq.${locationId}`
      }, () => {
        console.log('[useKioskCluster] Location data changed, reloading...');
        loadClusterData();
      })
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('kiosk_settings_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kiosk_location_settings',
        filter: `location_id=eq.${locationId}`
      }, () => {
        console.log('[useKioskCluster] Settings changed, reloading...');
        loadClusterData();
      })
      .subscribe();

    return () => {
      locationChannel.unsubscribe();
      settingsChannel.unsubscribe();
    };
  }, [loadClusterData, getLocationId]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }, []);

  // Get locations sorted by distance from current location
  const getLocationsByDistance = useCallback(() => {
    if (!currentLocation?.lat || !currentLocation?.lng) {
      return otherLocations;
    }

    return otherLocations
      .map(loc => ({
        ...loc,
        distance: calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          loc.lat,
          loc.lng
        )
      }))
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }, [currentLocation, otherLocations, calculateDistance]);

  // Switch to a different location
  const switchLocation = useCallback((locationId) => {
    localStorage.setItem('kioskLocationId', locationId);

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('location', locationId);
    window.history.pushState({}, '', url);

    // Reload data
    loadClusterData();
  }, [loadClusterData]);

  return {
    cluster,
    currentLocation,
    otherLocations,
    settings,
    loading,
    error,
    isClusterMode: !!cluster && otherLocations.length > 0,
    getLocationsByDistance,
    switchLocation,
    reload: loadClusterData
  };
}
