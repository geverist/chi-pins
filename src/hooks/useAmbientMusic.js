// src/hooks/useAmbientMusic.js
import { useState, useRef, useCallback } from 'react';

/**
 * Hook for managing ambient music playback triggered by proximity detection
 * Handles fade in/out, volume control, and track selection
 *
 * @param {Object} config - Configuration object
 * @param {Array} config.playlist - Array of {name, url} track objects
 * @param {number} config.volume - Volume level (0.0 - 1.0)
 * @param {boolean} config.fadeIn - Enable fade-in effect
 * @param {boolean} config.fadeOut - Enable fade-out effect
 * @param {boolean} config.enabled - Enable ambient music feature
 * @returns {Object} Ambient music controls
 */
export function useAmbientMusic({
  playlist = [],
  volume = 0.5,
  fadeIn = true,
  fadeOut = true,
  enabled = false,
} = {}) {
  const ambientMusicPlayerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(() => {
    if (!ambientMusicPlayerRef.current && playlist.length > 0) {
      const randomTrack = playlist[Math.floor(Math.random() * playlist.length)];

      const audio = new Audio(randomTrack.url);
      audio.volume = volume;
      audio.loop = true;

      if (fadeIn) {
        audio.volume = 0;
        audio.play();
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol += 0.05;
          if (vol >= volume) {
            audio.volume = volume;
            clearInterval(fadeInterval);
          } else {
            audio.volume = vol;
          }
        }, 100);
      } else {
        audio.play();
      }

      ambientMusicPlayerRef.current = audio;
      setIsPlaying(true);
      console.log('[useAmbientMusic] Started:', randomTrack.name);
    }
  }, [playlist, volume, fadeIn, enabled]);

  const stop = useCallback(() => {
    if (ambientMusicPlayerRef.current) {
      const audio = ambientMusicPlayerRef.current;

      if (fadeOut) {
        let vol = audio.volume;
        const fadeInterval = setInterval(() => {
          vol -= 0.05;
          if (vol <= 0) {
            audio.pause();
            audio.src = '';
            ambientMusicPlayerRef.current = null;
            setIsPlaying(false);
            clearInterval(fadeInterval);
          } else {
            audio.volume = vol;
          }
        }, 100);
      } else {
        audio.pause();
        audio.src = '';
        ambientMusicPlayerRef.current = null;
        setIsPlaying(false);
      }

      console.log('[useAmbientMusic] Stopped');
    }
  }, [fadeOut]);

  return {
    play,
    stop,
    isPlaying,
    audioRef: ambientMusicPlayerRef,
  };
}
