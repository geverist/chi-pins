// src/state/useNowPlaying.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NowPlayingContext = createContext();

export function NowPlayingProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);

  // Load initial state from Supabase
  useEffect(() => {
    loadPlaybackState();
    loadQueue();

    // Subscribe to playback state changes
    const playbackChannel = supabase
      .channel('music_playback_state_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'music_playback_state'
      }, (payload) => {
        console.log('Playback state changed:', payload);
        if (payload.new) {
          setCurrentTrack(payload.new.current_track_url ? {
            url: payload.new.current_track_url,
            title: payload.new.current_track_title,
            artist: payload.new.current_track_artist,
            album: payload.new.current_track_album,
          } : null);
          setLastPlayed(payload.new.last_played_url ? {
            url: payload.new.last_played_url,
            title: payload.new.last_played_title,
            artist: payload.new.last_played_artist,
            album: payload.new.last_played_album,
          } : null);
          setIsPlaying(payload.new.is_playing);
        }
      })
      .subscribe();

    // Subscribe to queue changes
    const queueChannel = supabase
      .channel('music_queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'music_queue'
      }, () => {
        console.log('Queue changed, reloading...');
        loadQueue();
      })
      .subscribe();

    return () => {
      playbackChannel.unsubscribe();
      queueChannel.unsubscribe();
    };
  }, []);

  const loadPlaybackState = async () => {
    try {
      const { data, error } = await supabase
        .from('music_playback_state')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentTrack(data.current_track_url ? {
          url: data.current_track_url,
          title: data.current_track_title,
          artist: data.current_track_artist,
          album: data.current_track_album,
        } : null);
        setLastPlayed(data.last_played_url ? {
          url: data.last_played_url,
          title: data.last_played_title,
          artist: data.last_played_artist,
          album: data.last_played_album,
        } : null);
        setIsPlaying(data.is_playing);
      }
    } catch (err) {
      console.error('Failed to load playback state:', err);
    }
  };

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('music_queue')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;
      setQueue((data || []).map(item => ({
        url: item.track_url,
        title: item.track_title,
        artist: item.track_artist,
        album: item.track_album,
      })));
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  };

  const updatePlaybackState = async (updates) => {
    try {
      const { error } = await supabase
        .from('music_playback_state')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update playback state:', err);
    }
  };

  const setCurrentTrackShared = useCallback((track) => {
    setCurrentTrack(track);
    updatePlaybackState({
      current_track_url: track?.url || null,
      current_track_title: track?.title || null,
      current_track_artist: track?.artist || null,
      current_track_album: track?.album || null,
    });
  }, []);

  const setLastPlayedShared = useCallback((track) => {
    setLastPlayed(track);
    updatePlaybackState({
      last_played_url: track?.url || null,
      last_played_title: track?.title || null,
      last_played_artist: track?.artist || null,
      last_played_album: track?.album || null,
    });
  }, []);

  const setIsPlayingShared = useCallback((playing) => {
    setIsPlaying(playing);
    updatePlaybackState({ is_playing: playing });
  }, []);

  const addToQueue = useCallback(async (track) => {
    try {
      // Get current max position
      const { data: maxData } = await supabase
        .from('music_queue')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const nextPosition = (maxData?.position ?? -1) + 1;

      const { error } = await supabase
        .from('music_queue')
        .insert({
          position: nextPosition,
          track_url: track.url,
          track_title: track.title,
          track_artist: track.artist || null,
          track_album: track.album || null,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to add to queue:', err);
    }
  }, []);

  const playNext = useCallback(async () => {
    try {
      // Get first item in queue
      const { data: queueData, error: queueError } = await supabase
        .from('music_queue')
        .select('*')
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (queueError || !queueData) return null;

      const nextTrack = {
        url: queueData.track_url,
        title: queueData.track_title,
        artist: queueData.track_artist,
        album: queueData.track_album,
      };

      // Update playback state
      await updatePlaybackState({
        last_played_url: currentTrack?.url || null,
        last_played_title: currentTrack?.title || null,
        last_played_artist: currentTrack?.artist || null,
        last_played_album: currentTrack?.album || null,
        current_track_url: nextTrack.url,
        current_track_title: nextTrack.title,
        current_track_artist: nextTrack.artist,
        current_track_album: nextTrack.album,
      });

      // Remove from queue
      await supabase
        .from('music_queue')
        .delete()
        .eq('id', queueData.id);

      // Reindex remaining queue items
      const { data: remaining } = await supabase
        .from('music_queue')
        .select('*')
        .order('position', { ascending: true });

      if (remaining && remaining.length > 0) {
        for (let i = 0; i < remaining.length; i++) {
          await supabase
            .from('music_queue')
            .update({ position: i })
            .eq('id', remaining[i].id);
        }
      }

      return nextTrack;
    } catch (err) {
      console.error('Failed to play next:', err);
      return null;
    }
  }, [currentTrack]);

  const clearQueue = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('music_queue')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  }, []);

  return (
    <NowPlayingContext.Provider value={{
      currentTrack,
      setCurrentTrack: setCurrentTrackShared,
      lastPlayed,
      setLastPlayed: setLastPlayedShared,
      isPlaying,
      setIsPlaying: setIsPlayingShared,
      queue,
      addToQueue,
      playNext,
      clearQueue,
    }}>
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying() {
  const context = useContext(NowPlayingContext);
  if (!context) {
    throw new Error('useNowPlaying must be used within NowPlayingProvider');
  }
  return context;
}
