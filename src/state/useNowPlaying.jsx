// src/state/useNowPlaying.jsx
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const NowPlayingContext = createContext();

// Local storage keys
const LS_CURRENT_TRACK = 'nowPlaying_currentTrack';
const LS_LAST_PLAYED = 'nowPlaying_lastPlayed';
const LS_IS_PLAYING = 'nowPlaying_isPlaying';
const LS_QUEUE = 'nowPlaying_queue';

export function NowPlayingProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(true);

  // Load from localStorage first for instant UI
  useEffect(() => {
    try {
      const cachedCurrent = localStorage.getItem(LS_CURRENT_TRACK);
      const cachedLast = localStorage.getItem(LS_LAST_PLAYED);
      const cachedPlaying = localStorage.getItem(LS_IS_PLAYING);
      const cachedQueue = localStorage.getItem(LS_QUEUE);

      if (cachedCurrent) setCurrentTrack(JSON.parse(cachedCurrent));
      if (cachedLast) setLastPlayed(JSON.parse(cachedLast));
      if (cachedPlaying) setIsPlaying(JSON.parse(cachedPlaying));
      if (cachedQueue) setQueue(JSON.parse(cachedQueue));
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
  }, []);

  // Load initial state from Supabase and set up subscriptions
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
        console.log('[useNowPlaying] Playback state changed:', payload);
        console.log('[useNowPlaying] Is online:', isOnlineRef.current);
        if (payload.new) {
          const current = payload.new.current_track_url ? {
            url: payload.new.current_track_url,
            title: payload.new.current_track_title,
            artist: payload.new.current_track_artist,
            album: payload.new.current_track_album,
          } : null;
          const last = payload.new.last_played_url ? {
            url: payload.new.last_played_url,
            title: payload.new.last_played_title,
            artist: payload.new.last_played_artist,
            album: payload.new.last_played_album,
          } : null;

          console.log('[useNowPlaying] Setting currentTrack:', current);
          console.log('[useNowPlaying] Setting isPlaying:', payload.new.is_playing);

          setCurrentTrack(current);
          setLastPlayed(last);
          setIsPlaying(payload.new.is_playing);

          // Update localStorage cache
          try {
            localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(current));
            localStorage.setItem(LS_LAST_PLAYED, JSON.stringify(last));
            localStorage.setItem(LS_IS_PLAYING, JSON.stringify(payload.new.is_playing));
          } catch (err) {
            console.error('Failed to cache playback state:', err);
          }
        }
      })
      .subscribe((status) => {
        console.log('[useNowPlaying] Playback channel subscription status:', status);
      });

    // Subscribe to queue changes
    const queueChannel = supabase
      .channel('music_queue_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'music_queue'
      }, () => {
        console.log('[useNowPlaying] Queue changed, reloading...');
        loadQueue();
      })
      .subscribe((status) => {
        console.log('[useNowPlaying] Queue channel subscription status:', status);
      });

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
        const current = data.current_track_url ? {
          url: data.current_track_url,
          title: data.current_track_title,
          artist: data.current_track_artist,
          album: data.current_track_album,
        } : null;
        const last = data.last_played_url ? {
          url: data.last_played_url,
          title: data.last_played_title,
          artist: data.last_played_artist,
          album: data.last_played_album,
        } : null;

        setCurrentTrack(current);
        setLastPlayed(last);
        setIsPlaying(data.is_playing);

        // Cache to localStorage
        try {
          localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(current));
          localStorage.setItem(LS_LAST_PLAYED, JSON.stringify(last));
          localStorage.setItem(LS_IS_PLAYING, JSON.stringify(data.is_playing));
        } catch (err) {
          console.error('Failed to cache playback state:', err);
        }

        setIsOnline(true);
        isOnlineRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load playback state:', err);
      setIsOnline(false);
      isOnlineRef.current = false;
      console.warn('Running in offline mode - using local cache');
    }
  };

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('music_queue')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      const queueData = (data || []).map(item => ({
        url: item.track_url,
        title: item.track_title,
        artist: item.track_artist,
        album: item.track_album,
      }));

      setQueue(queueData);

      // Cache to localStorage
      try {
        localStorage.setItem(LS_QUEUE, JSON.stringify(queueData));
      } catch (err) {
        console.error('Failed to cache queue:', err);
      }

      setIsOnline(true);
      isOnlineRef.current = true;
    } catch (err) {
      console.error('Failed to load queue:', err);
      setIsOnline(false);
      isOnlineRef.current = false;
      console.warn('Running in offline mode - using local cache');
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
    // Cache immediately
    try {
      localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(track));
    } catch (err) {
      console.error('Failed to cache current track:', err);
    }
    // Try to update Supabase
    updatePlaybackState({
      current_track_url: track?.url || null,
      current_track_title: track?.title || null,
      current_track_artist: track?.artist || null,
      current_track_album: track?.album || null,
    });
  }, []);

  const setLastPlayedShared = useCallback((track) => {
    setLastPlayed(track);
    // Cache immediately
    try {
      localStorage.setItem(LS_LAST_PLAYED, JSON.stringify(track));
    } catch (err) {
      console.error('Failed to cache last played:', err);
    }
    // Try to update Supabase
    updatePlaybackState({
      last_played_url: track?.url || null,
      last_played_title: track?.title || null,
      last_played_artist: track?.artist || null,
      last_played_album: track?.album || null,
    });
  }, []);

  const setIsPlayingShared = useCallback((playing) => {
    setIsPlaying(playing);
    // Cache immediately
    try {
      localStorage.setItem(LS_IS_PLAYING, JSON.stringify(playing));
    } catch (err) {
      console.error('Failed to cache playing state:', err);
    }
    // Try to update Supabase
    updatePlaybackState({ is_playing: playing });
  }, []);

  const addToQueue = useCallback(async (track) => {
    // Add to local state immediately for responsive UI
    setQueue(prev => {
      const updated = [...prev, track];
      try {
        localStorage.setItem(LS_QUEUE, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to cache queue:', err);
      }
      return updated;
    });

    // Try to sync with Supabase
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
      setIsOnline(true);
      isOnlineRef.current = true;
    } catch (err) {
      console.error('Failed to add to queue (offline mode):', err);
      setIsOnline(false);
      isOnlineRef.current = false;
    }
  }, []);

  const playNext = useCallback(async () => {
    // Handle offline mode - use local queue
    if (!isOnlineRef.current || queue.length === 0) {
      if (queue.length === 0) return null;

      const [nextTrack, ...remainingQueue] = queue;
      setLastPlayed(currentTrack);
      setCurrentTrack(nextTrack);
      setQueue(remainingQueue);

      // Update localStorage
      try {
        localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(nextTrack));
        localStorage.setItem(LS_LAST_PLAYED, JSON.stringify(currentTrack));
        localStorage.setItem(LS_QUEUE, JSON.stringify(remainingQueue));
      } catch (err) {
        console.error('Failed to cache playback changes:', err);
      }

      return nextTrack;
    }

    // Online mode - sync with Supabase
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

      setIsOnline(true);
      isOnlineRef.current = true;
      return nextTrack;
    } catch (err) {
      console.error('Failed to play next (offline mode):', err);
      setIsOnline(false);
      isOnlineRef.current = false;

      // Fallback to local queue
      if (queue.length > 0) {
        const [nextTrack, ...remainingQueue] = queue;
        setLastPlayed(currentTrack);
        setCurrentTrack(nextTrack);
        setQueue(remainingQueue);

        try {
          localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(nextTrack));
          localStorage.setItem(LS_LAST_PLAYED, JSON.stringify(currentTrack));
          localStorage.setItem(LS_QUEUE, JSON.stringify(remainingQueue));
        } catch (err) {
          console.error('Failed to cache playback changes:', err);
        }

        return nextTrack;
      }
      return null;
    }
  }, [currentTrack, queue]);

  const clearQueue = useCallback(async () => {
    // Clear local state immediately
    setQueue([]);
    try {
      localStorage.setItem(LS_QUEUE, JSON.stringify([]));
    } catch (err) {
      console.error('Failed to clear queue cache:', err);
    }

    // Try to sync with Supabase
    try {
      const { error } = await supabase
        .from('music_queue')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      setIsOnline(true);
      isOnlineRef.current = true;
    } catch (err) {
      console.error('Failed to clear queue (offline mode):', err);
      setIsOnline(false);
      isOnlineRef.current = false;
    }
  }, []);

  const stopAll = useCallback(async () => {
    // Stop playback and clear everything
    setIsPlaying(false);
    setCurrentTrack(null);
    await clearQueue();

    // Clear localStorage
    try {
      localStorage.setItem(LS_IS_PLAYING, JSON.stringify(false));
      localStorage.setItem(LS_CURRENT_TRACK, JSON.stringify(null));
      localStorage.setItem(LS_QUEUE, JSON.stringify([]));
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }

    // Update Supabase
    try {
      await updatePlaybackState({
        is_playing: false,
        current_track_url: null,
        current_track_title: null,
        current_track_artist: null,
        current_track_album: null,
      });
    } catch (err) {
      console.error('Failed to update playback state:', err);
    }
  }, [clearQueue]);

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
      stopAll,
      isOnline,
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
