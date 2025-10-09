// src/components/DraggableEditWrapper.jsx
import { useEffect, useRef, useState } from 'react';
import { useLayoutStack } from '../hooks/useLayoutStack';
import { useAdminSettings } from '../state/useAdminSettings';
import { useLayoutManager } from '../hooks/useLayoutManager';

/**
 * Wrapper that makes child elements draggable in edit mode with grid-based positioning
 * Supports multiple grid layouts configured in admin settings
 * Includes collision detection and auto-spacing
 * Position format: { gridCell: string, offsetY: number }
 */
export default function DraggableEditWrapper({
  children,
  elementId,
  isEditMode,
  savedPosition,
  onPositionChange,
  defaultPosition = { gridCell: 'right-bottom', offsetY: 0 },
  getAllPositions, // Function to get all widget positions for collision detection
}) {
  const elementRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(savedPosition || defaultPosition);
  const [collisionWarning, setCollisionWarning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const { layout } = useLayoutStack();
  const { settings: adminSettings } = useAdminSettings();
  const { findNearestValidPosition, checkCollision } = useLayoutManager();

  // Grid layout configuration from admin settings
  const gridLayout = adminSettings.layoutGridType || '2x3'; // Default: 6 sections (2 rows x 3 cols)
  const verticalIncrement = adminSettings.layoutVerticalIncrement || 10; // Snap to 10px increments

  // Update position when saved position changes
  useEffect(() => {
    if (savedPosition) {
      setPosition(savedPosition);
    }
  }, [savedPosition]);

  // Get grid cell definitions based on layout type
  const getGridCells = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    switch (gridLayout) {
      case '2x2': // 4 quadrants
        return {
          'top-left': { x: 0, y: 0, width: width / 2, height: height / 2 },
          'top-right': { x: width / 2, y: 0, width: width / 2, height: height / 2 },
          'bottom-left': { x: 0, y: height / 2, width: width / 2, height: height / 2 },
          'bottom-right': { x: width / 2, y: height / 2, width: width / 2, height: height / 2 },
        };

      case '2x3': // 6 sections (2 rows x 3 cols)
        return {
          'top-left': { x: 0, y: 0, width: width / 3, height: height / 2 },
          'top-center': { x: width / 3, y: 0, width: width / 3, height: height / 2 },
          'top-right': { x: (width * 2) / 3, y: 0, width: width / 3, height: height / 2 },
          'bottom-left': { x: 0, y: height / 2, width: width / 3, height: height / 2 },
          'bottom-center': { x: width / 3, y: height / 2, width: width / 3, height: height / 2 },
          'bottom-right': { x: (width * 2) / 3, y: height / 2, width: width / 3, height: height / 2 },
        };

      case '3-2-3': // 8 sections (3 left, 2 middle, 3 right)
        const leftWidth = width * 0.3;
        const middleWidth = width * 0.4;
        const rightWidth = width * 0.3;
        const topHeight = height / 3;
        const middleHeight = height / 3;
        const bottomHeight = height / 3;

        return {
          'left-top': { x: 0, y: 0, width: leftWidth, height: topHeight },
          'left-middle': { x: 0, y: topHeight, width: leftWidth, height: middleHeight },
          'left-bottom': { x: 0, y: topHeight + middleHeight, width: leftWidth, height: bottomHeight },
          'center-top': { x: leftWidth, y: 0, width: middleWidth, height: height / 2 },
          'center-bottom': { x: leftWidth, y: height / 2, width: middleWidth, height: height / 2 },
          'right-top': { x: leftWidth + middleWidth, y: 0, width: rightWidth, height: topHeight },
          'right-middle': { x: leftWidth + middleWidth, y: topHeight, width: rightWidth, height: middleHeight },
          'right-bottom': { x: leftWidth + middleWidth, y: topHeight + middleHeight, width: rightWidth, height: bottomHeight },
        };

      default:
        // Default to 2x3
        return getGridCells.call(this, '2x3');
    }
  };

  // Determine which grid cell contains a point
  const getGridCellFromCoords = (x, y) => {
    const cells = getGridCells();

    for (const [cellName, bounds] of Object.entries(cells)) {
      if (
        x >= bounds.x &&
        x < bounds.x + bounds.width &&
        y >= bounds.y &&
        y < bounds.y + bounds.height
      ) {
        return cellName;
      }
    }

    // Fallback to nearest cell
    return Object.keys(cells)[0];
  };

  // Handle drag start
  const handleDragStart = (e) => {
    if (!isEditMode) return;

    const touch = e.touches ? e.touches[0] : e;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    setIsDragging(true);
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging || !isEditMode) return;

    const touch = e.touches ? e.touches[0] : e;
    const cells = getGridCells();

    // Determine current grid cell
    const newGridCell = getGridCellFromCoords(touch.clientX, touch.clientY);
    const cellBounds = cells[newGridCell];

    // Calculate offsetY within the cell (snapped to increments)
    const yInCell = touch.clientY - cellBounds.y;
    const snappedOffsetY = Math.round(yInCell / verticalIncrement) * verticalIncrement;

    // Clamp to cell bounds
    const maxOffset = cellBounds.height - 100; // Leave room for element
    const clampedOffsetY = Math.max(0, Math.min(maxOffset, snappedOffsetY));

    const newPosition = {
      gridCell: newGridCell,
      offsetY: clampedOffsetY,
    };

    setPosition(newPosition);
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drag end
  const handleDragEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    // Get all current widget positions
    const allPositions = getAllPositions ? getAllPositions() : {};

    // Check for collision and find nearest valid position
    const elementHeight = elementRef.current?.offsetHeight || 100;
    const cellHeight = window.innerHeight / 2; // Simplified

    const validPosition = findNearestValidPosition(
      elementId,
      position,
      allPositions,
      elementHeight,
      cellHeight
    );

    if (validPosition) {
      setPosition(validPosition);
      setCollisionWarning(false);

      // Save position
      if (onPositionChange) {
        onPositionChange(elementId, validPosition);
      }
    } else {
      // No space available - show warning and revert
      setCollisionWarning(true);
      setTimeout(() => setCollisionWarning(false), 2000);

      // Revert to saved position
      if (savedPosition) {
        setPosition(savedPosition);
      }
    }

    e.preventDefault();
    e.stopPropagation();
  };

  // Set up drag listeners
  useEffect(() => {
    if (!isEditMode) return;

    const element = elementRef.current;
    if (!element) return;

    const cleanup = [];

    // Touch events
    element.addEventListener('touchstart', handleDragStart, { passive: false });
    cleanup.push(() => element.removeEventListener('touchstart', handleDragStart));

    if (isDragging) {
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd, { passive: false });
      cleanup.push(() => window.removeEventListener('touchmove', handleDragMove));
      cleanup.push(() => window.removeEventListener('touchend', handleDragEnd));
    }

    // Mouse events for desktop testing
    element.addEventListener('mousedown', handleDragStart);
    cleanup.push(() => element.removeEventListener('mousedown', handleDragStart));

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      cleanup.push(() => window.removeEventListener('mousemove', handleDragMove));
      cleanup.push(() => window.removeEventListener('mouseup', handleDragEnd));
    }

    return () => {
      cleanup.forEach(fn => fn());
    };
  }, [isEditMode, isDragging]);

  // Calculate final position based on grid cell and offset
  const calculateFinalPosition = () => {
    const { gridCell, offsetY } = position;
    const cells = getGridCells();
    const cellBounds = cells[gridCell] || cells[Object.keys(cells)[0]];

    const baseStyle = {
      position: 'fixed',
      cursor: isEditMode ? 'move' : 'auto',
      zIndex: isEditMode ? 10000 : 800,
      transition: isDragging ? 'none' : 'all 0.3s ease',
      left: `${cellBounds.x + 20}px`, // 20px padding from cell edge
      top: `${cellBounds.y + offsetY}px`,
      ...(isEditMode && {
        outline: collisionWarning
          ? '3px solid rgba(239, 68, 68, 0.9)'
          : '3px solid rgba(59, 130, 246, 0.8)',
        boxShadow: collisionWarning
          ? '0 0 30px rgba(239, 68, 68, 0.7)'
          : '0 0 30px rgba(59, 130, 246, 0.5)',
      }),
    };

    return baseStyle;
  };

  const finalPosition = calculateFinalPosition();
  const cells = getGridCells();
  const currentCell = cells[position.gridCell] || cells[Object.keys(cells)[0]];

  return (
    <div ref={elementRef} style={finalPosition}>
      {children}
      {isEditMode && (
        <>
          {/* Label with element ID, grid cell, and offset */}
          <div
            style={{
              position: 'absolute',
              top: -35,
              left: 0,
              right: 0,
              background: collisionWarning ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px 6px 0 0',
              fontSize: '13px',
              fontWeight: 'bold',
              textAlign: 'center',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {collisionWarning ? '⚠️ No Space Available' : elementId}
            <div style={{ fontSize: '11px', fontWeight: 'normal', opacity: 0.9, marginTop: '2px' }}>
              {collisionWarning ? 'Snapped to nearest valid position' : `${position.gridCell} • Y: ${position.offsetY}px`}
            </div>
          </div>

          {/* Drag handle */}
          <div
            style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(59, 130, 246, 0.95)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'move',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              pointerEvents: 'none',
            }}
          >
            ✥
          </div>

          {/* Vertical positioning indicator */}
          <div
            style={{
              position: 'absolute',
              right: -60,
              top: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none',
              padding: '10px 0',
            }}
          >
            <div style={{ fontSize: '20px', color: 'rgba(59, 130, 246, 0.9)' }}>⬆️</div>
            <div style={{
              fontSize: '11px',
              color: 'rgba(59, 130, 246, 0.9)',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
            }}>
              {verticalIncrement}px
            </div>
            <div style={{ fontSize: '20px', color: 'rgba(59, 130, 246, 0.9)' }}>⬇️</div>
          </div>
        </>
      )}
    </div>
  );
}
