// src/lib/sonosClient.js
/**
 * Sonos Client for Sonos speaker integration
 *
 * Protocol: Sonos HTTP API (port 1400) + UPnP
 * Docs: https://github.com/jishi/node-sonos-http-api
 *
 * Features:
 * - Speaker discovery on local network
 * - Volume control
 * - Play/pause/stop/next/previous
 * - Queue management
 * - Multi-room grouping
 */

class SonosClient {
  constructor(host = null, port = 1400) {
    this.host = host; // Auto-discover if null
    this.port = port;
    this.connected = false;
  }

  /**
   * Discover Sonos devices on local network
   * Uses SSDP/UPnP discovery or IP scanning
   */
  async discover() {
    console.log('[Sonos] Discovering devices...');

    // Step 1: Try SSDP (UPnP) discovery
    const ssdpDevices = await this.discoverViaSSDP();
    if (ssdpDevices.length > 0) {
      console.log(`[Sonos] Found ${ssdpDevices.length} devices via SSDP`);
      this.host = ssdpDevices[0].ip;
      return ssdpDevices;
    }

    // Step 2: Fall back to IP range scanning
    console.log('[Sonos] Falling back to IP range scan...');
    const scannedDevices = await this.scanIPRange();
    if (scannedDevices.length > 0) {
      console.log(`[Sonos] Found ${scannedDevices.length} devices via scan`);
      this.host = scannedDevices[0].ip;
      return scannedDevices;
    }

    console.warn('[Sonos] No devices found via auto-discovery');
    return [];
  }

  /**
   * Discover devices via SSDP (Simple Service Discovery Protocol)
   * Sonos devices respond to M-SEARCH requests for "urn:schemas-upnp-org:device:ZonePlayer:1"
   */
  async discoverViaSSDP() {
    // SSDP requires UDP multicast (not supported in browser)
    // Would require Capacitor plugin or native implementation
    console.log('[Sonos] SSDP discovery not supported in browser');
    return [];
  }

  /**
   * Scan local IP range for Sonos devices
   */
  async scanIPRange() {
    const devices = [];

    // Get device's local IP to determine subnet
    const localIP = await this.getLocalIP();
    console.log('[Sonos] Local IP:', localIP);

    let ipsToScan = [];

    if (localIP) {
      // Scan same subnet
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

    console.log(`[Sonos] Scanning ${ipsToScan.length} IPs...`);

    // Scan in batches
    const batchSize = 10;
    for (let i = 0; i < ipsToScan.length; i += batchSize) {
      const batch = ipsToScan.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(ip => this.testSonosDevice(ip))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          devices.push({
            ip: batch[index],
            name: result.value.name || 'Sonos Device',
            model: result.value.model || 'Unknown',
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

        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 2000);
      });
    } catch (error) {
      console.error('[Sonos] Failed to get local IP:', error);
      return null;
    }
  }

  /**
   * Test if a device at given IP is a Sonos speaker
   * Sonos speakers respond to HTTP requests on port 1400 with device description
   */
  async testSonosDevice(ip) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      // Try to fetch device description XML
      const response = await fetch(`http://${ip}:${this.port}/xml/device_description.xml`, {
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        // Parse device name from XML
        const nameMatch = text.match(/<friendlyName>(.*?)<\/friendlyName>/);
        const modelMatch = text.match(/<modelName>(.*?)<\/modelName>/);

        return {
          name: nameMatch ? nameMatch[1] : 'Sonos Device',
          model: modelMatch ? modelMatch[1] : 'Unknown',
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Connect to Sonos device
   */
  async connect(host = null) {
    if (host) this.host = host;

    if (!this.host) {
      await this.discover();
      if (!this.host) {
        throw new Error('Sonos device not found. Please specify host IP.');
      }
    }

    this.connected = true;
    console.log(`[Sonos] Connected to ${this.host}:${this.port}`);
    return true;
  }

  /**
   * Send Sonos SOAP command
   */
  async sendCommand(service, action, args = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Sonos device');
    }

    const argElements = Object.entries(args)
      .map(([key, val]) => `<${key}>${val}</${key}>`)
      .join('');

    const soapBody = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="urn:schemas-upnp-org:service:${service}:1">
      ${argElements}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

    const url = `http://${this.host}:${this.port}/${service}/Control`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset="utf-8"',
          'SOAPAction': `"urn:schemas-upnp-org:service:${service}:1#${action}"`,
        },
        body: soapBody,
      });

      const data = await response.text();
      console.log('[Sonos] Response:', data);
      return data;
    } catch (error) {
      console.error('[Sonos] Command failed:', error);
      throw error;
    }
  }

  /**
   * Play audio from URL
   */
  async playURL(url) {
    return this.sendCommand('AVTransport', 'SetAVTransportURI', {
      InstanceID: 0,
      CurrentURI: url,
      CurrentURIMetaData: ''
    });
  }

  /**
   * Play/pause/stop controls
   */
  async play() {
    return this.sendCommand('AVTransport', 'Play', {
      InstanceID: 0,
      Speed: 1
    });
  }

  async pause() {
    return this.sendCommand('AVTransport', 'Pause', {
      InstanceID: 0
    });
  }

  async stop() {
    return this.sendCommand('AVTransport', 'Stop', {
      InstanceID: 0
    });
  }

  /**
   * Volume control (0-100)
   */
  async setVolume(level) {
    return this.sendCommand('RenderingControl', 'SetVolume', {
      InstanceID: 0,
      Channel: 'Master',
      DesiredVolume: Math.max(0, Math.min(100, level))
    });
  }

  async getVolume() {
    return this.sendCommand('RenderingControl', 'GetVolume', {
      InstanceID: 0,
      Channel: 'Master'
    });
  }

  /**
   * Playback controls
   */
  async next() {
    return this.sendCommand('AVTransport', 'Next', {
      InstanceID: 0
    });
  }

  async previous() {
    return this.sendCommand('AVTransport', 'Previous', {
      InstanceID: 0
    });
  }

  /**
   * Disconnect from Sonos
   */
  disconnect() {
    this.connected = false;
    console.log('[Sonos] Disconnected');
  }
}

// Singleton instance
let sonosInstance = null;

export function getSonosClient(host = null) {
  if (!sonosInstance) {
    sonosInstance = new SonosClient(host);
  }
  return sonosInstance;
}

export default SonosClient;
