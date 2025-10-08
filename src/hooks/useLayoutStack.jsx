// src/hooks/useLayoutStack.js
// Centralized layout stacking system - each component reports its height and gets its position
import { createContext, useContext, useState, useCallback } from 'react';

const LayoutStackContext = createContext(null);

export function LayoutStackProvider({ children }) {
  const [layout, setLayout] = useState({
    // Top stack (from top down)
    headerHeight: 60,
    commentsBannerHeight: 0,
    newsTickerHeight: 0,
    demoBannerHeight: 0,

    // Bottom stack (from bottom up)
    footerHeight: 80,
    downloadingBarHeight: 0,
    nowPlayingHeight: 0,
  });

  const updateHeight = useCallback((key, height) => {
    setLayout(prev => ({ ...prev, [key]: height }));
  }, []);

  // Calculate cumulative positions
  const getTopPosition = useCallback((afterElement) => {
    let position = 0;
    const order = ['headerHeight', 'demoBannerHeight', 'newsTickerHeight', 'commentsBannerHeight'];

    for (const key of order) {
      if (key === `${afterElement}Height`) break;
      position += layout[key] || 0;
    }

    return position;
  }, [layout]);

  const getBottomPosition = useCallback((afterElement) => {
    let position = 0;
    const order = ['downloadingBarHeight', 'nowPlayingHeight', 'footerHeight'];

    for (const key of order) {
      position += layout[key] || 0;
      if (key === `${afterElement}Height`) break;
    }

    return position;
  }, [layout]);

  const value = {
    layout,
    updateHeight,
    getTopPosition,
    getBottomPosition,
  };

  return (
    <LayoutStackContext.Provider value={value}>
      {children}
    </LayoutStackContext.Provider>
  );
}

export function useLayoutStack() {
  const context = useContext(LayoutStackContext);
  if (!context) {
    throw new Error('useLayoutStack must be used within LayoutStackProvider');
  }
  return context;
}
