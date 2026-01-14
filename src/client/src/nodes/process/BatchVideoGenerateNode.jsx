import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

/**
 * BatchVideoGenerateNode - 批量视频生成节点
 *
 * 功能：
 * - 接收 NarratorProcessorNode 的批量优化完成事件
 * - 显示所有句子的完整列表
 * - 支持勾选某些句子进行批量生成
 * - 支持编辑选中的句子
 * - 调用后端 BatchQueue API 批量生成
 * - 创建 BatchResultNode 显示进度
 */
function BatchVideoGenerateNode({ data }) {
  const nodeId = useNodeId();
  const { getEdges, getNodes, setNodes, addNodes, addEdges } = useReactFlow();

  // 从 data 初始化状态（支持工作流恢复）
  const [sentences, setSentences] = useState(data.sentences || []);
  const [selectedSentences, setSelectedSentences] = useState(() => {
    if (data.selectedSentences && Array.isArray(data.selectedSentences)) {
      return new Set(data.selectedSentences);
    }
    return new Set();
  });
  const [batchStatus, setBatchStatus] = useState(data.batchStatus || 'idle');
  const [batchId, setBatchId] = useState(data.batchId || null);
  const [duration, setDuration] = useState(data.duration || 15);  // ⭐ 默认15秒

  // ⭐ API 配置状态（用于显示）- 从 data.apiConfig 初始化，支持工作流恢复
  const [apiConfig, setApiConfig] = useState(() => {
    if (data.apiConfig && typeof data.apiConfig === 'object') {
      return {
        platform: data.apiConfig.platform || 'juxin',
        model: data.apiConfig.model || 'sora-2-all',
        aspect: data.apiConfig.aspect || '16:9',
        watermark: data.apiConfig.watermark || false,
        apiKey: data.apiConfig.apiKey || '',
      };
    }
    // 默认配置
    return {
      platform: 'juxin',
      model: 'sora-2-all',
      aspect: '16:9',
      watermark: false,
      apiKey: '',
    };
  });

  // ⭐ 同步 apiConfig 到 node.data（工作流持久化）
  const isInitialSyncRef = useRef(true);

  useEffect(() => {
    if (nodeId) {
      // ⭐ 深度比较，避免无限循环
      const currentApiConfig = data.apiConfig;
      const needsUpdate = !currentApiConfig ||
        currentApiConfig.platform !== apiConfig.platform ||
        currentApiConfig.model !== apiConfig.model ||
        currentApiConfig.aspect !== apiConfig.aspect ||
        currentApiConfig.watermark !== apiConfig.watermark ||
        currentApiConfig.apiKey !== apiConfig.apiKey;

      if (needsUpdate) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    apiConfig: apiConfig
                  }
                }
              : node
          )
        );
        console.log('[BatchVideoGenerateNode] ✅ API配置已同步到 node.data:', apiConfig);
      }

      isInitialSyncRef.current = false;
    }
  }, [apiConfig, nodeId, setNodes]); // ⭐ 移除 data.apiConfig 依赖，只监听 apiConfig 变化

  // ⭐ 恢复机制：监听 data.apiConfig 变化（由 APISettingsNode 推送）
  useEffect(() => {
    // 当 APISettingsNode 推送新配置时，同步到本地状态
    if (data.apiConfig && typeof data.apiConfig === 'object') {
      const needsUpdate =
        apiConfig.platform !== data.apiConfig.platform ||
        apiConfig.model !== data.apiConfig.model ||
        apiConfig.aspect !== data.apiConfig.aspect ||
        apiConfig.watermark !== data.apiConfig.watermark ||
        apiConfig.apiKey !== data.apiConfig.apiKey;

      if (needsUpdate) {
        console.log('[BatchVideoGenerateNode] 🔄 从 data.apiConfig 同步配置:', data.apiConfig);
        setApiConfig(data.apiConfig);
      }
    }
  }, [data.apiConfig]); // ⭐ 只依赖 data.apiConfig

  // ⭐ 手动编辑提示词（直接编辑模式，无需手动模式开关）
  const [manualPrompts, setManualPrompts] = useState(data.manualPrompts || {});

  // ⭐ 节点缩放功能 - 增加 default 高度以显示所有 9 个句子
  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    320,  // minWidth
    450,  // minHeight
    { width: 320, height: 500 }  // initialSize - 更高的默认高度
  );

  // ⭐ 监听批量优化完成事件
  useEffect(() => {
    const handleBatchOptimizationComplete = (event) => {
      const { sourceNodeId, sentences: optimizedSentences } = event.detail;

      console.log('[BatchVideoGenerateNode] 接收到批量优化完成事件:', {
        sourceNodeId,
        totalSentences: optimizedSentences?.length
      });

      // 验证事件来源
      const edges = getEdges();
      const narratorEdge = edges.find(
        (e) => e.source === sourceNodeId && e.target === nodeId
      );

      if (!narratorEdge) {
        console.log('[BatchVideoGenerateNode] 事件来源不匹配，忽略');
        return;
      }

      // 设置句子数据
      if (optimizedSentences && optimizedSentences.length > 1) {
        console.log('[BatchVideoGenerateNode] 🎬 接收到批量优化数据:', optimizedSentences.length, '句');
        setSentences(optimizedSentences);

        // 默认全选所有已优化的句子
        const optimizedIndexes = optimizedSentences
          .map((s, i) => s.optimized ? i : -1)
          .filter(i => i !== -1);
        setSelectedSentences(new Set(optimizedIndexes));

        // 同步到 node.data
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    sentences: optimizedSentences,
                    selectedSentences: optimizedIndexes
                  }
                }
              : node
          )
        );
      }
    };

    window.addEventListener('narrator-batch-optimization-complete', handleBatchOptimizationComplete);
    return () => {
      window.removeEventListener('narrator-batch-optimization-complete', handleBatchOptimizationComplete);
    };
  }, [getEdges, nodeId, getNodes, setNodes]);

  // ⭐ 时长同步到 node.data（工作流持久化）
  useEffect(() => {
    if (duration !== data.duration) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, duration } }
            : node
        )
      );
    }
  }, [duration, nodeId, setNodes, data.duration]);

  // ⭐ 手动编辑提示词同步到 node.data（工作流持久化）
  useEffect(() => {
    if (JSON.stringify(manualPrompts) !== JSON.stringify(data.manualPrompts)) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, manualPrompts } }
            : node
        )
      );
    }
  }, [manualPrompts, nodeId, setNodes, data.manualPrompts]);

  // ⭐ 监听 API 配置变化（从 APISettingsNode 或 data.apiConfig）
  useEffect(() => {
    const edges = getEdges();
    const apiConfigEdge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === 'api-config'
    );

    let newApiConfig = null;

    // 优先从连接的 APISettingsNode 获取
    if (apiConfigEdge) {
      const sourceNode = getNodes().find(n => n.id === apiConfigEdge.source);
      if (sourceNode?.type === 'apiSettingsNode' && sourceNode.data?.apiConfig) {
        newApiConfig = sourceNode.data.apiConfig;
      }
    }

    // 降级到 data.apiConfig（工作流恢复）
    if (!newApiConfig && data.apiConfig) {
      newApiConfig = data.apiConfig;
    }

    // 更新状态
    if (JSON.stringify(newApiConfig) !== JSON.stringify(apiConfig)) {
      setApiConfig(newApiConfig);
      // 同步到 node.data
      if (newApiConfig) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, apiConfig: newApiConfig } }
              : node
          )
        );
      }
    }
  }, [getEdges, getNodes, nodeId, setNodes, data.apiConfig, apiConfig]);

  // ⭐ 监听工作流保存前事件，强制同步最新状态
  useEffect(() => {
    const handleBeforeSave = () => {
      console.log('[BatchVideoGenerateNode] 📥 收到 workflow-before-save 事件，强制同步最新状态');
      // 立即同步当前状态到 node.data
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;

          return {
            ...node,
            data: {
              ...node.data,
              sentences,
              selectedSentences: Array.from(selectedSentences),
              manualPrompts,
              duration,
              batchStatus,
              batchId,
              apiConfig,
            }
          };
        })
      );
    };

    window.addEventListener('workflow-before-save', handleBeforeSave);
    return () => {
      window.removeEventListener('workflow-before-save', handleBeforeSave);
    };
  }, [sentences, selectedSentences, manualPrompts, duration, batchStatus, batchId, apiConfig, nodeId, setNodes]);

  // ⭐ 监听 BatchResultNode 的数据更新事件（同步 jobStatuses 到 node.data）
  useEffect(() => {
    const handleBatchResultUpdate = (event) => {
      const { batchId: updatedBatchId, jobStatuses } = event.detail;

      // ⭐ 只处理属于当前批量任务的事件
      if (updatedBatchId === batchId) {
        console.log('[BatchVideoGenerateNode] 收到 BatchResultNode 更新事件:', Object.keys(jobStatuses).length);

        // ⭐ 更新 BatchResultNode 的 node.data.jobStatuses
        setNodes((nds) =>
          nds.map((node) =>
            node.type === 'batchResultNode' && node.data.batchId === updatedBatchId
              ? { ...node, data: { ...node.data, jobStatuses } }
              : node
          )
        );
      }
    };

    window.addEventListener('batch-result-update', handleBatchResultUpdate);
    return () => {
      window.removeEventListener('batch-result-update', handleBatchResultUpdate);
    };
  }, [batchId, setNodes]);

  /**
   * 切换句子选择状态
   */
  const toggleSentenceSelection = (index) => {
    const newSelected = new Set(selectedSentences);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSentences(newSelected);

    // 同步到 node.data
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, selectedSentences: Array.from(newSelected) } }
          : node
      )
    );
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    const allIndexes = sentences.map((_, i) => i);
    if (selectedSentences.size === allIndexes.length) {
      // 取消全选
      setSelectedSentences(new Set());
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, selectedSentences: [] } }
            : node
        )
      );
    } else {
      // 全选
      setSelectedSentences(new Set(allIndexes));
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, selectedSentences: allIndexes } }
            : node
        )
      );
    }
  };

  /**
   * 批量生成视频
   */
  const generateBatchVideos = async () => {
    // ⭐ 重置状态（允许重新提交）
    setBatchStatus('idle');
    setBatchId(null);

    if (selectedSentences.size === 0) {
      alert('⚠️ 请先选择要生成的句子');
      return;
    }

    // ⭐ 使用组件状态中的 apiConfig（它已经通过 useEffect 同步最新值）
    // 如果没有 apiConfig，使用默认配置
    const finalApiConfig = apiConfig || {
      platform: 'juxin',
      model: 'sora-2-all',
      aspect: '16:9',
      watermark: false
    };

    // 获取连接的参考图片
    const edges = getEdges();
    const imagesEdge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === 'images-input'
    );
    let connectedImages = [];
    if (imagesEdge) {
      const sourceNode = getNodes().find(n => n.id === imagesEdge.source);
      if (sourceNode?.type === 'referenceImageNode' && sourceNode.data?.selectedImages) {
        connectedImages = sourceNode.data.selectedImages;
      }
    }

    console.log('[BatchVideoGenerateNode] 🎬 开始批量生成:', {
      selectedCount: selectedSentences.size,
      platform: finalApiConfig.platform,
      imagesCount: connectedImages.length
    });

    setBatchStatus('generating');

    try {
      // 🎯 步骤1: 创建批量任务
      const selectedSentencesArray = Array.from(selectedSentences).sort((a, b) => a - b);
      const jobs = selectedSentencesArray.map(index => sentences[index]);

      const createBatchResponse = await fetch(`${API_BASE}/api/batch/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: finalApiConfig.platform,
          jobs: jobs
            .filter(s => s.optimized)
            .map((s, arrIndex) => {
              const sentenceIndex = selectedSentencesArray[arrIndex];
              // ⭐ 优先级: 手动 > 优化 > 原文
              const finalPrompt = manualPrompts[sentenceIndex] || s.optimized || s.text;
              return {
                prompt: finalPrompt,
                model: finalApiConfig.model === 'sora-2' ? 'sora-2-all' : finalApiConfig.model,
                duration: duration,  // ⭐ 使用状态值（默认15秒）
                aspect_ratio: finalApiConfig.aspect === '16:9' ? 'landscape' : 'portrait',
                watermark: finalApiConfig.watermark,
                images: connectedImages.length > 0 ? connectedImages : []
              };
            })
        })
      });

      const createBatchResult = await createBatchResponse.json();

      if (!createBatchResult.success) {
        throw new Error(createBatchResult.error || '创建批量任务失败');
      }

      const { batchId: newBatchId } = createBatchResult.data;
      console.log('[BatchVideoGenerateNode] ✅ 批量任务已创建:', newBatchId);

      // 🎯 步骤2: 提交所有任务
      const submitBatchResponse = await fetch(`${API_BASE}/api/batch/${newBatchId}/submit`, {
        method: 'POST'
      });

      const submitBatchResult = await submitBatchResponse.json();

      if (!submitBatchResult.success) {
        throw new Error(submitBatchResult.error || '提交批量任务失败');
      }

      console.log('[BatchVideoGenerateNode] ✅ 批量任务已提交:', {
        totalJobs: submitBatchResult.data.totalJobs,
        submittedJobs: submitBatchResult.data.submittedJobs
      });

      // 🎯 步骤3: 创建 BatchResultNode
      console.log('[BatchVideoGenerateNode] 准备创建 BatchResultNode...', {
        batchId: newBatchId,
        jobsCount: jobs.length,
        submitData: submitBatchResult.data
      });

      // ⭐ 关键修复：直接内联创建节点逻辑（避免 TDZ 错误）
      const sourceNode = getNodes().find(n => n.id === nodeId);
      const posX = sourceNode.position.x + 400;
      const posY = sourceNode.position.y;

      const newNodeId = `batchresult-${Date.now()}`;

      const newNode = {
        id: newNodeId,
        type: 'batchResultNode',
        position: { x: posX, y: posY },
        data: {
          batchId: newBatchId,
          platform: finalApiConfig.platform,
          totalJobs: submitBatchResult.data.totalJobs,
          jobs: submitBatchResult.data.jobs,
          sentences: jobs,
          connectedSourceId: nodeId
        }
      };

      // ⭐ 关键修复：先更新当前节点状态，再创建 BatchResultNode（避免 setNodes 覆盖 addNodes 的结果）
      setBatchStatus('submitted');
      setBatchId(newBatchId);

      // 同步到 node.data（在 addNodes 之前）
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  batchStatus: 'submitted',
                  batchId: newBatchId
                }
              }
          : node
        )
      );

      // 🎯 步骤3: 创建 BatchResultNode（现在 setNodes 已经完成，不会被覆盖）
      // ⭐ 修复：addNodes 和 addEdges 需要传入数组
      addNodes([newNode]);

      const newEdge = {
        id: `edge-${nodeId}-${newNodeId}`,
        source: nodeId,
        target: newNodeId,
        sourceHandle: 'batch-output',
        targetHandle: 'batch-input'
      };

      addEdges([newEdge]);

      console.log('[BatchVideoGenerateNode] ✅ BatchResultNode 已创建:', newNodeId);
      console.log('[BatchVideoGenerateNode] 📊 新节点数据:', { newNodeId, batchId: newBatchId, totalJobs: submitBatchResult.data.totalJobs });

    } catch (error) {
      console.error('[BatchVideoGenerateNode] ❌ 批量生成失败:', error);
      alert(`❌ 批量生成失败: ${error.message}`);
      setBatchStatus('error');
    }
  };

  /**
   * 获取句子预览文本
   */
  const getSentencePreview = (sentence) => {
    const text = sentence.optimized || sentence.text || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  };

  return (
    <div style={{
      padding: '12px',
      ...resizeStyles,  // ⭐ 应用节点缩放样式
      background: '#ffffff',
      border: '2px solid #8b5cf6',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* 输入端口 - 旁白处理器 */}
      <Handle
        type="target"
        position={Position.Left}
        id="narrator-input"
        style={{
          background: '#3b82f6',
          width: 10,
          height: 10,
          top: '20%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-85px',
          top: '20%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#3b82f6',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        旁白输入
      </div>

      {/* 输入端口 - API 配置 */}
      <Handle
        type="target"
        position={Position.Left}
        id="api-config"
        style={{
          background: '#f59e0b',
          width: 10,
          height: 10,
          top: '50%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-85px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#f59e0b',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        API配置
      </div>

      {/* 输入端口 - 参考图片 */}
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{
          background: '#10b981',
          width: 10,
          height: 10,
          top: '80%',
          left: '-5px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-80px',
          top: '80%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#10b981',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        参考图
      </div>

      {/* 节点标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '8px' }}>🎬</span>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#6b21a8' }}>
          批量视频生成
        </span>
      </div>

      {/* API 配置信息显示 ⭐ */}
      {apiConfig && (
        <div style={{
          padding: '8px',
          backgroundColor: '#eff6ff',
          borderRadius: '4px',
          marginBottom: '10px',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ fontSize: '10px', color: '#1e40af', marginBottom: '4px', fontWeight: 'bold' }}>
            ⚙️ API 配置
          </div>
          <div style={{ fontSize: '10px', color: '#1e3a8a' }}>
            {apiConfig.platform === 'juxin' ? '聚鑫' : '贞贞'} | {apiConfig.model.toUpperCase()} | {apiConfig.aspect} | {apiConfig.watermark ? '水印' : '无水印'}
          </div>
        </div>
      )}

      {/* 句子列表 */}
      {sentences.length === 0 ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            border: '1px dashed #d1d5db'
          }}
        >
          💡 请连接旁白处理器节点，等待优化完成...
        </div>
      ) : (
        <>
          {/* 时长配置 */}
          <div style={{ padding: '8px', backgroundColor: '#d1fae5', borderRadius: '4px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', marginBottom: '6px' }}>
              ⏱️ 视频时长
            </div>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={batchStatus === 'generating' || batchStatus === 'submitted'}
              className="nodrag"
              style={{ width: '100%', padding: '6px', borderRadius: '4px' }}
            >
              <option value={5}>5 秒</option>
              <option value={10}>10 秒</option>
              <option value={15}>15 秒 ⭐ 推荐</option>
              <option value={25}>25 秒</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '6px' }}>
            <button
              onClick={toggleSelectAll}
              className="nodrag"
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {selectedSentences.size === sentences.length ? '☑ 取消全选' : '☐ 全选'}
            </button>
            <div style={{ flex: 1, fontSize: '11px', color: '#6b7280', textAlign: 'center', padding: '6px' }}>
              已选: {selectedSentences.size}/{sentences.length}
            </div>
          </div>

          {/* 句子列表 - 直接编辑模式（参考VideoGenerateNode） */}
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '12px'
            }}
          >
            {sentences.map((sentence, index) => {
              const isSelected = selectedSentences.has(index);
              const hasManualEdit = manualPrompts[index] !== undefined && manualPrompts[index] !== '';
              const finalPrompt = manualPrompts[index] || sentence.optimized || sentence.text;

              return (
                <div
                  key={index}
                  style={{
                    border: isSelected ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '8px',
                    backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* 句子标题栏 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSentenceSelection(index)}
                      className="nodrag"
                      style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151' }}>
                      句子 {index + 1}
                    </span>
                    {sentence.optimized && (
                      <span style={{ fontSize: '9px', color: '#059669', fontWeight: 'bold' }}>
                        ✓ 已优化
                      </span>
                    )}
                    {hasManualEdit && (
                      <span style={{ fontSize: '9px', color: '#dc2626', fontWeight: 'bold' }}>
                        📝 手动编辑
                      </span>
                    )}
                  </div>

                  {/* ⭐ 直接编辑的 textarea（参考VideoGenerateNode） */}
                  <textarea
                    className="nodrag"
                    value={finalPrompt}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setManualPrompts(prev => ({
                        ...prev,
                        [index]: newValue
                      }));
                    }}
                    onWheel={(e) => e.stopPropagation()}
                    placeholder={`句子 ${index + 1} 提示词...`}
                    disabled={batchStatus === 'generating' || batchStatus === 'submitted'}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#1f2937',  // ⭐ 添加深色字体确保清晰可见
                      border: hasManualEdit ? '2px solid #dc2626' : '1px solid #d1d5db',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      backgroundColor: hasManualEdit ? '#fef2f2' : '#ffffff',
                      marginBottom: '4px'
                    }}
                  />

                  {/* 最终提示词预览（参考VideoGenerateNode） */}
                  {finalPrompt && finalPrompt.length > 0 && (
                    <div style={{
                      padding: '4px 6px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '3px',
                      fontSize: '9px',
                      color: '#166534',
                      fontStyle: 'italic',
                      border: '1px dashed #6ee7b7',
                      wordBreak: 'break-word'
                    }}>
                      📤 最终提示词: {finalPrompt.substring(0, 80)}{finalPrompt.length > 80 ? '...' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={generateBatchVideos}
            disabled={batchStatus === 'generating' || selectedSentences.size === 0}
            className="nodrag"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 'bold',
              background: batchStatus === 'generating'
                ? '#9ca3af'
                : (batchStatus === 'submitted'
                  ? '#10b981'
                  : (selectedSentences.size === 0
                    ? '#e5e7eb'
                    : '#8b5cf6')),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (batchStatus === 'generating' || selectedSentences.size === 0)
                ? 'not-allowed'
                : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {batchStatus === 'generating' && '🔄 生成中...'}
            {batchStatus === 'submitted' && `✅ 已提交 (查看 BatchResultNode)`}
            {batchStatus === 'idle' && selectedSentences.size === 0 && '⚠️ 请先选择句子'}
            {batchStatus === 'idle' && selectedSentences.size > 0 && `🎬 生成选中的 ${selectedSentences.size} 个视频`}
            {batchStatus === 'error' && '❌ 生成失败，请重试'}
          </button>

          {/* 状态提示 */}
          {batchStatus === 'submitted' && batchId && (
            <div style={{
              marginTop: '8px',
              fontSize: '10px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              批量任务 ID: {batchId}
            </div>
          )}
        </>
      )}

      {/* 输出端口 - 批量结果 */}
      <Handle
        type="source"
        position={Position.Right}
        id="batch-output"
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
          right: '-75px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#8b5cf6',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}
      >
        批量结果
      </div>

      {/* ⭐ 缩放手柄 */}
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

export default BatchVideoGenerateNode;
