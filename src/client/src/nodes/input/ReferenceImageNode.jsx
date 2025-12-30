import { Handle, Position } from 'reactflow';
import React, { useState } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

function ReferenceImageNode({ data }) {
  const [images, setImages] = useState(data.images || []);
  const [inputValue, setInputValue] = useState('');

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    240, // minWidth
    180, // minHeight
    { width: 260, height: 200 } // initialSize
  );

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
    if (data.onImagesChange) {
      data.onImagesChange(newImages);
    }
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

      {/* Input for Image URL */}
      <div className="nodrag" style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <input
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
      <div className="nodrag" style={{ maxHeight: '120px', overflowY: 'auto' }}>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                backgroundColor: '#ede9fe',
                borderRadius: '4px',
                marginBottom: '4px',
              }}
            >
              {/* Thumbnail */}
              <img
                src={url}
                alt={`ref-${index}`}
                style={{
                  width: '32px',
                  height: '32px',
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
                onClick={() => removeImage(index)}
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
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
