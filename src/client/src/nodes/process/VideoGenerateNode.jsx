import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

function VideoGenerateNode({ data }) {
  const [config, setConfig] = useState({
    model: 'Sora-2',
    duration: '10s',
    aspect: '16:9',
    watermark: false,
  });

  // Connected inputs (from connected nodes)
  const [connectedPrompt, setConnectedPrompt] = useState('');
  const [connectedCharacter, setConnectedCharacter] = useState(null);
  const [connectedImages, setConnectedImages] = useState([]);

  // Manual override inputs
  const [manualPrompt, setManualPrompt] = useState('');
  const [status, setStatus] = useState('idle'); // idle, generating, success, error
  const [taskId, setTaskId] = useState(null);
  const [error, setError] = useState(null);

  // Get final prompt (connected or manual)
  const finalPrompt = connectedPrompt || manualPrompt;

  const handleGenerate = async () => {
    if (!finalPrompt.trim()) {
      setError('请输入提示词或连接文本节点');
      return;
    }

    setStatus('generating');
    setError(null);
    setTaskId(null);

    try {
      const payload = {
        platform: 'juxin',
        model: config.model,
        prompt: finalPrompt,
        duration: config.duration,
        aspect_ratio: config.aspect,
        watermark: config.watermark,
      };

      // Add character reference if connected
      if (connectedCharacter) {
        payload.prompt = `@${connectedCharacter.username} ${finalPrompt}`;
      }

      // Add images if connected
      if (connectedImages.length > 0) {
        payload.images = connectedImages;
      }

      const response = await fetch(`${API_BASE}/video/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const id = result.data.id || result.data.task_id;
        setTaskId(id);
        setStatus('success');

        // Notify parent
        if (data.onVideoCreated) {
          data.onVideoCreated({ taskId: id, ...result.data });
        }
      } else {
        setStatus('error');
        setError(result.error || '生成失败');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || '网络错误');
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#10b981',
      borderStyle: 'solid',
      backgroundColor: '#ecfdf5',
      minWidth: '260px',
    }}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ background: '#10b981', width: 10, height: 10, top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#f59e0b', width: 10, height: 10, top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '70%' }}
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
        🎬 {data.label || '视频生成'}
      </div>

      {/* Global Config */}
      <div style={{
        padding: '6px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            disabled={status === 'generating'}
            style={{
              flex: 1,
              padding: '4px',
              borderRadius: '3px',
              border: '1px solid #6ee7b7',
              fontSize: '10px',
            }}
          >
            <option value="Sora-2">Sora-2</option>
          </select>
          <select
            value={config.aspect}
            onChange={(e) => setConfig({ ...config, aspect: e.target.value })}
            disabled={status === 'generating'}
            style={{
              flex: 1,
              padding: '4px',
              borderRadius: '3px',
              border: '1px solid #6ee7b7',
              fontSize: '10px',
            }}
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <label style={{ fontSize: '10px', color: '#065f46' }}>水印:</label>
          <input
            type="checkbox"
            checked={config.watermark}
            onChange={(e) => setConfig({ ...config, watermark: e.target.checked })}
            disabled={status === 'generating'}
          />
        </div>
      </div>

      {/* Connected Inputs Display */}
      {connectedCharacter && (
        <div style={{
          padding: '6px',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '10px',
          color: '#92400e',
        }}>
          <span>🐱 @{connectedCharacter.username}</span>
        </div>
      )}

      {connectedImages.length > 0 && (
        <div style={{
          padding: '6px',
          backgroundColor: '#f3e8ff',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '10px',
          color: '#6b21a8',
        }}>
          <span>🖼️ {connectedImages.length} 张参考图</span>
        </div>
      )}

      {/* Prompt Display / Input */}
      {connectedPrompt ? (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#dbeafe',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#1e40af',
          wordBreak: 'break-word',
        }}>
          {connectedCharacter && <span>@{connectedCharacter.username} </span>}
          {connectedPrompt}
        </div>
      ) : (
        <textarea
          value={manualPrompt}
          onChange={(e) => setManualPrompt(e.target.value)}
          placeholder="输入提示词或连接文本节点..."
          disabled={status === 'generating'}
          style={{
            width: '100%',
            minHeight: '50px',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #6ee7b7',
            fontSize: '11px',
            marginBottom: '8px',
            resize: 'vertical',
          }}
        />
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'generating'
            ? '#9ca3af'
            : status === 'success'
            ? '#059669'
            : status === 'error'
            ? '#dc2626'
            : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '生成视频'}
        {status === 'generating' && '生成中...'}
        {status === 'success' && '✓ 已提交'}
        {status === 'error' && '✗ 失败'}
      </button>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#fecaca',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      {/* Task ID Display */}
      {taskId && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#d1fae5',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#065f46',
        }}>
          任务ID: {taskId}
        </div>
      )}

      {/* Input Labels */}
      <div style={{
        marginTop: '8px',
        fontSize: '9px',
        color: '#64748b',
      }}>
        <div>↑ 提示词</div>
        <div>↑ 角色</div>
        <div>↑ 图片</div>
        <div style={{ textAlign: 'right', marginTop: '2px' }}>视频 →</div>
      </div>
    </div>
  );
}

export default VideoGenerateNode;
