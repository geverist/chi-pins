// src/lib/spotifyClient.js
// Spotify Web API client for currently playing track

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin + '/spotify-callback';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state', // For play/pause/skip controls
].join(' ');

class SpotifyClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  // Generate authorization URL
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      show_dialog: 'true', // Always show consent screen
    });

    return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async authorize(code) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to authorize with Spotify');
    }

    const data = await response.json();
    this.setTokens(data);
    return data;
  }

  // Set tokens and expiration
  setTokens(data) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Date.now() + (data.expires_in * 1000);

    // Save to localStorage for persistence
    localStorage.setItem('spotify_access_token', this.accessToken);
    if (this.refreshToken) {
      localStorage.setItem('spotify_refresh_token', this.refreshToken);
    }
    localStorage.setItem('spotify_expires_at', this.expiresAt.toString());
  }

  // Load tokens from localStorage
  loadTokens() {
    this.accessToken = localStorage.getItem('spotify_access_token');
    this.refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');
    this.expiresAt = expiresAt ? parseInt(expiresAt) : null;
  }

  // Check if token is expired
  isTokenExpired() {
    return !this.expiresAt || Date.now() >= this.expiresAt;
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Spotify token');
    }

    const data = await response.json();
    this.setTokens({ ...data, refresh_token: this.refreshToken }); // Keep existing refresh token if not provided
    return data;
  }

  // Ensure we have a valid access token
  async ensureValidToken() {
    this.loadTokens();

    if (!this.accessToken) {
      throw new Error('Not authenticated with Spotify');
    }

    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
  }

  // Get currently playing track
  async getCurrentlyPlaying() {
    await this.ensureValidToken();

    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (response.status === 204) {
      // No track currently playing
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch currently playing track');
    }

    const data = await response.json();

    if (!data || !data.item) {
      return null;
    }

    return {
      name: data.item.name,
      artist: data.item.artists.map(a => a.name).join(', '),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url,
      duration: data.item.duration_ms,
      progress: data.progress_ms,
      isPlaying: data.is_playing,
      uri: data.item.uri,
      externalUrl: data.item.external_urls.spotify,
    };
  }

  // Playback controls
  async play() {
    await this.ensureValidToken();
    await fetch(`${SPOTIFY_API_BASE}/me/player/play`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  async pause() {
    await this.ensureValidToken();
    await fetch(`${SPOTIFY_API_BASE}/me/player/pause`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  async next() {
    await this.ensureValidToken();
    await fetch(`${SPOTIFY_API_BASE}/me/player/next`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  async previous() {
    await this.ensureValidToken();
    await fetch(`${SPOTIFY_API_BASE}/me/player/previous`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
  }

  // Check if authenticated
  isAuthenticated() {
    this.loadTokens();
    return !!this.accessToken && !!this.refreshToken;
  }

  // Logout
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
  }
}

// Singleton instance
let spotifyClient = null;

export function getSpotifyClient() {
  if (!spotifyClient) {
    spotifyClient = new SpotifyClient();
  }
  return spotifyClient;
}

export default SpotifyClient;
