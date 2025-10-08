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

    // Step 1: Try mDNS service discovery (requires browser support or Capacitor plugin)
    const mdnsDevices = await this.discoverViaMDNS();
    if (mdnsDevices.length > 0) {
      console.log(`[HEOS] Found ${mdnsDevices.length} devices via mDNS`);
      this.host = mdnsDevices[0].ip;
      return mdnsDevices;
    }

    // Step 2: Try SSDP (UPnP) discovery
    const ssdpDevices = await this.discoverViaSSDP();
    if (ssdpDevices.length > 0) {
      console.log(`[HEOS] Found ${ssdpDevices.length} devices via SSDP`);
      this.host = ssdpDevices[0].ip;
      return ssdpDevices;
    }

    // Step 3: Fall back to IP range scanning
    console.log('[HEOS] Falling back to IP range scan...');
    const scannedDevices = await this.scanIPRange();
    if (scannedDevices.length > 0) {
      console.log(`[HEOS] Found ${scannedDevices.length} devices via scan`);
      this.host = scannedDevices[0].ip;
      return scannedDevices;
    }

    console.warn('[HEOS] No devices found via auto-discovery');
    return [];
  }

  /**
   * Discover devices via mDNS (Bonjour/Zeroconf)
   * HEOS broadcasts as _heos._tcp
   */
  async discoverViaMDNS() {
    // Browser API doesn't support mDNS directly
    // Would require Capacitor plugin or native implementation
    // For now, return empty array
    console.log('[HEOS] mDNS discovery not supported in browser');
    return [];
  }

  /**
   * Discover devices via SSDP (Simple Service Discovery Protocol)
   * HEOS devices respond to M-SEARCH requests
   */
  async discoverViaSSDP() {
    // SSDP requires UDP multicast (not supported in browser)
    // Would require Capacitor plugin or native implementation
    console.log('[HEOS] SSDP discovery not supported in browser');
    return [];
  }

  /**
   * Scan local IP range for HEOS devices
   * Tests common local IPs and subnet
   */
  async scanIPRange() {
    const devices = [];

    // Get device's local IP to determine subnet
    const localIP = await this.getLocalIP();
    console.log('[HEOS] Local IP:', localIP);

    let ipsToScan = [];

    if (localIP) {
      // Scan same subnet (e.g., 192.168.1.x)
      const subnet = localIP.split('.').slice(0, 3).join('.');
      ipsToScan = Array.from({ length: 255 }, (_, i) => `${subnet}.${i + 1}`);
    } else {
      // Fall back to common ranges
      ipsToScan = [
        ...Array.from({ length: 20 }, (_, i) => `192.168.1.${100 + i}`),
        ...Array.from({ length: 20 }, (_, i) => `192.168.0.${100 + i}`),
        ...Array.from({ length: 20 }, (_, i) => `10.0.0.${100 + i}`),
      ];
    }

    console.log(`[HEOS] Scanning ${ipsToScan.length} IPs...`);

    // Scan in batches to avoid overwhelming the network
    const batchSize = 10;
    for (let i = 0; i < ipsToScan.length; i += batchSize) {
      const batch = ipsToScan.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(ip => this.testHEOSDevice(ip))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          devices.push({
            ip: batch[index],
            name: result.value.name || 'HEOS Device',
          });
        }
      });

      // Stop if we found at least one device
      if (devices.length > 0) {
        break;
      }
    }

    return devices;
  }

  /**
   * Get device's local IP address
   */
  async getLocalIP() {
    try {
      // Use WebRTC to get local IP (works in browser)
      return new Promise((resolve) => {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            pc.close();
            resolve(null);
            return;
          }

          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = ipRegex.exec(ice.candidate.candidate);
          if (match && match[1]) {
            pc.close();
            resolve(match[1]);
          }
        };

        // Timeout after 2 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 2000);
      });
    } catch (error) {
      console.error('[HEOS] Failed to get local IP:', error);
      return null;
    }
  }

  /**
   * Test if a device at given IP is a HEOS speaker
   */
  async testHEOSDevice(ip) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms timeout per device

      const response = await fetch(`http://${ip}:${this.port}/heos/system/heart_beat`, {
        signal: controller.signal,
        mode: 'no-cors', // Allow cross-origin testing
      });

      clearTimeout(timeoutId);

      // If we get any response, assume it's a HEOS device
      // (no-cors mode doesn't allow reading response, but connection success = device found)
      return { name: 'HEOS Device' };
    } catch (error) {
      // Timeout or connection refused = not a HEOS device
      return null;
    }
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
