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
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [batchStatus, setBatchStatus] = useState(data.batchStatus || 'idle');
  const [batchId, setBatchId] = useState(data.batchId || null);

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
   * 开始编辑句子
   */
  const startEditing = (index) => {
    setEditingIndex(index);
    setEditText(sentences[index]?.optimized || sentences[index]?.text || '');
  };

  /**
   * 保存编辑
   */
  const saveEdit = () => {
    if (editingIndex !== null) {
      const newSentences = [...sentences];
      newSentences[editingIndex] = {
        ...newSentences[editingIndex],
        optimized: editText
      };
      setSentences(newSentences);
      setEditingIndex(null);
      setEditText('');

      // 同步到 node.data
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, sentences: newSentences } }
            : node
        )
      );
    }
  };

  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
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

    // 获取 API 配置（从连接的 APISettingsNode 或使用默认配置）
    const edges = getEdges();
    const apiConfigEdge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === 'api-config'
    );

    let apiConfig = {
      platform: 'juxin',
      model: 'sora-2-all',
      aspect: '16:9',
      watermark: false
    };

    if (apiConfigEdge) {
      const sourceNode = getNodes().find(n => n.id === apiConfigEdge.source);
      if (sourceNode?.type === 'apiSettingsNode' && sourceNode.data?.apiConfig) {
        apiConfig = sourceNode.data.apiConfig;
      }
    }

    // 获取连接的参考图片
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
      platform: apiConfig.platform,
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
          platform: apiConfig.platform,
          jobs: jobs
            .filter(s => s.optimized)
            .map(s => ({
              prompt: s.optimized,
              model: apiConfig.model === 'sora-2' ? 'sora-2-all' : apiConfig.model,
              duration: 10,
              aspect_ratio: apiConfig.aspect === '16:9' ? 'landscape' : 'portrait',
              watermark: apiConfig.watermark,
              images: connectedImages.length > 0 ? connectedImages : []
            }))
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
          platform: data.apiConfig?.platform || 'juxin',
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

          {/* 句子列表 */}
          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '12px'
            }}
          >
            {sentences.map((sentence, index) => {
              const isSelected = selectedSentences.has(index);
              const isEditing = editingIndex === index;

              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '6px',
                    backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                    transition: 'background-color 0.2s'
                  }}
                >
                  {/* 句子标题 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSentenceSelection(index)}
                      className="nodrag"
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151' }}>
                      句子 {index + 1}
                    </span>
                    <span style={{ fontSize: '9px', color: '#6b7280' }}>
                      ({sentence.optimized ? '✓ 已优化' : '⏳ 待优化'})
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(index)}
                        className="nodrag"
                        style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          fontSize: '9px',
                          background: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ 编辑
                      </button>
                    )}
                  </div>

                  {/* 句子内容 */}
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="nodrag"
                        style={{
                          width: '100%',
                          minHeight: '60px',
                          padding: '6px',
                          fontSize: '11px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                          fontFamily: 'monospace'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <button
                          onClick={saveEdit}
                          className="nodrag"
                          style={{
                            flex: 1,
                            padding: '4px',
                            fontSize: '10px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ 保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="nodrag"
                          style={{
                            flex: 1,
                            padding: '4px',
                            fontSize: '10px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ 取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#4b5563',
                        lineHeight: '1.4',
                        padding: '4px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '3px'
                      }}
                    >
                      {getSentencePreview(sentence)}
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
