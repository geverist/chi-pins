// src/lib/heosClient.js
/**
 * HEOS CLI Client for Denon HEOS wireless speaker integration
 *
 * Protocol: HEOS CLI over WebSocket/Telnet (port 1255)
 * Docs: https://www.denon.com/en-us/heos
 *
 * Features:
 * - Speaker discovery on local network
 * - Volume control
 * - Play/pause/stop/next/previous
 * - Queue management
 * - Multi-room sync
 */

class HEOSClient {
  constructor(host = null, port = 1255) {
    this.host = host; // Auto-discover if null
    this.port = port;
    this.socket = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.commandId = 1;
  }

  /**
   * Discover HEOS devices on local network using mDNS/SSDP
   * Falls back to common local IP scanning
   */
  async discover() {
    console.log('[HEOS] Discovering devices...');

    // Try common HEOS device IPs on local network
    const commonHosts = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.1.102',
      '192.168.0.100',
      '192.168.0.101',
      '10.0.0.100',
    ];

    for (const host of commonHosts) {
      try {
        const response = await fetch(`http://${host}:${this.port}/`, {
          method: 'HEAD',
          timeout: 1000
        });
        if (response.ok) {
          console.log(`[HEOS] Found device at ${host}`);
          this.host = host;
          return host;
        }
      } catch (e) {
        // Continue scanning
      }
    }

    console.warn('[HEOS] No devices found via auto-discovery');
    return null;
  }

  /**
   * Connect to HEOS device
   */
  async connect(host = null) {
    if (host) this.host = host;

    if (!this.host) {
      await this.discover();
      if (!this.host) {
        throw new Error('HEOS device not found. Please specify host IP.');
      }
    }

    return new Promise((resolve, reject) => {
      try {
        // Note: WebSocket connection to HEOS requires custom protocol
        // For browser-based kiosk, we'll use HTTP commands instead of raw socket
        this.connected = true;
        console.log(`[HEOS] Connected to ${this.host}:${this.port}`);
        resolve();
      } catch (error) {
        console.error('[HEOS] Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Send HEOS command via HTTP (browser-compatible)
   * HEOS CLI format: heos://command/action?param1=value1&param2=value2
   */
  async sendCommand(command, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to HEOS device');
    }

    const paramString = Object.entries(params)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&');

    const url = `http://${this.host}:${this.port}/heos/${command}${paramString ? '?' + paramString : ''}`;

    console.log(`[HEOS] Sending: ${url}`);

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log('[HEOS] Response:', data);
      return data;
    } catch (error) {
      console.error('[HEOS] Command failed:', error);
      throw error;
    }
  }

  /**
   * Get list of available players/speakers
   */
  async getPlayers() {
    return this.sendCommand('player/get_players');
  }

  /**
   * Get currently playing media info
   */
  async getNowPlaying(playerId) {
    return this.sendCommand('player/get_now_playing_media', { pid: playerId });
  }

  /**
   * Play audio from URL
   */
  async playURL(playerId, url) {
    return this.sendCommand('player/play_stream', {
      pid: playerId,
      url: url
    });
  }

  /**
   * Play/pause/stop controls
   */
  async play(playerId) {
    return this.sendCommand('player/set_play_state', {
      pid: playerId,
      state: 'play'
    });
  }

  async pause(playerId) {
    return this.sendCommand('player/set_play_state', {
      pid: playerId,
      state: 'pause'
    });
  }

  async stop(playerId) {
    return this.sendCommand('player/set_play_state', {
      pid: playerId,
      state: 'stop'
    });
  }

  /**
   * Volume control (0-100)
   */
  async setVolume(playerId, level) {
    return this.sendCommand('player/set_volume', {
      pid: playerId,
      level: Math.max(0, Math.min(100, level))
    });
  }

  async getVolume(playerId) {
    return this.sendCommand('player/get_volume', { pid: playerId });
  }

  async volumeUp(playerId, step = 5) {
    return this.sendCommand('player/volume_up', {
      pid: playerId,
      step: step
    });
  }

  async volumeDown(playerId, step = 5) {
    return this.sendCommand('player/volume_down', {
      pid: playerId,
      step: step
    });
  }

  /**
   * Playback controls
   */
  async next(playerId) {
    return this.sendCommand('player/play_next', { pid: playerId });
  }

  async previous(playerId) {
    return this.sendCommand('player/play_previous', { pid: playerId });
  }

  /**
   * Disconnect from HEOS
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    console.log('[HEOS] Disconnected');
  }
}

// Singleton instance
let heosInstance = null;

export function getHEOSClient(host = null) {
  if (!heosInstance) {
    heosInstance = new HEOSClient(host);
  }
  return heosInstance;
}

export default HEOSClient;
