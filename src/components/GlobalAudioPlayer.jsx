// src/components/GlobalAudioPlayer.jsx
// Hidden audio player that persists globally for continuous playback
import { useEffect, useRef } from 'react';
import { useNowPlaying } from '../state/useNowPlaying.jsx';
import { useAdminSettings } from '../state/useAdminSettings';

const LS_PLAYBACK_POSITION = 'nowPlaying_position';
const LS_PLAYBACK_URL = 'nowPlaying_positionUrl';

export default function GlobalAudioPlayer() {
  const audioRef = useRef(null);
  const savePositionIntervalRef = useRef(null);
  const { currentTrack, isPlaying, setIsPlaying, setLastPlayed, setCurrentTrack, playNext } = useNowPlaying();
  const { settings: adminSettings } = useAdminSettings();

  // Play the current track when it changes
  useEffect(() => {
    console.log('GlobalAudioPlayer - currentTrack changed:', currentTrack);
    if (!currentTrack || !audioRef.current) {
      console.log('GlobalAudioPlayer - No current track or audio ref');
      return;
    }

    const audio = audioRef.current;

    // Determine the source URL based on track type
    let sourceUrl = currentTrack.url;

    console.log('GlobalAudioPlayer - Track URL:', sourceUrl);

    // Validate URL
    if (!sourceUrl) {
      console.error('GlobalAudioPlayer - No URL for track:', currentTrack);
      setIsPlaying(false);
      // Clear current track if no URL
      setCurrentTrack(null);
      return;
    }

    // For Spotify tracks, check if we have a preview URL
    if (currentTrack.music_source === 'spotify' || currentTrack.mime_type === 'audio/spotify') {
      if (!currentTrack.url) {
        console.warn('GlobalAudioPlayer - Spotify track has no preview URL');
        setIsPlaying(false);
        return;
      }
      console.log('GlobalAudioPlayer - Playing Spotify preview:', currentTrack.title);
    }

    audio.src = sourceUrl;
    console.log('GlobalAudioPlayer - Audio src set to:', audio.src);

    // Try to restore playback position if this is the same track (page refresh)
    const tryRestorePosition = () => {
      try {
        const savedUrl = localStorage.getItem(LS_PLAYBACK_URL);
        const savedPosition = localStorage.getItem(LS_PLAYBACK_POSITION);

        if (savedUrl === sourceUrl && savedPosition) {
          const position = parseFloat(savedPosition);
          if (position > 0 && position < audio.duration) {
            audio.currentTime = position;
            console.log('GlobalAudioPlayer - Restored playback position:', position);
          }
        }
      } catch (err) {
        console.error('GlobalAudioPlayer - Failed to restore position:', err);
      }
    };

    // Handle Bluetooth device selection if configured
    const playAudio = async () => {
      try {
        if (adminSettings.audioOutputType === 'bluetooth' && 'setSinkId' in audio) {
          if (adminSettings.bluetoothDeviceId) {
            await audio.setSinkId(adminSettings.bluetoothDeviceId);
          }
        }

        // Wait for metadata to load before restoring position
        if (audio.readyState < 1) {
          await new Promise(resolve => {
            audio.addEventListener('loadedmetadata', resolve, { once: true });
          });
        }

        tryRestorePosition();
        await audio.play();
        console.log('GlobalAudioPlayer - playback started');
      } catch (err) {
        console.error('GlobalAudioPlayer - Failed to play:', err);
        setIsPlaying(false);
      }
    };

    playAudio();
  }, [currentTrack, adminSettings.audioOutputType, adminSettings.bluetoothDeviceId, setIsPlaying]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log('GlobalAudioPlayer - play event');
      setIsPlaying(true);

      // Start saving playback position every 2 seconds
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current);
      }
      savePositionIntervalRef.current = setInterval(() => {
        if (audio.src && !audio.paused && !audio.ended) {
          try {
            localStorage.setItem(LS_PLAYBACK_POSITION, audio.currentTime.toString());
            localStorage.setItem(LS_PLAYBACK_URL, audio.src);
          } catch (err) {
            console.error('Failed to save playback position:', err);
          }
        }
      }, 2000);
    };

    const handlePause = () => {
      console.log('GlobalAudioPlayer - pause event');
      setIsPlaying(false);

      // Save position when paused
      if (audio.src) {
        try {
          localStorage.setItem(LS_PLAYBACK_POSITION, audio.currentTime.toString());
          localStorage.setItem(LS_PLAYBACK_URL, audio.src);
        } catch (err) {
          console.error('Failed to save playback position:', err);
        }
      }

      // Stop saving position
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current);
        savePositionIntervalRef.current = null;
      }
    };

    const handleEnded = async () => {
      console.log('GlobalAudioPlayer - track ended, trying next...');
      setIsPlaying(false);

      // Clear saved position when track ends
      try {
        localStorage.removeItem(LS_PLAYBACK_POSITION);
        localStorage.removeItem(LS_PLAYBACK_URL);
      } catch (err) {
        console.error('Failed to clear playback position:', err);
      }

      // Stop saving position
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current);
        savePositionIntervalRef.current = null;
      }

      // Save current track as last played before moving to next
      if (currentTrack) {
        setLastPlayed(currentTrack);
      }

      const nextTrack = await playNext();
      if (nextTrack) {
        console.log('GlobalAudioPlayer - playing next track:', nextTrack.title);
        // playNext updates the database, but we also update local state
        // for immediate UI response (subscription will sync it again)
        setCurrentTrack(nextTrack);
      } else {
        console.log('GlobalAudioPlayer - no more tracks in queue, stopping playback');
        // No next track, clear current
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    };

    const handleError = (e) => {
      const audio = audioRef.current;
      const errorDetails = {
        error: e,
        networkState: audio?.networkState,
        readyState: audio?.readyState,
        src: audio?.src,
        currentTrack: currentTrack?.title,
      };

      // Get more specific error info
      if (audio?.error) {
        errorDetails.code = audio.error.code;
        errorDetails.message = audio.error.message;

        const errorMessages = {
          1: 'MEDIA_ERR_ABORTED - Playback aborted',
          2: 'MEDIA_ERR_NETWORK - Network error',
          3: 'MEDIA_ERR_DECODE - Decode error',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported',
        };
        errorDetails.errorType = errorMessages[audio.error.code] || 'Unknown error';
      }

      console.error('GlobalAudioPlayer - audio error:', errorDetails);
      setIsPlaying(false);

      // If error is due to bad source, clear track and try next
      if (audio?.error?.code === 4 || audio?.error?.code === 2) {
        console.log('GlobalAudioPlayer - Skipping problematic track and playing next');
        playNext();
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);

      // Clear interval on cleanup
      if (savePositionIntervalRef.current) {
        clearInterval(savePositionIntervalRef.current);
        savePositionIntervalRef.current = null;
      }
    };
  }, [setIsPlaying, setLastPlayed, setCurrentTrack, playNext, currentTrack]);

  // Hidden audio element
  return <audio ref={audioRef} />;
}
