/**
 * VEOGenerateNode - VEO 视频生成节点
 *
 * 功能：
 * - 支持 VEO 文生视频和图生视频
 * - 支持聚鑫和贞贞平台
 * - 可选增强提示词、提升分辨率
 * - 紫色边框区分（#8b5cf6）
 */

import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState } from 'react';
import { useVideoGeneration } from '../../hooks/useVideoGeneration';
import { useAPIConfig } from '../../contexts/APIConfigContext';

const API_BASE = 'http://localhost:9000';

// VEO 时长选项（需求文档未明确，使用通用选项）
const VEO_DURATION_OPTIONS = [5, 10, 15];

function VEOGenerateNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // ⭐ Cherry Studio style: 从 Context 获取配置
  const { config: globalConfig, platforms } = useAPIConfig();

  // 使用共用 Hook
  const {
    nodeSize,
    setNodeSize,
    isResizing,
    apiConfig,
    apiConfigSourceLabel,
    externalApiConfig,
    duration,
    setDuration,
    connectedPrompt,
    connectedCharacters,
    connectedImages,
    manualPrompt,
    setManualPrompt,
    status,
    setStatus,
    taskId,
    setTaskId,
    error,
    setError,
    promptInputRef,
    nodeRef,
    resizeHandleRef,
    handleResizeMouseDown,
    realToDisplay,
    displayToReal,
    insertCharacterAtCursor,

    // 样式配置
    nodeColor: _nodeColor,
    nodeBgColor: _nodeBgColor,
    headerColor: _headerColor,
    handleColor,
    durationOptions,
  } = useVideoGeneration(data, nodeId, setNodes, getNodes, getEdges, {
    nodeType: 'veo',
    nodeColor: '#8b5cf6',      // 紫色
    nodeBgColor: '#f5f3ff',    // 浅紫色背景
    headerColor: '#5b21b6',    // 深紫色标题
    handleColor: '#8b5cf6',
    durationOptions: VEO_DURATION_OPTIONS,
    defaultDuration: 10,
  });

  // VEO 特有配置
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [upscale, setUpscale] = useState(false);

  // ⭐ Cherry Studio style: 从 platforms 获取可用模型列表
  const getCurrentPlatform = () => {
    return platforms.find(p => p.key === globalConfig.platform);
  };

  const getCurrentPlatformModels = () => {
    const platform = getCurrentPlatform();
    return platform?.models || [];
  };

  // 获取当前模型名称
  const getCurrentModelName = () => {
    const models = getCurrentPlatformModels();
    const model = models.find(m => m.id === globalConfig.model);
    return model?.name || globalConfig.model;
  };

  const handleGenerate = async () => {
    const finalPrompt = connectedPrompt || manualPrompt;

    if (!finalPrompt.trim()) {
      setError('请输入提示词或连接文本节点');
      return;
    }

    setStatus('generating');
    setError(null);
    setTaskId(null);

    try {
      // 先同步 manualPrompt 到节点 data
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );

      // ⭐ Cherry Studio style: 使用全局配置
      const payload = {
        platform: globalConfig.platform,
        model: globalConfig.model,
        prompt: finalPrompt,
        enhance_prompt: enhancePrompt,
        upscale: upscale,
      };

      // Add API key if provided
      if (globalConfig.apiKey && globalConfig.apiKey.trim()) {
        payload.apiKey = globalConfig.apiKey.trim();
      }

      // Add images if connected
      if (connectedImages.length > 0) {
        payload.images = connectedImages;
      }

      // ⭐ 调用 VEO 专用 API 端点
      const response = await fetch(`${API_BASE}/api/veo/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const id = result.data.id || result.data.task_id;
        setTaskId(id);
        setStatus('success');

        // 派发事件
        window.dispatchEvent(new CustomEvent('video-task-created', {
          detail: { sourceNodeId: nodeId, taskId: id, platform: globalConfig.platform },
        }));

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

  // 监听优化完成事件
  useState(() => {
    const handleOptimizationComplete = (event) => {
      const { nodeId: sourceNodeId } = event.detail;
      const edges = getEdges();
      const narratorEdge = edges.find(
        (e) => e.source === sourceNodeId && e.target === nodeId
      );

      if (narratorEdge) {
        console.log('[VEOGenerateNode] ✅ 单句优化完成');
      }
    };

    window.addEventListener('narrator-optimization-complete', handleOptimizationComplete);
    return () => {
      window.removeEventListener('narrator-optimization-complete', handleOptimizationComplete);
    };
  });

  return (
    <div
      ref={nodeRef}
      style={{
        padding: '10px 15px',
        paddingLeft: '85px',
        paddingRight: '85px',
        borderRadius: '8px',
        borderWidth: '2px',
        borderColor: '#8b5cf6',
        borderStyle: 'solid',
        backgroundColor: '#f5f3ff',
        width: `${nodeSize.width}px`,
        minHeight: `${nodeSize.height}px`,
        position: 'relative',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="api-config"
        style={{ background: '#3b82f6', width: 10, height: 10, top: '10%' }}
      />
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
      <Handle
        type="target"
        position={Position.Left}
        id="sentence-output"
        style={{ background: '#a855f7', width: 10, height: 10, top: '85%' }}
      />

      {/* Input Labels */}
      <div style={{ position: 'absolute', left: '18px', top: '10%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>API</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '30%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', whiteSpace: 'nowrap' }}>提示词</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>角色</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '70%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>图片</span>
      </div>
      <div style={{ position: 'absolute', left: '18px', top: '85%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#a855f7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>旁白</span>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: '#8b5cf6', width: 10, height: 10, top: '50%' }}
      />

      {/* Output Labels */}
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>VEO视频</span>
      </div>

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#5b21b6',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎬 VEO {data.label || '视频生成'}
      </div>

      {/* API Config Display - Cherry Studio Style */}
      <div className="nodrag" style={{
        padding: '6px 8px',
        backgroundColor: '#e9d5ff',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
        color: '#5b21b6',
        fontWeight: 'bold',
        border: '1px solid #a78bfa',
      }}>
        <div>
          <div style={{ marginBottom: '4px', fontSize: '9px', color: '#7c3aed' }}>
            📊 全局配置（来自设置面板）
          </div>
          <div>
            ⚙️ {getCurrentPlatform()?.name || '未知平台'} | {getCurrentModelName()}
          </div>
        </div>
      </div>

      {/* VEO 特有配置 */}
      <div className="nodrag" style={{
        padding: '6px',
        backgroundColor: '#ede9fe',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#5b21b6', marginBottom: '4px' }}>
          ⏱️ 时长
        </div>
        <select
          className="nodrag"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          disabled={status === 'generating'}
          style={{
            width: '100%',
            padding: '4px',
            borderRadius: '3px',
            border: '1px solid #a78bfa',
            fontSize: '11px',
          }}
        >
          {durationOptions.map((d) => (
            <option key={d} value={d}>{d}秒</option>
          ))}
        </select>

        <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '10px' }}>
            <input
              type="checkbox"
              className="nodrag"
              checked={enhancePrompt}
              onChange={(e) => setEnhancePrompt(e.target.checked)}
              disabled={status === 'generating'}
            />
            <span style={{ marginLeft: '4px' }}>增强提示词</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', fontSize: '10px' }}>
            <input
              type="checkbox"
              className="nodrag"
              checked={upscale}
              onChange={(e) => setUpscale(e.target.checked)}
              disabled={status === 'generating'}
            />
            <span style={{ marginLeft: '4px' }}>提升分辨率</span>
          </label>
        </div>
      </div>

      {/* 候选角色显示 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#5b21b6',
          marginBottom: '4px',
        }}>
          📊 候选角色 (点击插入)
        </div>

        {connectedCharacters.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {connectedCharacters.map((char) => (
              <div
                key={char.id}
                className="nodrag"
                onClick={() => insertCharacterAtCursor(char.username, char.alias || char.username)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f3e8ff',
                  borderRadius: '4px',
                  border: '1px solid #a78bfa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9d5ff'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3e8ff'}
              >
                <img
                  src={char.profilePictureUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E'}
                  alt=""
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                />
                <span style={{ fontSize: '10px', color: '#5b21b6' }}>
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
            💡 提示：连接角色库节点并选择角色
          </div>
        )}
      </div>

      {/* Connected Images Display */}
      {connectedImages.length > 0 ? (
        <div style={{
          padding: '6px',
          backgroundColor: '#f3e8ff',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '10px',
          color: '#5b21b6',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            🖼️ 已连接参考图 ({connectedImages.length} 张)
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {connectedImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`ref-${index}`}
                style={{
                  width: '40px',
                  height: '40px',
                  objectFit: 'cover',
                  borderRadius: '3px',
                  border: '1px solid #a78bfa',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '6px',
          backgroundColor: '#fef3c7',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '10px',
          color: '#92400e',
          textAlign: 'center'
        }}>
          💡 提示：连接参考图节点
        </div>
      )}

      {/* Prompt Display */}
      <div className="nodrag">
        <textarea
          className="nodrag"
          ref={promptInputRef}
          value={realToDisplay(manualPrompt)}
          onChange={(e) => {
            const realText = displayToReal(e.target.value);
            setManualPrompt(realText);
          }}
          onWheel={(e) => e.stopPropagation()}
          placeholder="输入提示词..."
          disabled={status === 'generating'}
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #a78bfa',
            fontSize: '11px',
            fontFamily: 'monospace',
            marginBottom: '6px',
            resize: 'vertical',
          }}
        />
        <div style={{
            padding: '4px 8px',
            backgroundColor: '#f5f3ff',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '9px',
            color: '#5b21b6',
          }}>
          💡 输入框显示别名，API使用真实ID
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="nodrag"
        onClick={handleGenerate}
        disabled={status === 'generating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'generating'
            ? '#a78bfa'
            : status === 'success'
            ? '#8b5cf6'
            : status === 'error'
            ? '#dc2626'
            : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'generating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '生成 VEO 视频'}
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
          backgroundColor: '#e9d5ff',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#5b21b6',
        }}>
          任务ID: {taskId}
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="nodrag"
        ref={resizeHandleRef}
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: '0',
          bottom: '0',
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          background: 'linear-gradient(135deg, transparent 50%, #8b5cf6 50%)',
          borderRadius: '0 0 6px 0',
          opacity: '0.6',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default VEOGenerateNode;
