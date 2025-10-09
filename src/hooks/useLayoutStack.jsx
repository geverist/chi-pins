// src/hooks/useLayoutStack.js
// Centralized layout stacking system - each component reports its height and gets its position
// Includes space validation to prevent layout conflicts
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LayoutStackContext = createContext(null);

// Typical screen height on kiosk (1080p)
const TYPICAL_SCREEN_HEIGHT = 1080;
// Minimum usable map area (50% of screen)
const MIN_MAP_AREA = TYPICAL_SCREEN_HEIGHT * 0.5;
// Padding between elements
const ELEMENT_PADDING = 8;

export function LayoutStackProvider({ children }) {
  const [layout, setLayout] = useState({
    // Persistent elements (always present)
    headerHeight: 60,
    footerHeight: 0, // Footer only shows when navigation items enabled

    // Top stack elements (configurable position and order)
    commentsBannerHeight: 0,
    newsTickerHeight: 0,
    demoBannerHeight: 0,

    // Bottom stack elements (configurable position and order)
    downloadingBarHeight: 0,
    nowPlayingHeight: 0,
  });

  // Configuration for element positions (top/bottom) and order
  // This will come from admin settings
  const [elementConfig, setElementConfig] = useState({
    commentsBanner: { position: 'top', order: 1, enabled: false },
    newsTicker: { position: 'top', order: 2, enabled: false },
    demoBanner: { position: 'top', order: 3, enabled: false },
    downloadingBar: { position: 'bottom', order: 1, enabled: false },
    nowPlaying: { position: 'bottom', order: 2, enabled: false },
  });

  const updateHeight = useCallback((key, height) => {
    setLayout(prev => ({ ...prev, [key]: height }));
  }, []);

  const updateElementConfig = useCallback((elementName, config) => {
    setElementConfig(prev => ({ ...prev, [elementName]: { ...prev[elementName], ...config } }));
  }, []);

  // Get ordered elements for top or bottom
  const getOrderedElements = useCallback((position) => {
    return Object.entries(elementConfig)
      .filter(([_, config]) => config.position === position && config.enabled)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name]) => name);
  }, [elementConfig]);

  // Calculate total height used by top elements
  const topStackHeight = useMemo(() => {
    let total = layout.headerHeight || 0;
    getOrderedElements('top').forEach(element => {
      const heightKey = `${element}Height`;
      total += (layout[heightKey] || 0) + ELEMENT_PADDING;
    });
    return total;
  }, [layout, getOrderedElements]);

  // Calculate total height used by bottom elements
  const bottomStackHeight = useMemo(() => {
    let total = layout.footerHeight || 0;
    getOrderedElements('bottom').forEach(element => {
      const heightKey = `${element}Height`;
      total += (layout[heightKey] || 0) + ELEMENT_PADDING;
    });
    return total;
  }, [layout, getOrderedElements]);

  // Calculate available space for map/content
  const availableMapHeight = useMemo(() => {
    return TYPICAL_SCREEN_HEIGHT - topStackHeight - bottomStackHeight;
  }, [topStackHeight, bottomStackHeight]);

  // Check if adding a new element would violate space constraints
  const canEnableElement = useCallback((elementName, estimatedHeight = 60) => {
    const newTotalHeight = topStackHeight + bottomStackHeight + estimatedHeight + ELEMENT_PADDING;
    const newAvailableSpace = TYPICAL_SCREEN_HEIGHT - newTotalHeight;

    if (newAvailableSpace < MIN_MAP_AREA) {
      console.warn(`[LayoutStack] Cannot enable ${elementName}: would reduce map area to ${newAvailableSpace}px (min: ${MIN_MAP_AREA}px)`);
      return false;
    }

    return true;
  }, [topStackHeight, bottomStackHeight]);

  // Get cumulative position from top
  const getTopPosition = useCallback((afterElement) => {
    let position = layout.headerHeight || 0;
    const orderedElements = getOrderedElements('top');

    for (const element of orderedElements) {
      if (element === afterElement) break;
      const heightKey = `${element}Height`;
      position += (layout[heightKey] || 0) + ELEMENT_PADDING;
    }

    return position;
  }, [layout, getOrderedElements]);

  // Get cumulative position from bottom
  const getBottomPosition = useCallback((afterElement) => {
    let position = layout.footerHeight || 0;
    const orderedElements = getOrderedElements('bottom');

    for (const element of orderedElements) {
      const heightKey = `${element}Height`;
      position += (layout[heightKey] || 0) + ELEMENT_PADDING;
      if (element === afterElement) break;
    }

    return position;
  }, [layout, getOrderedElements]);

  const value = {
    layout,
    updateHeight,
    elementConfig,
    updateElementConfig,
    getTopPosition,
    getBottomPosition,
    topStackHeight,
    bottomStackHeight,
    availableMapHeight,
    canEnableElement,
    getOrderedElements,
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
