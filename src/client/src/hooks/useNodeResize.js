import { useState, useEffect, useRef } from 'react';
import { useNodeId } from 'reactflow';

/**
 * Shared hook for node resize functionality
 * @param {Object} data - Node data object
 * @param {number} minWidth - Minimum width in pixels
 * @param {number} minHeight - Minimum height in pixels
 * @param {Object} initialSize - Initial size { width, height }
 * @returns {Object} { nodeSize, isResizing, resizeHandleRef, nodeRef, resizeStyles }
 */
export function useNodeResize(data, minWidth = 200, minHeight = 150, initialSize = null) {
  const nodeId = useNodeId();
  const nodeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const onSizeChangeRef = useRef(data.onSizeChange);

  // Update ref when data.onSizeChange changes
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // Node size state
  const [nodeSize, setNodeSize] = useState(() => ({
    width: data.width || initialSize?.width || minWidth,
    height: data.height || initialSize?.height || minHeight,
  }));
  const [isResizing, setIsResizing] = useState(false);

  // Update parent node data when size changes
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]);

  // Resize handling - use capture phase and prevent default
  const handleResizeMouseDown = (e) => {
    // Only left button
    if (e.button !== 0) return;

    // Prevent React Flow from capturing this event
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeSize.width;
    const startHeight = nodeSize.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(minWidth, startWidth + deltaX);
      const newHeight = Math.max(minHeight, startHeight + deltaY);

      setNodeSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Styles for resizable container
  const resizeStyles = {
    width: `${nodeSize.width}px`,
    minHeight: `${nodeSize.height}px`,
    position: 'relative',
    userSelect: isResizing ? 'none' : 'auto',
  };

  // Resize handle styles (ComfyUI style)
  const getResizeHandleStyles = (color = '#10b981') => ({
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '16px',
    height: '16px',
    cursor: 'nwse-resize',
    background: `linear-gradient(135deg, transparent 50%, ${color} 50%)`,
    borderRadius: '0 0 6px 0',
    opacity: '0.6',
    transition: 'opacity 0.2s',
  });

  return {
    nodeSize,
    isResizing,
    resizeHandleRef,
    nodeRef,
    handleResizeMouseDown,
    resizeStyles,
    getResizeHandleStyles,
  };
}
