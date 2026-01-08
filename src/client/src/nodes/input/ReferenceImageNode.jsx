import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

function ReferenceImageNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getEdges, edges } = useReactFlow();

  const [images, setImages] = useState(data.images || []);
  const [inputValue, setInputValue] = useState('');
  // ⭐ 关键修复：从 data.selectedImages 恢复选中状态（支持工作流加载）
  const [selectedImages, setSelectedImages] = useState(() => {
    if (data.selectedImages && Array.isArray(data.selectedImages)) {
      return new Set(data.selectedImages);
    }
    return new Set();
  });
  const [selectionMode, setSelectionMode] = useState('select'); // 'select' | 'preview'
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    240, // minWidth
    280, // minHeight (increased for mode buttons)
    { width: 260, height: 300 } // initialSize
  );

  // ⭐ 关键修复：当 data.selectedImages 变化时（加载工作流），恢复选中状态
  useEffect(() => {
    if (data.selectedImages && Array.isArray(data.selectedImages)) {
      const newSet = new Set(data.selectedImages);
      // 只在实际变化时更新（避免无限循环）
      if (newSet.size !== selectedImages.size ||
          ![...newSet].every(url => selectedImages.has(url))) {
        setSelectedImages(newSet);
      }
    }
  }, [data.selectedImages]);

  // ⭐ 合并后的 useEffect：同时更新自己的 images/selectedImages 和目标节点的 connectedImages
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      const imageUrls = images.filter(img => selectedImages.has(img));
      const selectedArray = Array.from(selectedImages);

      // ⚡ 一次 setNodes 调用同时更新自己和目标节点
      setNodes((nds) =>
        nds.map((node) => {
          // 更新自己的 images 和 selectedImages（用于工作流恢复）
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                images,
                selectedImages: selectedArray
              }
            };
          }

          // 更新目标节点的 connectedImages
          const isConnected = outgoingEdges.some(e => e.target === node.id);
          if (isConnected) {
            return {
              ...node,
              data: { ...node.data, connectedImages: imageUrls }
            };
          }

          return node;
        })
      );
    }
  }, [selectedImages, images, nodeId, getEdges, setNodes, edges]); // ⭐ 添加 edges

  const addImage = () => {
    if (inputValue.trim() && !images.includes(inputValue.trim())) {
      const newImages = [...images, inputValue.trim()];
      setImages(newImages);
      if (data.onImagesChange) {
        data.onImagesChange(newImages);
      }
      setInputValue('');
    }
  };

  const removeImage = (indexToRemove) => {
    const newImages = images.filter((_, index) => index !== indexToRemove);
    setImages(newImages);
    // Remove from selection if present
    const removedUrl = images[indexToRemove];
    if (selectedImages.has(removedUrl)) {
      const newSelected = new Set(selectedImages);
      newSelected.delete(removedUrl);
      setSelectedImages(newSelected);
    }
    if (data.onImagesChange) {
      data.onImagesChange(newImages);
    }
  };

  // ⭐ Toggle image selection (select mode)
  const toggleImageSelection = (url) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedImages(newSelected);
  };

  // ⭐ Open preview modal (preview mode)
  const openPreview = (url) => {
    setPreviewImage(url);
    setShowPreview(true);
  };

  // ⭐ Close preview modal
  const closePreview = () => {
    setShowPreview(false);
    setPreviewImage(null);
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#8b5cf6',
      borderStyle: 'solid',
      backgroundColor: '#f5f3ff',
      ...resizeStyles,
    }}>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="images-output"
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#5b21b6',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🖼️ {data.label || '参考图片'}
      </div>

      {/* ⭐ Mode Toggle Buttons */}
      <div className="nodrag" style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          className="nodrag"
          onClick={() => setSelectionMode('select')}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'select' ? '#10b981' : '#e5e7eb',
            color: selectionMode === 'select' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          title="多选图片传送到视频节点"
        >
          ✓ 选择模式
        </button>
        <button
          className="nodrag"
          onClick={() => setSelectionMode('preview')}
          style={{
            flex: 1,
            padding: '4px',
            fontSize: '10px',
            backgroundColor: selectionMode === 'preview' ? '#3b82f6' : '#e5e7eb',
            color: selectionMode === 'preview' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          title="点击图片查看大图"
        >
          👁️ 预览模式
        </button>
      </div>

      {/* Input for Image URL */}
      <div className="nodrag" style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <input
          id="image-url-input"
          name="imageUrl"
          className="nodrag"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addImage()}
          placeholder="图片 URL..."
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #c4b5fd',
            fontSize: '11px',
          }}
        />
        <button
          className="nodrag"
          onClick={addImage}
          style={{
            padding: '6px 12px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          添加
        </button>
      </div>

      {/* Image List */}
      <div className="nodrag" style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {images.length === 0 ? (
          <div style={{
            fontSize: '11px',
            color: '#a78bfa',
            textAlign: 'center',
            padding: '12px',
            fontStyle: 'italic',
          }}>
            暂无图片
          </div>
        ) : (
          images.map((url, index) => (
            <div
              key={index}
              onClick={() => selectionMode === 'select'
                ? toggleImageSelection(url)
                : openPreview(url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                backgroundColor: selectionMode === 'select' && selectedImages.has(url)
                  ? '#d1fae5'
                  : '#ede9fe',
                borderRadius: '4px',
                marginBottom: '4px',
                border: selectionMode === 'select' && selectedImages.has(url)
                  ? '2px solid #10b981'
                  : '1px solid #c4b5fd',
                cursor: selectionMode === 'select' ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background 0.2s',
              }}
              title={selectionMode === 'select'
                ? (selectedImages.has(url) ? '取消选择' : '选择此图片')
                : '点击预览大图'}
              onMouseEnter={(e) => {
                if (selectionMode === 'preview') {
                  e.currentTarget.style.backgroundColor = '#ddd6fe';
                }
              }}
              onMouseLeave={(e) => {
                if (selectionMode === 'preview') {
                  e.currentTarget.style.backgroundColor = '#ede9fe';
                }
              }}
            >
              {/* ⭐ Selection indicator (select mode) */}
              {selectionMode === 'select' && selectedImages.has(url) && (
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  zIndex: 1,
                }}>
                  ✓
                </div>
              )}

              {/* Thumbnail */}
              <img
                src={url}
                alt={`ref-${index}`}
                style={{
                  width: '48px',
                  height: '48px',
                  objectFit: 'cover',
                  borderRadius: '3px',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {/* URL */}
              <div style={{
                flex: 1,
                fontSize: '10px',
                color: '#4c1d95',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {url}
              </div>
              {/* Remove Button */}
              <button
                className="nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
                title="删除图片"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Count Badge */}
      {images.length > 0 && (
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#7c3aed',
          textAlign: 'right',
        }}>
          {images.length} 张图片
          {selectionMode === 'select' && selectedImages.size > 0 && (
            <span style={{ color: '#10b981', marginLeft: '8px' }}>
              (已选 {selectedImages.size})
            </span>
          )}
        </div>
      )}

      {/* Output Label */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'right',
      }}>
        图片数组 →
      </div>

      {/* ⭐ Preview Modal */}
      {showPreview && previewImage && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
            <img
              src={previewImage}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
            <div style={{
              marginTop: '12px',
              fontSize: '11px',
              color: '#64748b',
              wordBreak: 'break-all',
            }}>
              {previewImage}
            </div>
            <button
              className="nodrag"
              onClick={closePreview}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '8px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              关闭预览
            </button>
          </div>
        </div>
      )}

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#8b5cf6')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default ReferenceImageNode;
