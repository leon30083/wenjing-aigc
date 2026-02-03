/**
 * useVideoGeneration - 视频生成共用逻辑 Hook
 *
 * 提取 VideoGenerateNode、VEOGenerateNode、Sora2GenerateNode 的共用逻辑
 * 包括：
 * - 节点大小调整
 * - 角色引用双显示功能
 * - 提示词转换逻辑
 * - 状态同步逻辑
 */

import { useState, useEffect, useRef, useMemo } from 'react';

const MIN_WIDTH = 260;
const MIN_HEIGHT = 400;

// Global tracking to prevent node drag during resize
let isResizingNode = false;

/**
 * 视频生成共用 Hook
 * @param {Object} data - 节点 data
 * @param {string} nodeId - 节点 ID
 * @param {Function} setNodes - React Flow setNodes
 * @param {Function} getNodes - React Flow getNodes
 * @param {Function} getEdges - React Flow getEdges
 * @param {Object} options - 配置选项
 * @param {string} options.nodeType - 节点类型 ('veo' | 'sora2')
 * @param {string}.options.nodeColor - 节点边框颜色
 * @param {string}options.nodeBgColor - 节点背景色
 * @param {string}.options.headerColor - 节点标题颜色
 * @param {string}.options.handleColor - 节点 Handle 颜色
 * @param {Array} options.durationOptions - 时长选项 (VEO 和 Sora2 不同)
 */
export function useVideoGeneration(data, nodeId, setNodes, getNodes, getEdges, options = {}) {
  const {
    nodeType = 'sora2',
    nodeColor = '#10b981',
    nodeBgColor = '#ecfdf5',
    headerColor = '#065f46',
    handleColor = '#10b981',
    durationOptions = [5, 10, 15, 25],
    defaultDuration = 10,
  } = options;

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

  // 接收外部 API 配置（来自设置面板）
  const externalApiConfig = data.apiConfig || null;
  const apiConfigSourceLabel = data.apiConfigSourceLabel || null;

  // 默认 API 配置（未连接时使用）
  const defaultApiConfig = {
    platform: 'juxin',
    model: nodeType === 'veo' ? 'veo_3_1-components' : 'sora-2-all',
    aspect: '16:9',
    watermark: false,
  };

  // 合并配置：外部配置优先，否则使用默认配置
  const apiConfig = externalApiConfig || defaultApiConfig;

  // 节点自有配置：duration
  const [duration, setDuration] = useState(defaultDuration);

  // Connected inputs
  const connectedPrompt = data.connectedPrompt || '';
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [connectedImages, setConnectedImages] = useState(data.connectedImages || []);

  // 同步 connectedCharacters 和 connectedImages
  useEffect(() => {
    if (data.connectedCharacters !== undefined) {
      setConnectedCharacters(data.connectedCharacters);
    } else {
      setConnectedCharacters([]);
    }

    if (data.connectedImages !== undefined) {
      setConnectedImages(data.connectedImages);
    } else {
      setConnectedImages([]);
    }
  }, [data.connectedCharacters, data.connectedImages]);

  // 同步 connectedPrompt 到 manualPrompt
  useEffect(() => {
    if (data.connectedPrompt && data.connectedPrompt !== manualPrompt) {
      setManualPrompt(data.connectedPrompt);
    }
  }, [data.connectedPrompt]);

  // Manual inputs
  const [manualPrompt, setManualPrompt] = useState(data.manualPrompt || '');
  const [status, setStatus] = useState(data.taskId ? 'success' : 'idle');
  const [taskId, setTaskId] = useState(data.taskId || null);
  const [error, setError] = useState(null);

  // 旁白模式状态
  const [narratorMode, setNarratorMode] = useState(data.narratorMode || false);
  const [narratorIndex, setNarratorIndex] = useState(data.narratorIndex || 0);
  const [narratorTotal, setNarratorTotal] = useState(data.narratorTotal || 0);
  const [narratorSentences, setNarratorSentences] = useState(data.narratorSentences || []);

  // 同步 taskId
  useEffect(() => {
    if (data.taskId && data.taskId !== taskId) {
      setTaskId(data.taskId);
      if (data.taskId) {
        setStatus('success');
      }
    }
  }, [data.taskId]);

  // 通知父组件节点大小变化
  useEffect(() => {
    if (onSizeChangeRef.current) {
      onSizeChangeRef.current(nodeId, nodeSize.width, nodeSize.height);
    }
  }, [nodeSize.width, nodeSize.height, nodeId]);

  // 同步 taskId 到 node.data
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

  // 同步 manualPrompt 到 node.data
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

  // 同步旁白状态
  useEffect(() => {
    if (narratorMode) {
      const currentNode = getNodes().find((n) => n.id === nodeId);
      const currentIndex = currentNode?.data?.narratorIndex;

      if (currentIndex !== narratorIndex || currentNode?.data?.manualPrompt !== manualPrompt) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    narratorIndex,
                    manualPrompt,
                  },
                }
              : node
          )
        );
      }
    }
  }, [narratorIndex, manualPrompt, narratorMode, nodeId, setNodes, getNodes]);

  // 同步 data.narratorIndex 到内部状态
  useEffect(() => {
    const dataIndex = data.narratorIndex;
    if (dataIndex !== undefined && dataIndex !== null && dataIndex !== narratorIndex) {
      setNarratorIndex(dataIndex);
    }
  }, [data.narratorIndex, narratorIndex]);

  // 同步旁白句子数据
  useEffect(() => {
    const dataSentences = data.narratorSentences;
    const dataTotal = data.narratorTotal;
    const dataIndex = data.narratorIndex;

    const hasNewSentences = dataSentences && dataSentences.length > 0;
    const hasNewTotal = dataTotal !== undefined && dataTotal !== null;

    if (hasNewSentences || hasNewTotal) {
      if (hasNewSentences && dataSentences !== narratorSentences) {
        setNarratorSentences(dataSentences);
      }
      if (hasNewTotal && dataTotal !== narratorTotal) {
        setNarratorTotal(dataTotal);
      }
      if (dataIndex !== undefined && dataIndex !== null && dataIndex !== narratorIndex) {
        if (dataIndex >= 0 && dataIndex < (dataTotal || narratorSentences.length)) {
          setNarratorIndex(dataIndex);
        }
      }
    }
  }, [data.narratorSentences, data.narratorTotal, data.narratorIndex]);

  // Resize handling
  const handleResizeMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

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

  // 角色引用双显示功能
  const usernameToAlias = useMemo(() => {
    const map = {};
    connectedCharacters.forEach((char) => {
      map[char.username] = char.alias || char.username;
    });
    return map;
  }, [connectedCharacters]);

  const realToDisplay = (text) => {
    if (!text) return '';
    let result = text;
    Object.entries(usernameToAlias).forEach(([username, alias]) => {
      const regex = new RegExp(
        `@${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`,
        'g'
      );
      result = result.replace(regex, `@${alias}`);
    });
    return result;
  };

  const displayToReal = (text) => {
    if (!text) return '';
    let result = text;

    const sortedAliases = Object.entries(usernameToAlias).sort(
      (a, b) => b[1].length - a[1].length
    );

    sortedAliases.forEach(([username, alias]) => {
      const regex = new RegExp(
        `@${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|@)`,
        'g'
      );
      result = result.replace(regex, `@${username}`);
    });

    return result;
  };

  const insertCharacterAtCursor = (username, alias) => {
    const promptElement = promptInputRef.current;
    if (!promptElement) return;

    const start = promptElement.selectionStart;
    const end = promptElement.selectionEnd;
    const displayText = realToDisplay(manualPrompt);
    const refText = `@${alias} `;

    const newDisplayText = displayText.substring(0, start) + refText + displayText.substring(end);

    const newRealText = displayToReal(newDisplayText);
    setManualPrompt(newRealText);

    setTimeout(() => {
      promptElement.setSelectionRange(start + refText.length, start + refText.length);
      promptElement.focus();
    }, 0);
  };

  // 加载当前旁白（从 NarratorProcessorNode）
  const loadCurrentSentence = () => {
    if (narratorMode && narratorSentences.length > 0) {
      const currentSentence = narratorSentences[narratorIndex];
      if (currentSentence?.optimized) {
        setManualPrompt(currentSentence.optimized);
        return;
      }
    }

    // 降级：从源节点读取
    const edges = getEdges();
    const narratorEdge = edges.find(
      (e) => e.target === nodeId && e.sourceHandle === 'sentence-output'
    );

    if (narratorEdge) {
      const narratorNode = getNodes().find((n) => n.id === narratorEdge.source);
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
        }
      }
    }
  };

  // 加载下一个句子
  const loadNextSentence = () => {
    if (!narratorMode || narratorSentences.length === 0) {
      return;
    }

    const nextIndex = (narratorIndex + 1) % narratorTotal;
    const nextSentence = narratorSentences[nextIndex];

    if (nextSentence?.optimized) {
      setNarratorIndex(nextIndex);
      setManualPrompt(nextSentence.optimized);
    }
  };

  return {
    // 状态
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

    // Refs
    promptInputRef,
    nodeRef,
    resizeHandleRef,

    // 方法
    handleResizeMouseDown,
    realToDisplay,
    displayToReal,
    insertCharacterAtCursor,
    loadCurrentSentence,
    loadNextSentence,

    // 样式配置
    nodeColor,
    nodeBgColor,
    headerColor,
    handleColor,
    durationOptions,
  };
}
