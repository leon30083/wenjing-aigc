import { Handle, Position } from 'reactflow';
import React, { useState } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

function VideoNode({ data }) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, error

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    240, // minWidth
    180, // minHeight
    { width: 260, height: 200 } // initialSize
  );

  const handleGenerate = () => {
    if (!prompt.trim()) {
      alert('请先连接提示词节点或输入提示词');
      return;
    }

    setStatus('processing');
    // TODO: 调用后端 API 生成视频
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#10b981',
      borderStyle: 'solid',
      backgroundColor: '#ecfdf5',
      ...resizeStyles,
    }}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ background: '#10b981', width: 10, height: 10 }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: '#10b981', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#065f46',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎬 {data.label}
      </div>

      {/* Connected Prompt Display */}
      {prompt && (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#d1fae5',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#064e3b',
          marginBottom: '8px',
          wordBreak: 'break-word',
        }}>
          {prompt}
        </div>
      )}

      {/* Generate Button */}
      <button
        className="nodrag"
        onClick={handleGenerate}
        disabled={status === 'processing'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'processing'
            ? '#9ca3af'
            : status === 'success'
            ? '#059669'
            : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'processing' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '生成视频'}
        {status === 'processing' && '生成中...'}
        {status === 'success' && '✓ 完成'}
        {status === 'error' && '✗ 失败'}
      </button>

      {/* Input/Output Labels */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>← 提示词</span>
        <span>视频 →</span>
      </div>

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#10b981')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default VideoNode;
