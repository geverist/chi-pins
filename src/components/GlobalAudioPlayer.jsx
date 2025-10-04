// src/components/GlobalAudioPlayer.jsx
// Hidden audio player that persists globally for continuous playback
import { useEffect, useRef } from 'react';
import { useNowPlaying } from '../state/useNowPlaying.jsx';
import { useAdminSettings } from '../state/useAdminSettings';

export default function GlobalAudioPlayer() {
  const audioRef = useRef(null);
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

    // Handle Bluetooth device selection if configured
    const playAudio = async () => {
      try {
        if (adminSettings.audioOutputType === 'bluetooth' && 'setSinkId' in audio) {
          if (adminSettings.bluetoothDeviceId) {
            await audio.setSinkId(adminSettings.bluetoothDeviceId);
          }
        }
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
    };

    const handlePause = () => {
      console.log('GlobalAudioPlayer - pause event');
      setIsPlaying(false);
    };

    const handleEnded = async () => {
      console.log('GlobalAudioPlayer - track ended, trying next...');
      setIsPlaying(false);

      const nextTrack = await playNext();
      if (nextTrack) {
        console.log('GlobalAudioPlayer - playing next track:', nextTrack.title);
        // playNext already handles state updates
      } else {
        console.log('GlobalAudioPlayer - no more tracks in queue, clearing everything');
        // No next track, save current as last played and clear current
        if (currentTrack) {
          setLastPlayed(currentTrack);
        }
        setCurrentTrack(null);
        // Ensure queue is cleared in state (should already be empty from playNext)
        // This ensures the UI updates properly
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
    };
  }, [setIsPlaying, setLastPlayed, setCurrentTrack, playNext, currentTrack]);

  // Hidden audio element
  return <audio ref={audioRef} />;
}
