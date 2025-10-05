// src/utils/soundEffects.js
// Sound effects system using Web Audio API

class SoundEffects {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3; // Default volume (0-1)
  }

  init() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
        this.enabled = false;
      }
    }
  }

  // Simple oscillator-based sounds (no external files needed)
  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Success/Correct sound
  playSuccess() {
    this.playTone(523.25, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 0.15), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.2), 200); // G5
  }

  // Error/Wrong sound
  playError() {
    this.playTone(200, 0.1, 'sawtooth');
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth'), 100);
  }

  // Click/Tap sound
  playClick() {
    this.playTone(800, 0.05, 'square');
  }

  // Pop sound (for catching items)
  playPop() {
    this.playTone(400, 0.08);
    setTimeout(() => this.playTone(600, 0.08), 50);
  }

  // Whoosh sound (for wind)
  playWhoosh() {
    if (!this.enabled || !this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * 0.5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioContext.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    whiteNoise.start();
    whiteNoise.stop(this.audioContext.currentTime + 0.5);
  }

  // Coin/Points sound
  playCoin() {
    this.playTone(1000, 0.05);
    setTimeout(() => this.playTone(1500, 0.1), 50);
  }

  // Warning sound
  playWarning() {
    this.playTone(800, 0.1, 'triangle');
    setTimeout(() => this.playTone(800, 0.1, 'triangle'), 150);
  }

  // Game start sound
  playGameStart() {
    this.playTone(392, 0.1); // G4
    setTimeout(() => this.playTone(523.25, 0.1), 100); // C5
    setTimeout(() => this.playTone(659.25, 0.15), 200); // E5
  }

  // Game over sound
  playGameOver() {
    this.playTone(659.25, 0.15); // E5
    setTimeout(() => this.playTone(523.25, 0.15), 150); // C5
    setTimeout(() => this.playTone(392, 0.2), 300); // G4
  }

  // Combo/Streak sound
  playCombo(level = 1) {
    const baseFreq = 500;
    for (let i = 0; i < level; i++) {
      setTimeout(() => this.playTone(baseFreq + (i * 100), 0.08), i * 50);
    }
  }

  // Vibrate (haptic feedback for mobile)
  vibrate(pattern = [50]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Short vibration
  vibrateShort() {
    this.vibrate([30]);
  }

  // Long vibration
  vibrateLong() {
    this.vibrate([100]);
  }

  // Error vibration pattern
  vibrateError() {
    this.vibrate([50, 50, 50]);
  }

  // Success vibration pattern
  vibrateSuccess() {
    this.vibrate([30, 30, 30, 30, 50]);
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Create singleton instance
const soundEffects = new SoundEffects();

export default soundEffects;
