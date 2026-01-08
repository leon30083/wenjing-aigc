import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:9000';
const MIN_WIDTH = 260;
const MIN_HEIGHT = 400;

// Global tracking to prevent node drag during resize
let isResizingNode = false;

function VideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const promptInputRef = useRef(null);
  const nodeRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const onSizeChangeRef = useRef(data.onSizeChange);

  // Update ref when data.onSizeChange changes
  useEffect(() => {
    onSizeChangeRef.current = data.onSizeChange;
  }, [data.onSizeChange]);

  // Node size state
  const [nodeSize, setNodeSize] = useState(() => ({
    width: data.width || 280,
    height: data.height || MIN_HEIGHT,
  }));
  const [isResizing, setIsResizing] = useState(false);

  // ⭐ 接收外部 API 配置（来自 APISettingsNode）
  const externalApiConfig = data.apiConfig || null;
  const apiConfigSourceLabel = data.apiConfigSourceLabel || null;

  // 默认 API 配置（未连接时使用）
  const defaultApiConfig = {
    platform: 'juxin',
    model: 'sora-2-all',
    aspect: '16:9',
    watermark: false,
  };

  // 合并配置：外部配置优先，否则使用默认配置
  const apiConfig = externalApiConfig || defaultApiConfig;

  // 节点自有配置：duration（视频生成特有）
  const [duration, setDuration] = useState(10);

  // Connected inputs (from connected nodes) - passed via data
  const connectedPrompt = data.connectedPrompt || '';
  // ⭐ 关键修复：使用 useState 触发重新渲染，但不同步回 data（避免循环）
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [connectedImages, setConnectedImages] = useState(data.connectedImages || []);

  // ⭐ 合并后的 useEffect：同时同步 connectedCharacters 和 connectedImages
  // ⭐ 关键修复：当 data.* 为 undefined 时，清除状态
  useEffect(() => {
    if (data.connectedCharacters !== undefined) {
      setConnectedCharacters(data.connectedCharacters);
    } else {
      // 连接断开时，清除状态
      setConnectedCharacters([]);
    }

    if (data.connectedImages !== undefined) {
      setConnectedImages(data.connectedImages);
    } else {
      // 连接断开时，清除状态
      setConnectedImages([]);
    }
  }, [data.connectedCharacters, data.connectedImages]);

  // ⭐ 新增：同步 connectedPrompt 到 manualPrompt（问题3修复）
  useEffect(() => {
    if (data.connectedPrompt && data.connectedPrompt !== manualPrompt) {
      setManualPrompt(data.connectedPrompt);
    }
  }, [data.connectedPrompt]);

  // Manual inputs
  const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || ''); // ⭐ 从 data.manualPrompt 初始化（支持工作流恢复）
  const [status, setStatus] = useState(data.taskId ? 'success' : 'idle'); // ⭐ 如果有 taskId 则设置为成功状态
  const [taskId, setTaskId] = useState(data.taskId || null); // ⭐ 从 data.taskId 初始化
  const [error, setError] = useState(null);

  // ⭐ 旁白模式状态
  const [narratorMode, setNarratorMode] = useState(data.narratorMode || false);
  const [narratorIndex, setNarratorIndex] = useState(data.narratorIndex || 0);
  const [narratorTotal, setNarratorTotal] = useState(data.narratorTotal || 0);
  const [narratorSentences, setNarratorSentences] = useState(data.narratorSentences || []);

  // ⭐ 关键修复：当 data.taskId 变化时（加载工作流），同步到内部状态
  useEffect(() => {
    if (data.taskId && data.taskId !== taskId) {
      setTaskId(data.taskId);
      if (data.taskId) {
        setStatus('success'); // 已有 taskId 说明已完成
      }
    }
  }, [data.taskId]);

  // Update parent node data when size changes
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]);

  // ⭐ 关键修复：当 taskId 变化时，更新节点 data 以便保存到工作流快照
  useEffect(() => {
    if (taskId && data.taskId !== taskId) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, taskId } }
            : node
        )
      );
    }
  }, [taskId, nodeId, setNodes, data.taskId]);

  // ⭐ 关键修复：当 manualPrompt 变化时，同步到 node.data（用于工作流快照保存）
  useEffect(() => {
    if (manualPrompt !== data.manualPrompt) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );
    }
  }, [manualPrompt, nodeId, setNodes, data.manualPrompt]);

  // ⭐ 接收旁白模式数据（来自 NarratorProcessorNode）
  useEffect(() => {
    console.log('[VideoGenerateNode] 旁白数据变化:', {
      narratorMode: data.narratorMode,
      narratorIndex: data.narratorIndex,
      narratorTotal: data.narratorTotal,
      narratorSentencesCount: data.narratorSentences?.length || 0,
      manualPrompt: data.manualPrompt?.substring(0, 50)
    });

    if (data.narratorMode !== undefined) {
      console.log('[VideoGenerateNode] 设置 narratorMode =', data.narratorMode);
      setNarratorMode(data.narratorMode);
    }
    if (data.narratorIndex !== undefined) {
      console.log('[VideoGenerateNode] 设置 narratorIndex =', data.narratorIndex);
      setNarratorIndex(data.narratorIndex);
    }
    if (data.narratorTotal !== undefined) {
      console.log('[VideoGenerateNode] 设置 narratorTotal =', data.narratorTotal);
      setNarratorTotal(data.narratorTotal);
    }
    if (data.narratorSentences !== undefined) {
      console.log('[VideoGenerateNode] 设置 narratorSentences =', data.narratorSentences.length, '个句子');
      setNarratorSentences(data.narratorSentences);
    }
  }, [data.narratorMode, data.narratorIndex, data.narratorTotal, data.narratorSentences]);

  // ⭐ 关键修复：同步内部 narratorIndex 变化到 node.data（修复 UI 不更新问题）
  useEffect(() => {
    // 只在旁白模式下同步
    if (narratorMode) {
      // 获取当前节点的 data
      const currentNode = getNodes().find(n => n.id === nodeId);
      const currentIndex = currentNode?.data?.narratorIndex;

      // ⭐ 只在值真正不同时更新（防止无限循环）
      if (currentIndex !== narratorIndex || currentNode?.data?.manualPrompt !== manualPrompt) {
        console.log('[VideoGenerateNode] 内部状态变化，同步到 node.data:', {
          oldIndex: currentIndex,
          newIndex: narratorIndex,
          manualPrompt: manualPrompt?.substring(0, 30)
        });

        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    narratorIndex,
                    manualPrompt
                  }
                }
              : node
          )
        );
      }
    }
  }, [narratorIndex, manualPrompt, narratorMode, nodeId, setNodes, getNodes]);

  // Resize handling - use capture phase and prevent default
  const handleResizeMouseDown = (e) => {
    // Only left button
    if (e.button !== 0) return;

    // Prevent React Flow from capturing this event
    e.preventDefault();
    e.stopPropagation();

    // Set global flag
    isResizingNode = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeSize.width;
    const startHeight = nodeSize.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newWidth = Math.max(MIN_WIDTH, startWidth + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, startHeight + deltaY);

      setNodeSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      isResizingNode = false;
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ⭐ 创建用户名到别名的映射
  const usernameToAlias = React.useMemo(() => {
    const map = {};
    connectedCharacters.forEach(char => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  // ⭐ 将真实提示词转换为显示提示词（用户看：别名）
  const realToDisplay = (text) => {
    if (!text) return '';
    let result = text;
    // 替换 @username 为 @alias
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      // ⚠️ 关键修复：使用正向肯定预查而不是 \b（\b 不支持中文）
      // 匹配 @username 后面是：空白字符、字符串结尾、或下一个 @ 符号
      const regex = new RegExp(`@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  // ⭐ 将显示提示词转换为真实提示词（API用：真实ID）
  const displayToReal = (text) => {
    if (!text) return '';
    let result = text;

    // 替换 @alias 为 @username（按最长匹配优先，避免部分匹配问题）
    const sortedAliases = Object.entries(usernameToAlias)
      .sort((a, b) => b[1].length - a[1].length); // 长别名优先

    sortedAliases.forEach(([username, alias]) => {
      // 使用正向肯定预查 (?=\s|$|@) 确保匹配到 @alias 后面是：
      // - 空白字符 \s（空格、换行等）
      // - 字符串结尾 $
      // - 下一个 @ 符号（下一个引用的开始）
      const regex = new RegExp(`@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`, 'g');
      result = result.replace(regex, `@${username}`);
    });

    return result;
  };

  // ⭐ 在光标位置插入角色引用
  const insertCharacterAtCursor = (username, alias) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    // 获取光标位置（在显示文本中的位置）
    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const displayText = realToDisplay(manualPrompt);
    const refText = `@${alias} `; // ⭐ 插入别名到显示位置

    // 在光标位置插入到显示文本
    const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

    // ⭐ 转换回真实ID并存储
    const newRealText = displayToReal(newDisplayText);
    setManualPrompt(newRealText);

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
      // ⭐ 关键修复：先同步 manualPrompt 到节点 data，确保工作流快照包含完整数据
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompt } }
            : node
        )
      );

      const payload = {
        platform: apiConfig.platform,
        model: apiConfig.model.toLowerCase(), // Convert to lowercase (Sora-2 -> sora-2)
        prompt: finalPrompt, // ⭐ 直接使用提示词，不做任何自动组装
        duration: duration,
        aspect_ratio: apiConfig.aspect,
        watermark: apiConfig.watermark,
      };

      // Add API key if provided
      if (apiConfig.apiKey && apiConfig.apiKey.trim()) {
        payload.apiKey = apiConfig.apiKey.trim();
      }

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
        console.log('[VideoGenerateNode] Dispatching event:', { sourceNodeId: nodeId, taskId: id, platform: apiConfig.platform });
        window.dispatchEvent(new CustomEvent('video-task-created', {
          detail: { sourceNodeId: nodeId, taskId: id, platform: apiConfig.platform }
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

  // ⭐ 加载当前旁白（从 NarratorProcessorNode 读取当前句子）
  const loadCurrentSentence = () => {
    // 查找连接的 NarratorProcessorNode
    const edges = getEdges();
    const narratorEdge = edges.find(
      (e) => e.target === nodeId && e.sourceHandle === 'sentence-output'
    );

    if (narratorEdge) {
      const narratorNode = getNodes().find(n => n.id === narratorEdge.source);
      if (narratorNode?.type === 'narratorProcessorNode') {
        const currentIndex = narratorNode.data?.currentIndex || 0;
        const sentences = narratorNode.data?.sentences || [];
        const currentSentence = sentences[currentIndex];

        if (currentSentence?.optimized) {
          setNarratorMode(true);
          setNarratorIndex(currentIndex);
          setNarratorTotal(sentences.length);
          setNarratorSentences(sentences);
          setManualPrompt(currentSentence.optimized);

          console.log('[VideoGenerateNode] 加载当前旁白:', {
            currentIndex,
            total: sentences.length,
            prompt: currentSentence.optimized?.substring(0, 50)
          });
        }
      }
    }
  };

  // ⭐ 加载下一个句子（旁白模式）
  const loadNextSentence = () => {
    if (narratorMode && narratorIndex < narratorTotal - 1) {
      const nextIndex = narratorIndex + 1;
      const nextSentence = narratorSentences[nextIndex];

      if (nextSentence && nextSentence.optimized) {
        setNarratorIndex(nextIndex);
        setManualPrompt(nextSentence.optimized);
        console.log('[VideoGenerateNode] 加载下一个句子:', nextIndex);
      }
    }
  };

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
      }}>
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

      {/* Input Labels (separate from handles) */}
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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video-output"
        style={{ background: '#10b981', width: 10, height: 10 }}
      />

      {/* Output Label (separate from handle) */}
      <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', whiteSpace: 'nowrap' }}>视频</span>
      </div>

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#065f46',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎬 {data.label || '视频生成'}
      </div>

      {/* API Config Display (read-only, from APISettingsNode) */}
      <div className="nodrag" style={{
        padding: '6px 8px',
        backgroundColor: externalApiConfig ? '#dbeafe' : '#fef3c7',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
        color: externalApiConfig ? '#1e40af' : '#92400e',
        fontWeight: 'bold',
        border: externalApiConfig ? '1px solid #93c5fd' : '1px dashed #fcd34d',
      }}>
        {externalApiConfig
          ? (
            <div>
              <div style={{ marginBottom: '4px', fontSize: '9px', color: '#3b82f6' }}>
                📌 来自: {apiConfigSourceLabel || 'API 设置'}
              </div>
              <div>
                ⚙️ {apiConfig.platform === 'juxin' ? '聚鑫' : '贞贞'} | {apiConfig.model.toUpperCase()} | {apiConfig.aspect} | {apiConfig.watermark ? '水印' : '无水印'}
              </div>
            </div>
          )
          : '💡 提示：连接 API 设置节点'
        }
      </div>

      {/* Duration Config (node-specific) */}
      <div className="nodrag" style={{
        padding: '6px',
        backgroundColor: '#d1fae5',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '10px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', marginBottom: '4px' }}>
          ⏱️ 时长
        </div>
        <select
          id="video-duration"
          name="duration"
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
          <option value={5}>5秒</option>
          <option value={10}>10秒</option>
          <option value={15}>15秒</option>
          <option value={25}>25秒</option>
        </select>
      </div>

      {/* ⭐ 旁白模式显示 */}
      {narratorMode && (
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
                opacity: 1
              }}
            >
              📥 加载当前旁白
            </button>
            <button
              className="nodrag"
              onClick={loadNextSentence}
              disabled={narratorIndex >= narratorTotal - 1}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: narratorIndex >= narratorTotal - 1 ? '#9ca3af' : '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: narratorIndex >= narratorTotal - 1 ? 'not-allowed' : 'pointer',
                opacity: narratorIndex >= narratorTotal - 1 ? 0.5 : 1
              }}
            >
            {narratorIndex >= narratorTotal - 1 ? '✓ 完成' : '⏭️ 下一个'}
          </button>
          </div>
        </div>
      )}

      {/* ⭐ 候选角色显示 */}
      <div className="nodrag" style={{ marginBottom: '8px' }}>
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
                title={`点击插入 @${char.alias || char.username}`}
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

      {/* ⭐ Connected Images Display with thumbnails */}
      {connectedImages.length > 0 ? (
        <div style={{
          padding: '6px',
          backgroundColor: '#f3e8ff',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '10px',
          color: '#6b21a8',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            🖼️ 已连接参考图 ({connectedImages.length} 张)
          </div>
          {/* Thumbnail grid */}
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
          💡 提示：连接参考图节点并选择图片
        </div>
      )}

      {/* ⭐ 提示信息：当有 connectedPrompt 时显示来源提示（问题3修复） */}
      {connectedPrompt && (
        <div style={{
          padding: '4px 8px',
          backgroundColor: '#dbeafe',
          borderRadius: '4px',
          marginBottom: '6px',
          fontSize: '9px',
          color: '#1e40af',
          fontStyle: 'italic',
          border: '1px dashed #93c5fd',
        }}>
          💡 提示词来自优化节点，可继续编辑
        </div>
      )}

      {/* Prompt Display / Input - 始终显示 textarea（问题3修复） */}
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
            📤 最终提示词 (API): {manualPrompt}
          </div>
        )}
        {/* Display hint for user */}
        <div style={{
            padding: '4px 8px',
            backgroundColor: '#fffbeb',
            borderRadius: '4px',
            marginBottom: '8px',
            fontSize: '9px',
            color: '#92400e',
            fontStyle: 'italic',
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

      {/* Resize Handle (ComfyUI style) */}
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

export default VideoGenerateNode;
