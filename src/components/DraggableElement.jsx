// src/components/DraggableElement.jsx
import { useState, useRef, useEffect } from 'react';
import { useAdminSettings } from '../state/useAdminSettings';

/**
 * DraggableElement - Wrapper component that makes any UI element draggable in admin mode
 *
 * @param {string} elementId - Unique identifier for this UI element
 * @param {object} defaultPosition - Default position when no custom position is saved
 * @param {React.ReactNode} children - The UI element to wrap
 * @param {boolean} enabled - Whether dragging is enabled (admin layout mode)
 * @param {function} onPositionChange - Callback when position changes
 */
export default function DraggableElement({
  elementId,
  defaultPosition = {},
  children,
  enabled = false,
  onPositionChange,
  isMobile = false,
}) {
  const { settings: adminSettings } = useAdminSettings();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(null);
  const elementRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });

  // Get saved position from admin settings or use default
  useEffect(() => {
    const deviceKey = isMobile ? 'mobile' : 'desktop';
    const savedPosition = adminSettings.uiPositions?.[deviceKey]?.[elementId];

    if (savedPosition) {
      setPosition(savedPosition);
    } else {
      setPosition(defaultPosition);
    }
  }, [adminSettings.uiPositions, elementId, defaultPosition, isMobile]);

  const handleMouseDown = (e) => {
    if (!enabled) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = elementRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: rect.left,
      elementY: rect.top,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    if (!enabled) return;

    e.preventDefault();
    setIsDragging(true);

    const touch = e.touches[0];
    const rect = elementRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      elementX: rect.left,
      elementY: rect.top,
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newLeft = dragStartRef.current.elementX + deltaX;
    const newTop = dragStartRef.current.elementY + deltaY;

    setPosition({
      left: `${newLeft}px`,
      top: `${newTop}px`,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;

    const newLeft = dragStartRef.current.elementX + deltaX;
    const newTop = dragStartRef.current.elementY + deltaY;

    setPosition({
      left: `${newLeft}px`,
      top: `${newTop}px`,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Save position
    if (position && onPositionChange) {
      onPositionChange(elementId, position);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    // Save position
    if (position && onPositionChange) {
      onPositionChange(elementId, position);
    }
  };

  if (!position) {
    return null; // Wait for position to be loaded
  }

  return (
    <div
      ref={elementRef}
      style={{
        ...position,
        position: 'fixed',
        cursor: enabled ? (isDragging ? 'grabbing' : 'grab') : 'auto',
        userSelect: 'none',
        zIndex: isDragging ? 10000 : position.zIndex || 'auto',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        outline: enabled ? '2px dashed rgba(102, 126, 234, 0.5)' : 'none',
        outlineOffset: enabled ? '4px' : '0',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Label when in admin mode */}
      {enabled && (
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '0',
            background: 'rgba(102, 126, 234, 0.9)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {elementId}
        </div>
      )}
      {children}
    </div>
  );
}
