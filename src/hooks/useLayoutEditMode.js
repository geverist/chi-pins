// src/hooks/useLayoutEditMode.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * Hook to manage layout edit mode - allows dragging UI elements to new positions
 * Activated via button in Admin Panel under Kiosk tab
 * Position format: { section: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', offsetY: number }
 * Note: Center sections are reserved for overlays/search, widgets snap to left/right corners
 */
export function useLayoutEditMode() {
  const [isEditMode, setIsEditMode] = useState(false);
  const { settings, save } = useAdminSettings();

  // Save position for a specific element
  const savePosition = useCallback((elementId, position) => {
    const isMobile = window.innerWidth <= 768;
    const deviceKey = isMobile ? 'mobile' : 'desktop';

    const updatedPositions = {
      ...settings.uiPositions,
      [deviceKey]: {
        ...settings.uiPositions?.[deviceKey],
        [elementId]: position,
      },
    };

    save({ uiPositions: updatedPositions });
    console.log('[LayoutEditMode] Saved position for', elementId, ':', position);
  }, [settings.uiPositions, save]);

  // Get saved position for an element
  const getPosition = useCallback((elementId) => {
    const isMobile = window.innerWidth <= 768;
    const deviceKey = isMobile ? 'mobile' : 'desktop';
    return settings.uiPositions?.[deviceKey]?.[elementId] || null;
  }, [settings.uiPositions]);

  // Get all saved positions for current device (for collision detection)
  const getAllPositions = useCallback(() => {
    const isMobile = window.innerWidth <= 768;
    const deviceKey = isMobile ? 'mobile' : 'desktop';
    return settings.uiPositions?.[deviceKey] || {};
  }, [settings.uiPositions]);

  return {
    isEditMode,
    setIsEditMode,
    savePosition,
    getPosition,
    getAllPositions,
  };
}
