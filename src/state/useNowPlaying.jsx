// src/state/useNowPlaying.js
import { createContext, useContext, useState, useCallback } from 'react';

const NowPlayingContext = createContext();

export function NowPlayingProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);

  const addToQueue = useCallback((track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length > 0) {
      const [nextTrack, ...remainingQueue] = queue;
      setCurrentTrack(nextTrack);
      setQueue(remainingQueue);
      return nextTrack;
    }
    return null;
  }, [queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return (
    <NowPlayingContext.Provider value={{
      currentTrack,
      setCurrentTrack,
      isPlaying,
      setIsPlaying,
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
