// src/hooks/useLayoutEditor.js
import { useCallback } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * useLayoutEditor - Hook to manage layout editor state and position updates
 *
 * Returns:
 * - isEditorActive: Whether the layout editor is currently active
 * - handlePositionChange: Function to save position changes
 * - isMobile: Current device mode
 */
export function useLayoutEditor(isMobile = false) {
  const { settings: adminSettings, save } = useAdminSettings();

  const isEditorActive = adminSettings.layoutEditorEnabled || false;

  const handlePositionChange = useCallback((elementId, position) => {
    const currentPositions = adminSettings.uiPositions || { desktop: {}, mobile: {} };
    const deviceKey = isMobile ? 'mobile' : 'desktop';

    const updatedPositions = {
      ...currentPositions,
      [deviceKey]: {
        ...currentPositions[deviceKey],
        [elementId]: position,
      },
    };

    save({ uiPositions: updatedPositions });
    console.log(`[useLayoutEditor] Saved position for ${elementId} on ${deviceKey}:`, position);
  }, [adminSettings.uiPositions, isMobile, save]);

  return {
    isEditorActive,
    handlePositionChange,
    isMobile,
  };
}
