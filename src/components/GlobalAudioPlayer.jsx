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
    if (!currentTrack || !audioRef.current) return;

    const audio = audioRef.current;

    // Determine the source URL based on track type
    let sourceUrl = currentTrack.url;

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
        console.log('GlobalAudioPlayer - no more tracks in queue, clearing current track');
        // No next track, save current as last played and clear current
        if (currentTrack) {
          setLastPlayed(currentTrack);
        }
        setCurrentTrack(null);
      }
    };

    const handleError = (e) => {
      console.error('GlobalAudioPlayer - audio error:', e);
      setIsPlaying(false);
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
