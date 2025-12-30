import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:9000';

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const promptInputRef = useRef(null);

  const [config, setConfig] = useState({
    model: 'Sora-2',
    duration: 10, // Duration in seconds (5, 10, 15, 25)
    aspect: '16:9',
    watermark: false,
  });

  // Connected inputs (from connected nodes) - passed via data
  const connectedPrompt = data.connectedPrompt || '';
  const connectedCharacters = data.connectedCharacters || []; // ⭐ 改为数组
  const connectedImages = data.connectedImages || [];

  // Manual inputs
  const [manualPrompt, setManualPrompt] = useState('');
  const [status, setStatus] = useState('idle'); // idle, generating, success, error
  const [taskId, setTaskId] = useState(null);
  const [error, setError] = useState(null);

  // ⭐ 在光标位置插入角色引用
  const insertCharacterAtCursor = (username) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    // 获取光标位置
    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const text = manualPrompt;
    const refText = `@${username} `;

    // 在光标位置插入
    const newText = text.substring(0, start) + refText + text.substring(end);
    setManualPrompt(newText);

    // 移动光标到插入内容之后
    setTimeout(() => {
      promptElement.setSelectionRange(start + refText.length, start + refText.length);
      promptElement.focus();
    }, 0);
  };

  const handleGenerate = async () => {
    // 使用连接的提示词或手动输入的提示词（不做任何自动组装）
    const finalPrompt = connectedPrompt || manualPrompt;

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
        model: config.model.toLowerCase(), // Convert to lowercase (Sora-2 -> sora-2)
        prompt: finalPrompt, // ⭐ 直接使用提示词，不做任何自动组装
        duration: config.duration,
        aspect_ratio: config.aspect,
        watermark: config.watermark,
      };

      // Add images if connected
      if (connectedImages.length > 0) {
        payload.images = connectedImages;
      }

      const response = await fetch(`${API_BASE}/api/video/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const id = result.data.id || result.data.task_id;
        setTaskId(id);
        setStatus('success');

        // Update node data so taskId can be passed to connected nodes
        // Note: Using useReactFlow() here would require importing it
        // For now, we use the event system
        console.log('[VideoGenerateNode] Dispatching event:', { sourceNodeId: nodeId, taskId: id });
        window.dispatchEvent(new CustomEvent('video-task-created', {
          detail: { sourceNodeId: nodeId, taskId: id }
        }));

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
        style={{ background: '#10b981', width: 10, height: 10, top: '25%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ background: '#f59e0b', width: 10, height: 10, top: '45%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '65%' }}
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
            value={config.duration}
            onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
            disabled={status === 'generating'}
            style={{
              flex: 1,
              padding: '4px',
              borderRadius: '3px',
              border: '1px solid #6ee7b7',
              fontSize: '10px',
            }}
          >
            <option value={5}>5秒</option>
            <option value={10}>10秒</option>
            <option value={15}>15秒</option>
            <option value={25}>25秒</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
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
            <option value="16:9">16:9 横屏</option>
            <option value="9:16">9:16 竖屏</option>
          </select>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <label style={{ fontSize: '10px', color: '#065f46', marginRight: '4px' }}>水印:</label>
            <input
              type="checkbox"
              checked={config.watermark}
              onChange={(e) => setConfig({ ...config, watermark: e.target.checked })}
              disabled={status === 'generating'}
            />
          </div>
        </div>
      </div>

      {/* ⭐ 候选角色显示 */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#059669',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击插入到光标位置)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                onClick={() => insertCharacterAtCursor(char.username)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '4px',
                  border: '1px solid #6ee7b7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                title="点击插入到光标位置"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d1fae5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ecfdf5'}
              >
                <img
                  src={char.profilePictureUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'}
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '10px', color: '#047857' }}>
                  {char.alias || char.username}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '6px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#92400e',
            textAlign: 'center'
          }}>
            💡 提示：连接角色库节点并选择角色后，点击角色卡片插入
          </div>
        )}
      </div>

      {/* Connected Images Display */}
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
        <div>
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#dbeafe',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '11px',
            color: '#1e40af',
            wordBreak: 'break-word',
          }}>
            {connectedPrompt}
          </div>
          {/* Final Prompt Preview */}
          <div style={{
            padding: '6px 8px',
            backgroundColor: '#f0fdf4',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '10px',
            color: '#166534',
            fontStyle: 'italic',
            border: '1px dashed #6ee7b7',
          }}>
            📤 最终提示词: {connectedPrompt}
          </div>
        </div>
      ) : (
        <div>
          <textarea
            ref={promptInputRef}
            value={manualPrompt}
            onChange={(e) => setManualPrompt(e.target.value)}
            placeholder="输入提示词，点击上方角色卡片插入 @username 引用..."
            disabled={status === 'generating'}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #6ee7b7',
              fontSize: '11px',
              fontFamily: 'monospace',
              marginBottom: '6px',
              resize: 'vertical',
            }}
          />
          {/* Final Prompt Preview */}
          {manualPrompt && (
            <div style={{
              padding: '6px 8px',
              backgroundColor: '#f0fdf4',
              borderRadius: '4px',
              marginBottom: '8px',
              fontSize: '10px',
              color: '#166534',
              fontStyle: 'italic',
              border: '1px dashed #6ee7b7',
            }}>
              📤 最终提示词: {manualPrompt}
            </div>
          )}
        </div>
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
        <div>↑ 角色 (多选)</div>
        <div>↑ 图片</div>
        <div style={{ textAlign: 'right', marginTop: '2px' }}>视频 →</div>
      </div>
    </div>
  );
}

export default VideoGenerateNode;
