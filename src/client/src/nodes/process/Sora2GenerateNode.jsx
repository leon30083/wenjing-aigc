/**
 * Sora2GenerateNode - Sora2 视频生成节点
 *
 * 功能：
 * - 支持 Sora2 文生视频和图生视频
 * - 支持角色客串（@username）
 * - 支持时长选择（10/15/25秒）
 * - 支持高清、无水印选项
 * - 绿色边框区分（#10b981）
 */

import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState } from 'react';
import { useVideoGeneration } from '../../hooks/useVideoGeneration';
import { useAPIConfig } from '../../contexts/APIConfigContext';

const API_BASE = 'http://localhost:9000';

// Sora2 时长选项（需求文档明确）
const SORA2_DURATION_OPTIONS = [10, 15, 25];

function Sora2GenerateNode({ data }) {
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
    narratorMode,
    narratorIndex,
    narratorTotal,
    narratorSentences,
    promptInputRef,
    nodeRef,
    resizeHandleRef,
    handleResizeMouseDown,
    realToDisplay,
    displayToReal,
    insertCharacterAtCursor,
    loadCurrentSentence,
    loadNextSentence,

    // 样式配置
    nodeColor: _nodeColor,
    nodeBgColor: _nodeBgColor,
    headerColor: _headerColor,
    handleColor,
    durationOptions,
  } = useVideoGeneration(data, nodeId, setNodes, getNodes, getEdges, {
    nodeType: 'sora2',
    nodeColor: '#10b981',      // 绿色
    nodeBgColor: '#ecfdf5',    // 浅绿色背景
    headerColor: '#065f46',    // 深绿色标题
    handleColor: '#10b981',
    durationOptions: SORA2_DURATION_OPTIONS,
    defaultDuration: 10,
  });

  // Sora2 特有配置
  const hasHdOption = globalConfig.platform === 'zhenzhen'; // 贞贞支持高清
  const hasWatermarkOption = true; // 两个平台都支持水印

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
        model: globalConfig.model.toLowerCase(),
        prompt: finalPrompt,
        duration: duration,
        aspect_ratio: globalConfig.aspect,
        watermark: globalConfig.watermark,
      };

      // Add API key if provided
      if (globalConfig.apiKey && globalConfig.apiKey.trim()) {
        payload.apiKey = globalConfig.apiKey.trim();
      }

      // Add images if connected
      if (connectedImages.length > 0) {
        payload.images = connectedImages;
      }

      // ⭐ 调用 Sora2 API 端点
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
        console.log('[Sora2GenerateNode] ✅ 单句优化完成');
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
        borderColor: '#10b981',
        borderStyle: 'solid',
        backgroundColor: '#ecfdf5',
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
        style={{ background: '#10b981', width: 10, height: 10, top: '40%' }}
      />

      {/* Output Labels */}
      <div style={{ position: 'absolute', right: '18px', top: '40%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', whiteSpace: 'nowrap' }}>视频</span>
      </div>

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#065f46',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎬 Sora2 {data.label || '视频生成'}
      </div>

      {/* API Config Display - Cherry Studio Style */}
      <div className="nodrag" style={{
        padding: '6px 8px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
        color: '#065f46',
        fontWeight: 'bold',
        border: '1px solid #6ee7b7',
      }}>
        <div>
          <div style={{ marginBottom: '4px', fontSize: '9px', color: '#059669' }}>
            📊 全局配置（来自设置面板）
          </div>
          <div>
            ⚙️ {getCurrentPlatform()?.name || '未知平台'} | {getCurrentModelName()} | {globalConfig.aspect} | {globalConfig.watermark ? '水印' : '无水印'}
          </div>
        </div>
      </div>

      {/* Duration Config */}
      <div className="nodrag" style={{
        padding: '6px 8px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
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
            border: '1px solid #6ee7b7',
            fontSize: '11px',
          }}
        >
          {durationOptions.map((d) => (
            <option key={d} value={d}>{d}秒</option>
          ))}
        </select>
      </div>

      {/* 旁白模式显示 */}
      {narratorMode && narratorTotal > 0 && (
        <div style={{
          padding: '8px',
          backgroundColor: '#e0f2fe',
          borderRadius: '4px',
          marginBottom: '8px',
          border: '1px solid #7dd3fc'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '4px',
            color: '#0369a1'
          }}>
            📺 旁白模式: 句子 {narratorIndex + 1}/{narratorTotal}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="nodrag"
              onClick={loadCurrentSentence}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              📥 加载当前旁白
            </button>
            <button
              className="nodrag"
              onClick={loadNextSentence}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ⏭️ 下一个
            </button>
          </div>
        </div>
      )}

      {/* 候选角色显示 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#059669',
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
                  backgroundColor: '#ecfdf5',
                  borderRadius: '4px',
                  border: '1px solid #6ee7b7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
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
          color: '#065f46',
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
                  border: '1px solid #c4b5fd',
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
          placeholder="输入提示词，点击上方角色卡片插入角色引用..."
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
        <div style={{
            padding: '4px 8px',
            backgroundColor: '#f0fdf4',
            borderRadius: '4px',
            marginBottom: '6px',
            fontSize: '9px',
            color: '#166534',
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
            ? '#6ee7b7'
            : status === 'success'
            ? '#10b981'
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
        {status === 'idle' && '生成 Sora2 视频'}
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
          background: 'linear-gradient(135deg, transparent 50%, #10b981 50%)',
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

export default Sora2GenerateNode;
