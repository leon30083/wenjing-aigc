import React, { useState, useEffect } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import { useReactFlow } from 'reactflow';
import { WorkflowStorage } from '../../utils/workflowStorage';

/**
 * NarratorProcessorNode - 旁白处理器节点
 *
 * 功能：
 * - 接收 NarratorNode 的句子数组
 * - 逐句调用优化 API
 * - 显示优化进度（进度条 + 百分比）
 * - 输出优化结果到 VideoGenerateNode
 * - 支持"上一个/下一个句子"导航
 * - 支持重新优化单个句子
 */

const API_BASE = 'http://localhost:9000';

export default function NarratorProcessorNode({ data }) {
  const nodeId = useNodeId();
  const { getEdges, getNodes, setNodes } = useReactFlow();

  // ⭐ 使用 ref 防止初始化时被源节点覆盖
  const hasLoadedFromSourceRef = React.useRef(false);

  // 从 data 初始化状态（支持工作流恢复）
  const [sentences, setSentences] = useState(data.sentences || []);
  const [currentIndex, setCurrentIndex] = useState(data.currentIndex || 0);
  const [currentPrompt, setCurrentPrompt] = useState(data.currentPrompt || '');
  const [isOptimizing, setIsOptimizing] = useState(data.isOptimizing || false);
  const [progress, setProgress] = useState(data.progress || 0);
  const [connectedCharacters, setConnectedCharacters] = useState(data.connectedCharacters || []);
  const [openaiConfig, setOpenaiConfig] = useState(data.openaiConfig || null);
  const [style, setStyle] = useState(data.style || 'picture-book');
  const [targetDuration, setTargetDuration] = useState(data.targetDuration || 10);
  const [optimizationDirection, setOptimizationDirection] = useState(data.optimizationDirection || 'balanced');
  const [customStyleDescription, setCustomStyleDescription] = useState(data.customStyleDescription || '');

  /**
   * 接收来自 NarratorNode 的数据
   * ⭐ 优先使用已保存的优化数据，避免覆盖优化结果
   */
  useEffect(() => {
    if (nodeId && !hasLoadedFromSourceRef.current) {
      const edges = getEdges();
      const narratorEdge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'narrator-input'
      );

      if (narratorEdge) {
        const sourceNode = getNodes().find(n => n.id === narratorEdge.source);
        if (sourceNode?.type === 'narratorNode' && sourceNode.data?.sentences) {
          const sourceSentences = sourceNode.data.sentences || [];

          // ⭐ 关键：检查当前 state 中是否有已优化的数据
          const hasOptimizedData = sentences.some(s => s.optimized);

          // 如果已有优化数据，只更新配置参数，不覆盖 sentences
          if (hasOptimizedData) {
            console.log('[NarratorProcessorNode] ✅ 保留已优化的句子（', sentences.filter(s => s.optimized).length, '个），只更新配置');
            setStyle(sourceNode.data.style || 'picture-book');
            setTargetDuration(sourceNode.data.targetDuration || 10);
            setOptimizationDirection(sourceNode.data.optimizationDirection || 'balanced');
            setCustomStyleDescription(sourceNode.data.customStyleDescription || '');
            setConnectedCharacters(sourceNode.data.connectedCharacters || []);

            // ⭐ 恢复 UI 状态（进度、当前句子）
            const optimizedCount = sentences.filter(s => s.optimized).length;
            const totalCount = sentences.length;
            const restoredProgress = Math.round((optimizedCount / totalCount) * 100);
            setProgress(restoredProgress);

            // 恢复当前索引和提示词
            const savedIndex = data.currentIndex || 0;
            setCurrentIndex(savedIndex);
            if (sentences[savedIndex]?.optimized) {
              setCurrentPrompt(sentences[savedIndex].optimized);
            }
          } else {
            // 没有优化数据时，才从源节点读取句子
            console.log('[NarratorProcessorNode] 从源节点读取句子（未优化）');
            setSentences(sourceSentences);
            setStyle(sourceNode.data.style || 'picture-book');
            setTargetDuration(sourceNode.data.targetDuration || 10);
            setOptimizationDirection(sourceNode.data.optimizationDirection || 'balanced');
            setCustomStyleDescription(sourceNode.data.customStyleDescription || '');
            setConnectedCharacters(sourceNode.data.connectedCharacters || []);
          }

          // 标记已从源节点加载过
          hasLoadedFromSourceRef.current = true;
        }
      }
    }
  }, [nodeId, getEdges, getNodes]);

  /**
   * 接收来自 OpenAIConfigNode 的配置
   */
  useEffect(() => {
    if (nodeId) {
      const edges = getEdges();
      const configEdge = edges.find(
        (e) => e.target === nodeId && (e.targetHandle === 'openai-config' || e.targetHandle === undefined)
      );

      if (configEdge) {
        const sourceNode = getNodes().find(n => n.id === configEdge.source);
        // 兼容两种节点类型名称（注册时使用 openaiConfigNode，但可能存在大驼峰变体）
        console.log('[NarratorProcessorNode] 检测到 OpenAI 配置连接:', {
          sourceId: configEdge.source,
          sourceType: sourceNode?.type,
          hasOpenaiConfig: !!sourceNode?.data?.openaiConfig
        });

        if ((sourceNode?.type === 'openaiConfigNode' || sourceNode?.type === 'openAIConfigNode') && sourceNode.data?.openaiConfig) {
          setOpenaiConfig(sourceNode.data.openaiConfig);
          console.log('[NarratorProcessorNode] ✅ OpenAI 配置已加载');
        }
      } else {
        console.log('[NarratorProcessorNode] ⚠️ 未检测到 OpenAI 配置连接');
      }
    }
  }, [nodeId, getEdges, getNodes]);

  /**
   * ⭐ 新增：监听 node.data.openaiConfig 的变化（源节点推送数据时）
   * 这个 useEffect 会在 OpenAIConfigNode 推送数据时触发
   */
  useEffect(() => {
    if (data.openaiConfig && data.openaiConfig.api_key) {
      console.log('[NarratorProcessorNode] 从 node.data 同步 OpenAI 配置:', data.openaiConfig);
      setOpenaiConfig(data.openaiConfig);
    }
  }, [data.openaiConfig]);

  /**
   * 同步状态到 node.data（用于工作流保存）
   * ⭐ 关键：使用 ref 防止无限循环，只同步关键数据
   */
  const isInitialLoadRef = React.useRef(true);

  useEffect(() => {
    console.log('[NarratorProcessorNode] 🔧 同步 useEffect 触发:', { currentIndex, isInitialLoad: isInitialLoadRef.current });

    // 跳过初始加载（避免覆盖从 data 恢复的数据）
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      console.log('[NarratorProcessorNode] ⏭️ 跳过初始加载');
      return;
    }

    // 只同步最重要的数据（优化后的句子数组）
    // 避免同步过多数据导致无限循环
    const hasOptimizedData = sentences.some(s => s.optimized);
    if (!hasOptimizedData) {
      console.log('[NarratorProcessorNode] ⏭️ 没有优化数据，跳过同步');
      return; // 没有优化数据时不同步（避免覆盖旧数据）
    }

    console.log('[NarratorProcessorNode] ✅ 有优化数据，开始同步...');

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node;

        // ⭐ 在回调内部比较，使用 node.data 而不是 data prop
        const needsUpdate =
          JSON.stringify(node.data.sentences) !== JSON.stringify(sentences) ||
          node.data.currentIndex !== currentIndex ||
          node.data.style !== style ||
          node.data.targetDuration !== targetDuration ||
          node.data.optimizationDirection !== optimizationDirection ||
          node.data.customStyleDescription !== customStyleDescription;

        if (!needsUpdate) {
          console.log('[NarratorProcessorNode] ⏭️ 数据未变化，跳过同步');
          return node;
        }

        console.log('[NarratorProcessorNode] ✅ 数据已变化，同步到 node.data:', { currentIndex });

        return {
          ...node,
          data: {
            ...node.data,
            sentences,  // ⭐ 最重要：优化后的句子数组
            currentIndex,
            style,
            targetDuration,
            optimizationDirection,
            customStyleDescription
            // ⚠️ 不同步：isOptimizing, progress（运行时状态不需要保存）
          }
        };
      })
    );
  }, [sentences, currentIndex, style, targetDuration, optimizationDirection, customStyleDescription, nodeId, setNodes]);

  /**
   * 优化单个句子
   */
  const optimizeSentence = async (sentence) => {
    if (!openaiConfig) {
      console.error('[NarratorProcessorNode] 缺少 OpenAI 配置');
      return {
        ...sentence,
        status: 'error',
        error: '缺少 OpenAI 配置'
      };
    }

    // ⭐ 关键修复：直接从源节点读取最新的 connectedCharacters
    // 而不是依赖状态变量，确保使用最新的角色数据
    let latestConnectedCharacters = connectedCharacters; // 默认使用状态
    try {
      const edges = getEdges();
      const narratorEdge = edges.find(
        (e) => e.target === nodeId && e.targetHandle === 'narrator-input'
      );

      if (narratorEdge) {
        const sourceNode = getNodes().find(n => n.id === narratorEdge.source);
        if (sourceNode?.type === 'narratorNode' && sourceNode.data?.connectedCharacters) {
          latestConnectedCharacters = sourceNode.data.connectedCharacters;
          console.log('[NarratorProcessorNode] 从源节点读取角色数据:', latestConnectedCharacters.length, '个角色');
        }
      }
    } catch (error) {
      console.warn('[NarratorProcessorNode] 读取源节点角色数据失败，使用状态变量:', error);
    }

    // 检测角色引用
    const referencedUsernames = (sentence.text.match(/@[\w.-]+/g) || [])
      .map(ref => ref.substring(1));

    // 构建角色上下文（使用最新的 connectedCharacters）
    const referencedCharacters = latestConnectedCharacters.filter(char =>
      referencedUsernames.includes(char.username)
    );

    console.log('[NarratorProcessorNode] 优化句子:', {
      sentence: sentence.text,
      referencedUsernames,
      totalConnected: latestConnectedCharacters.length,
      matchedReferences: referencedCharacters.length
    });

    try {
      const response = await fetch(`${API_BASE}/api/openai/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: openaiConfig.base_url,
          api_key: openaiConfig.api_key,
          model: openaiConfig.model,
          prompt: sentence.text,
          style: style,
          customStyleDescription: customStyleDescription,
          optimizationDirection: optimizationDirection,
          context: {
            target_duration: targetDuration,
            characters: referencedCharacters.map(char => ({
              username: char.username,
              alias: char.alias || char.username,
              profilePictureUrl: char.profilePictureUrl
            }))
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        return {
          ...sentence,
          optimized: result.data.optimized_prompt,
          status: 'ready'
        };
      } else {
        return {
          ...sentence,
          status: 'error',
          error: result.error
        };
      }
    } catch (error) {
      console.error('[NarratorProcessorNode] 优化失败:', error);
      return {
        ...sentence,
        status: 'error',
        error: error.message
      };
    }
  };

  /**
   * 从上游节点加载旁白
   * ⭐ 新增：支持在 sentences 为空时主动加载
   */
  const loadFromSourceNode = async () => {
    const edges = getEdges();
    const narratorEdge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === 'narrator-input'
    );

    if (narratorEdge) {
      const sourceNode = getNodes().find(n => n.id === narratorEdge.source);
      if (sourceNode?.type === 'narratorNode' && sourceNode.data?.sentences) {
        const sourceSentences = sourceNode.data.sentences || [];

        console.log('[NarratorProcessorNode] 🔄 从上游节点加载旁白（', sourceSentences.length, '个句子）');

        setSentences(sourceSentences);
        setStyle(sourceNode.data.style || 'picture-book');
        setTargetDuration(sourceNode.data.targetDuration || 10);
        setOptimizationDirection(sourceNode.data.optimizationDirection || 'balanced');
        setCustomStyleDescription(sourceNode.data.customStyleDescription || '');
        setConnectedCharacters(sourceNode.data.connectedCharacters || []);

        return true;
      }
    }

    return false;
  };

  /**
   * 批量优化所有句子
   */
  const optimizeAllSentences = async () => {
    if (!openaiConfig) {
      alert('请先连接 OpenAI 配置节点');
      return;
    }

    // ⭐ 如果 sentences 为空，先从上游节点加载
    if (sentences.length === 0) {
      console.log('[NarratorProcessorNode] sentences 为空，尝试从上游节点加载...');
      const loaded = await loadFromSourceNode();
      if (!loaded) {
        alert('请先连接旁白输入节点或输入旁白文本');
        return;
      }
      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsOptimizing(true);
    setProgress(0);

    const results = [];
    let completedCount = 0;

    // ⭐ 优化：使用临时数组收集结果，最后一次性更新状态
    // 避免在循环中多次触发 setSentences 和同步 useEffect
    const tempSentences = [...sentences];

    for (let i = 0; i < tempSentences.length; i++) {
      // 更新临时数组的状态为优化中（仅用于 UI 显示）
      tempSentences[i] = { ...tempSentences[i], status: 'optimizing' };
      setSentences([...tempSentences]); // 仅更新 UI，触发同步 useEffect（但没有优化数据）

      // 更新进度
      setProgress(Math.round((completedCount / tempSentences.length) * 100));

      // 优化句子
      const optimized = await optimizeSentence(tempSentences[i]);
      results.push(optimized);

      // 更新临时数组
      tempSentences[i] = optimized;

      completedCount++;
      setProgress(Math.round((completedCount / tempSentences.length) * 100));
    }

    // ⭐ 关键：最后一次性设置所有优化后的句子
    // 这会触发同步 useEffect，将完整结果保存到 node.data
    setSentences(tempSentences);

    setIsOptimizing(false);
    setProgress(100);

    // 设置当前为第一个句子
    if (results.length > 0) {
      setCurrentIndex(0);
      setCurrentPrompt(results[0].optimized);

      // 更新连接的 VideoGenerateNode（传递优化后的句子数组）
      updateVideoGenerateNode(results[0].optimized, results);

      // ⭐ 派发事件通知 App.jsx 自动保存工作流
      console.log('[NarratorProcessorNode] 优化完成，派发保存工作流事件');
      window.dispatchEvent(new CustomEvent('narrator-optimization-complete', {
        detail: { nodeId, sentencesCount: results.length }
      }));
    }
  };

  /**
   * 更新 VideoGenerateNode 的提示词
   * @param {string} prompt - 优化后的提示词
   * @param {Array} optimizedSentences - 优化后的句子数组
   * @param {number} index - 当前句子索引
   */
  const updateVideoGenerateNode = (prompt, optimizedSentences, index = 0) => {
    console.log('[NarratorProcessorNode] updateVideoGenerateNode 被调用:', {
      prompt: prompt.substring(0, 50) + '...',
      sentencesCount: optimizedSentences.length,
      index: index
    });

    const edges = getEdges();
    const videoEdges = edges.filter(
      (e) => e.source === nodeId && e.sourceHandle === 'sentence-output'
    );

    console.log('[NarratorProcessorNode] 找到的视频生成节点连线:', videoEdges.length, '条');

    videoEdges.forEach((edge) => {
      const targetNode = getNodes().find(n => n.id === edge.target);
      console.log('[NarratorProcessorNode] 目标节点:', {
        id: targetNode?.id,
        type: targetNode?.type,
        edgeTargetHandle: edge.targetHandle
      });

      if (targetNode?.type === 'videoGenerateNode') {
        const newData = {
          ...targetNode.data,
          manualPrompt: prompt,
          narratorMode: true,
          narratorIndex: index,
          narratorTotal: optimizedSentences.length,
          narratorSentences: optimizedSentences
        };

        console.log('[NarratorProcessorNode] 准备更新 VideoGenerateNode 数据:', {
          narratorMode: true,
          narratorIndex: index,
          narratorTotal: optimizedSentences.length,
          narratorSentences: optimizedSentences.map(s => ({ original: s.text.substring(0, 20), optimized: s.optimized?.substring(0, 20) }))
        });

        setNodes((nds) =>
          nds.map((node) =>
            node.id === targetNode.id
              ? {
                  ...node,
                  data: newData
                }
              : node
          )
        );

        console.log('[NarratorProcessorNode] ✅ VideoGenerateNode 数据已更新');
      } else {
        console.warn('[NarratorProcessorNode] ⚠️ 目标节点类型不匹配:', targetNode?.type);
      }
    });
  };

  /**
   * 导航到上一个句子
   */
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;

      // ⭐ 先同步到 node.data（确保工作流保存最新状态）
      setNodes((nds) => {
        const updatedNodes = nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, currentIndex: newIndex } }
            : node
        );

        // ⭐ 立即保存工作流到 localStorage（防止 App 的 useEffect 覆盖）
        const currentWorkflowName = WorkflowStorage.getCurrentWorkflowName();
        if (currentWorkflowName) {
          const edges = getEdges();
          const result = WorkflowStorage.saveWorkflow(currentWorkflowName, updatedNodes, edges);
          if (result.success) {
            console.log(`[NarratorProcessorNode] ✅ 已保存工作流 "${currentWorkflowName}" (currentIndex: ${newIndex})`);
          } else {
            console.error(`[NarratorProcessorNode] ❌ 保存工作流失败: ${result.error}`);
          }
        }

        return updatedNodes;
      });

      setCurrentIndex(newIndex);
      setCurrentPrompt(sentences[newIndex].optimized);
      updateVideoGenerateNode(sentences[newIndex].optimized, sentences, newIndex);
    }
  };

  /**
   * 导航到下一个句子
   */
  const goToNext = () => {
    if (currentIndex < sentences.length - 1) {
      const newIndex = currentIndex + 1;

      // ⭐ 先同步到 node.data（确保工作流保存最新状态）
      setNodes((nds) => {
        const updatedNodes = nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, currentIndex: newIndex } }
            : node
        );

        // ⭐ 立即保存工作流到 localStorage（防止 App 的 useEffect 覆盖）
        const currentWorkflowName = WorkflowStorage.getCurrentWorkflowName();
        if (currentWorkflowName) {
          const edges = getEdges();
          const result = WorkflowStorage.saveWorkflow(currentWorkflowName, updatedNodes, edges);
          if (result.success) {
            console.log(`[NarratorProcessorNode] ✅ 已保存工作流 "${currentWorkflowName}" (currentIndex: ${newIndex})`);
          } else {
            console.error(`[NarratorProcessorNode] ❌ 保存工作流失败: ${result.error}`);
          }
        }

        return updatedNodes;
      });

      setCurrentIndex(newIndex);
      setCurrentPrompt(sentences[newIndex].optimized);
      updateVideoGenerateNode(sentences[newIndex].optimized, sentences, newIndex);
    }
  };

  /**
   * 重新优化当前句子
   */
  const reoptimizeCurrent = async () => {
    // ⭐ 如果 sentences 为空，先从上游节点加载
    if (sentences.length === 0) {
      console.log('[NarratorProcessorNode] sentences 为空，尝试从上游节点加载...');
      const loaded = await loadFromSourceNode();
      if (!loaded) {
        alert('请先连接旁白输入节点或输入旁白文本');
        return;
      }
      // 等待状态更新
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (currentIndex >= sentences.length) {
      return;
    }

    const sentence = sentences[currentIndex];

    // 更新状态为优化中
    setSentences((prev) =>
      prev.map((s, idx) =>
        idx === currentIndex ? { ...s, status: 'optimizing' } : s
      )
    );

    // 优化
    const optimized = await optimizeSentence(sentence);

    // 创建更新后的句子数组
    const updatedSentences = sentences.map((s, idx) =>
      idx === currentIndex ? optimized : s
    );

    // 更新句子状态
    setSentences(updatedSentences);

    // 更新当前提示词
    if (optimized.status === 'ready') {
      setCurrentPrompt(optimized.optimized);
      updateVideoGenerateNode(optimized.optimized, updatedSentences, currentIndex);
    }
  };

  const currentSentence = sentences[currentIndex] || null;
  const readyCount = sentences.filter(s => s.status === 'ready').length;
  const errorCount = sentences.filter(s => s.status === 'error').length;

  return (
    <div
      style={{
        padding: '10px',
        minWidth: '300px',
        maxWidth: '450px',
        background: '#ffffff',
        border: '2px solid #8b5cf6',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* 节点标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <span style={{ fontSize: '16px', marginRight: '8px' }}>⚙️</span>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>旁白处理器</span>
      </div>

      {/* 输入端口 - 旁白 */}
      <Handle
        type="target"
        position={Position.Left}
        id="narrator-input"
        style={{
          background: '#3b82f6',
          width: 10,
          height: 10,
          top: '15%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-70px',
          top: '15%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#3b82f6',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        旁白输入
      </div>

      {/* 输入端口 - OpenAI 配置 */}
      <Handle
        type="target"
        position={Position.Left}
        id="openai-config"
        style={{
          background: '#f59e0b',
          width: 10,
          height: 10,
          top: '35%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-75px',
          top: '35%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#f59e0b',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        OpenAI配置
      </div>

      {/* 优化进度 */}
      <div style={{ marginBottom: '10px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}
        >
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            优化进度: {readyCount}/{sentences.length} ({progress}%)
          </span>
          {errorCount > 0 && (
            <span style={{ fontSize: '10px', color: '#ef4444' }}>
              {errorCount} 个失败
            </span>
          )}
        </div>
        {/* 进度条 */}
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: isOptimizing ? '#3b82f6' : '#10b981',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* 当前句子 */}
      {currentSentence && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            当前句子 ({currentIndex + 1}/{sentences.length}):
          </div>
          <div
            style={{
              padding: '6px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#1f2937',
              maxHeight: '60px',
              overflowY: 'auto'
            }}
          >
            {currentSentence.text}
          </div>
        </div>
      )}

      {/* 优化结果 */}
      {currentSentence?.optimized && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            优化结果:
          </div>
          <div
            style={{
              padding: '6px',
              backgroundColor: '#ecfdf5',
              borderRadius: '4px',
              fontSize: '10px',
              color: '#065f46',
              maxHeight: '100px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              border: '1px solid #a7f3d0'
            }}
          >
            {currentPrompt}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          className="nodrag"
          onClick={optimizeAllSentences}
          disabled={isOptimizing || !openaiConfig}
          style={{
            padding: '6px 10px',
            fontSize: '11px',
            backgroundColor: isOptimizing ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isOptimizing ? 'not-allowed' : 'pointer',
            opacity: isOptimizing || !openaiConfig ? 0.5 : 1
          }}
        >
          {isOptimizing ? '🔄 优化中...' : '🚀 全部优化'}
        </button>

        <button
          className="nodrag"
          onClick={reoptimizeCurrent}
          disabled={isOptimizing || !openaiConfig}
          style={{
            padding: '6px 10px',
            fontSize: '11px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isOptimizing || !openaiConfig ? 'not-allowed' : 'pointer',
            opacity: isOptimizing || !openaiConfig ? 0.5 : 1
          }}
        >
          🔄 重新优化
        </button>

        <button
          className="nodrag"
          onClick={() => {
            if (currentPrompt) {
              navigator.clipboard.writeText(currentPrompt);
              alert('已复制到剪贴板');
            }
          }}
          disabled={!currentPrompt}
          style={{
            padding: '6px 10px',
            fontSize: '11px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: currentPrompt ? 'pointer' : 'not-allowed',
            opacity: currentPrompt ? 1 : 0.5
          }}
        >
          📋 复制
        </button>
      </div>

      {/* 导航按钮 */}
      {sentences.length > 0 && (
        <div style={{ marginBottom: '10px', display: 'flex', gap: '6px' }}>
          <button
            className="nodrag"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: currentIndex === 0 ? '#9ca3af' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1
            }}
          >
            &lt; 上一句
          </button>
          <button
            className="nodrag"
            onClick={goToNext}
            disabled={currentIndex >= sentences.length - 1}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '11px',
              backgroundColor: currentIndex >= sentences.length - 1 ? '#9ca3af' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentIndex >= sentences.length - 1 ? 'not-allowed' : 'pointer',
              opacity: currentIndex >= sentences.length - 1 ? 0.5 : 1
            }}
          >
            下一句 &gt;
          </button>
        </div>
      )}

      {/* 配置状态提示 */}
      {!openaiConfig && (
        <div
          style={{
            padding: '6px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#92400e',
            border: '1px solid #fde68a'
          }}
        >
          ⚠️ 请连接 OpenAI 配置节点
        </div>
      )}

      {sentences.length === 0 && openaiConfig && (
        <div
          style={{
            padding: '6px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#6b7280',
            textAlign: 'center'
          }}
        >
          💡 请连接旁白输入节点并输入文本
        </div>
      )}

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        id="sentence-output"
        style={{
          background: '#8b5cf6',
          width: 10,
          height: 10,
          top: '50%',
          right: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-60px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#8b5cf6',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        优化结果
      </div>
    </div>
  );
}
