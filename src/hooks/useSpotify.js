// src/hooks/useSpotify.js
import { useState, useEffect, useRef } from 'react';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

// Token stored in memory
let cachedToken = null;
let tokenExpiry = null;

export function useSpotify() {
  const [accessToken, setAccessToken] = useState(cachedToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get access token using Client Credentials Flow
  const getAccessToken = async () => {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
      return cachedToken;
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.warn('Spotify credentials not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET),
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error('Failed to get Spotify access token');
      }

      const data = await response.json();
      cachedToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min before expiry
      setAccessToken(cachedToken);
      return cachedToken;
    } catch (err) {
      console.error('Spotify auth error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize token on mount
  useEffect(() => {
    if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
      getAccessToken();
    }
  }, []);

  // Search for tracks
  const searchTracks = async (query, limit = 20) => {
    const token = await getAccessToken();
    if (!token) return { tracks: [], error: 'No access token' };

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Spotify search failed');
      }

      const data = await response.json();
      return {
        tracks: data.tracks.items.map(track => ({
          id: track.id,
          uri: track.uri,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          albumArt: track.album.images[0]?.url,
          duration: track.duration_ms,
          previewUrl: track.preview_url,
          spotifyUrl: track.external_urls.spotify,
          source: 'spotify',
        })),
        error: null,
      };
    } catch (err) {
      console.error('Spotify search error:', err);
      return { tracks: [], error: err.message };
    }
  };

  // Get track details by ID
  const getTrack = async (trackId) => {
    const token = await getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get track');
      }

      const track = await response.json();
      return {
        id: track.id,
        uri: track.uri,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        duration: track.duration_ms,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        source: 'spotify',
      };
    } catch (err) {
      console.error('Get track error:', err);
      return null;
    }
  };

  // Get multiple tracks
  const getTracks = async (trackIds) => {
    const token = await getAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get tracks');
      }

      const data = await response.json();
      return data.tracks.map(track => ({
        id: track.id,
        uri: track.uri,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images[0]?.url,
        duration: track.duration_ms,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        source: 'spotify',
      }));
    } catch (err) {
      console.error('Get tracks error:', err);
      return [];
    }
  };

  return {
    accessToken,
    isLoading,
    error,
    searchTracks,
    getTrack,
    getTracks,
    isConfigured: !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET),
  };
}
