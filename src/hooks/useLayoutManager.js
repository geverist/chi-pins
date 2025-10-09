// src/hooks/useLayoutManager.js
import { useCallback } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * Layout management hook that handles collision detection and auto-spacing
 * Ensures widgets don't overlap and intelligently redistributes space
 */
export function useLayoutManager() {
  const { settings: adminSettings } = useAdminSettings();

  const verticalIncrement = adminSettings.layoutVerticalIncrement || 10;

  /**
   * Get all widgets in a specific grid cell
   */
  const getWidgetsInCell = useCallback((cellName, allPositions) => {
    return Object.entries(allPositions)
      .filter(([_, pos]) => pos.gridCell === cellName)
      .map(([id, pos]) => ({ id, ...pos }))
      .sort((a, b) => a.offsetY - b.offsetY); // Sort by vertical position
  }, []);

  /**
   * Check if a position would cause a collision
   * Returns true if collision detected
   */
  const checkCollision = useCallback((elementId, newPosition, allPositions, elementHeight = 100) => {
    const widgetsInCell = getWidgetsInCell(newPosition.gridCell, allPositions);

    // Remove current element from collision check
    const otherWidgets = widgetsInCell.filter(w => w.id !== elementId);

    // Check if new position overlaps with any other widget
    const newTop = newPosition.offsetY;
    const newBottom = newTop + elementHeight;

    for (const widget of otherWidgets) {
      const widgetTop = widget.offsetY;
      const widgetBottom = widgetTop + elementHeight;

      // Check for overlap
      if (
        (newTop >= widgetTop && newTop < widgetBottom) ||
        (newBottom > widgetTop && newBottom <= widgetBottom) ||
        (newTop <= widgetTop && newBottom >= widgetBottom)
      ) {
        return true; // Collision detected
      }
    }

    return false;
  }, [getWidgetsInCell]);

  /**
   * Find the nearest valid position (snap to available space)
   * Returns adjusted position or null if no space available
   */
  const findNearestValidPosition = useCallback((
    elementId,
    desiredPosition,
    allPositions,
    elementHeight = 100,
    cellHeight = window.innerHeight
  ) => {
    const widgetsInCell = getWidgetsInCell(desiredPosition.gridCell, allPositions)
      .filter(w => w.id !== elementId);

    // If no other widgets, place at desired position
    if (widgetsInCell.length === 0) {
      return {
        ...desiredPosition,
        offsetY: Math.max(0, Math.min(desiredPosition.offsetY, cellHeight - elementHeight))
      };
    }

    // Build list of available gaps
    const gaps = [];

    // Gap at the top
    if (widgetsInCell[0].offsetY >= elementHeight) {
      gaps.push({
        start: 0,
        end: widgetsInCell[0].offsetY,
        size: widgetsInCell[0].offsetY
      });
    }

    // Gaps between widgets
    for (let i = 0; i < widgetsInCell.length - 1; i++) {
      const current = widgetsInCell[i];
      const next = widgetsInCell[i + 1];
      const gapStart = current.offsetY + elementHeight;
      const gapEnd = next.offsetY;
      const gapSize = gapEnd - gapStart;

      if (gapSize >= elementHeight) {
        gaps.push({ start: gapStart, end: gapEnd, size: gapSize });
      }
    }

    // Gap at the bottom
    const lastWidget = widgetsInCell[widgetsInCell.length - 1];
    const bottomGapStart = lastWidget.offsetY + elementHeight;
    const bottomGapSize = cellHeight - bottomGapStart;

    if (bottomGapSize >= elementHeight) {
      gaps.push({
        start: bottomGapStart,
        end: cellHeight,
        size: bottomGapSize
      });
    }

    // No available gaps
    if (gaps.length === 0) {
      console.warn(`[LayoutManager] No space available in cell ${desiredPosition.gridCell}`);
      return null;
    }

    // Find the gap closest to desired position
    const desiredY = desiredPosition.offsetY;
    let closestGap = gaps[0];
    let closestDistance = Math.abs(desiredY - closestGap.start);

    for (const gap of gaps) {
      const distanceToStart = Math.abs(desiredY - gap.start);
      const distanceToMiddle = Math.abs(desiredY - (gap.start + gap.size / 2));
      const minDistance = Math.min(distanceToStart, distanceToMiddle);

      if (minDistance < closestDistance) {
        closestDistance = minDistance;
        closestGap = gap;
      }
    }

    // Snap to increment within the gap
    let snappedY = Math.round(desiredY / verticalIncrement) * verticalIncrement;

    // Clamp to gap bounds
    snappedY = Math.max(closestGap.start, Math.min(snappedY, closestGap.end - elementHeight));

    return {
      ...desiredPosition,
      offsetY: snappedY
    };
  }, [getWidgetsInCell, verticalIncrement]);

  /**
   * Auto-redistribute widgets in a cell to use available space evenly
   */
  const redistributeWidgets = useCallback((cellName, allPositions, elementHeight = 100, cellHeight = window.innerHeight) => {
    const widgetsInCell = getWidgetsInCell(cellName, allPositions);

    if (widgetsInCell.length <= 1) {
      return allPositions; // Nothing to redistribute
    }

    const availableHeight = cellHeight - (widgetsInCell.length * elementHeight);
    const spacing = availableHeight / (widgetsInCell.length + 1);

    const updatedPositions = { ...allPositions };

    widgetsInCell.forEach((widget, index) => {
      const newOffsetY = Math.round(((index + 1) * spacing + index * elementHeight) / verticalIncrement) * verticalIncrement;

      updatedPositions[widget.id] = {
        ...updatedPositions[widget.id],
        offsetY: newOffsetY
      };
    });

    return updatedPositions;
  }, [getWidgetsInCell, verticalIncrement]);

  /**
   * Get available cells that have space for a new widget
   */
  const getAvailableCells = useCallback((allPositions, elementHeight = 100) => {
    const gridLayout = adminSettings.layoutGridType || '2x3';
    let cellNames = [];

    switch (gridLayout) {
      case '2x2':
        cellNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        break;
      case '2x3':
        cellNames = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
        break;
      case '3-2-3':
        cellNames = ['left-top', 'left-middle', 'left-bottom', 'center-top', 'center-bottom', 'right-top', 'right-middle', 'right-bottom'];
        break;
      default:
        cellNames = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
    }

    const cellHeight = window.innerHeight / 2; // Simplified, should match grid calculation

    return cellNames.filter(cellName => {
      const widgetsInCell = getWidgetsInCell(cellName, allPositions);
      const occupiedHeight = widgetsInCell.length * elementHeight;
      return occupiedHeight + elementHeight <= cellHeight;
    });
  }, [adminSettings.layoutGridType, getWidgetsInCell]);

  return {
    checkCollision,
    findNearestValidPosition,
    redistributeWidgets,
    getWidgetsInCell,
    getAvailableCells,
  };
}
