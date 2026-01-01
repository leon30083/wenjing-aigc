import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function TaskResultNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes, getNodes } = useReactFlow();

  // ⭐ 关键修复：从 data 恢复状态（支持工作流加载）
  const [taskId, setTaskId] = useState(data.taskId || null);
  const taskIdRef = useRef(taskId);
  const [taskStatus, setTaskStatus] = useState(data.taskStatus || 'idle');
  const [videoUrl, setVideoUrl] = useState(data.videoUrl || null);
  const [error, setError] = useState(data.error || null);
  const [polling, setPolling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(null); // 'taskId' | 'videoUrl' | null

  // ⭐ 新增：存储平台信息（用于 API 调用）
  const [platform, setPlatform] = useState(data.platform || 'juxin');

  // ⭐ 新增：存储任务进度百分比（0-100）
  const [progress, setProgress] = useState(data.progress || 0);

  // ⭐ 新增：标记是否从历史记录加载（已完成的任务，不需要轮询）
  const isCompletedFromHistoryRef = useRef(false);

  // ⭐ 新增：使用 useRef 存储 connectedSourceId，避免 useEffect 依赖 data
  const connectedSourceIdRef = useRef(data.connectedSourceId);
  useEffect(() => {
    connectedSourceIdRef.current = data.connectedSourceId;
  }, [data.connectedSourceId]);

  const { resizeStyles, handleResizeMouseDown, getResizeHandleStyles } = useNodeResize(
    data,
    300, // minWidth
    280, // minHeight
    { width: 320, height: 300 } // initialSize
  );

  // Update ref when taskId changes
  useEffect(() => {
    taskIdRef.current = taskId;
  }, [taskId]);

  // ⭐ useEffect 1: 从 data 恢复状态（工作流加载时）
  useEffect(() => {
    // ⭐ 总是恢复 platform（无论什么情况）
    if (data.platform) {
      setPlatform(data.platform);
    }

    // ⭐ 关键修复：优先检查是否是已完成的任务（无论来源）
    const isCompletedTask = data.taskStatus === 'SUCCESS' && data.videoUrl;

    if (data._isCompletedFromHistory || isCompletedTask) {
      console.log('[TaskResultNode] Restoring state from history/completed task');
      // ⭐ 立即设置 ref（在 setState 之前）
      isCompletedFromHistoryRef.current = true;

      // 一次性恢复所有状态（除了 taskId，taskId 由事件监听器管理）
      if (data.taskStatus) {
        setTaskStatus(data.taskStatus);
      }
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      }
      if (data.error) {
        setError(data.error);
      }
      // ⭐ 恢复 progress 值（对于已完成的任务，如果没有有效进度则默认 100%）
      if (data.taskStatus === 'SUCCESS' && (!data.progress || data.progress === 0)) {
        // 已完成的任务默认 100%
        setProgress(100);
      } else if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      setPolling(false);
      return;
    }

    // ⭐ 关键修复：如果 ref 已经是 false（新任务），跳过恢复
    // 这防止新任务被历史记录覆盖
    // ⚠️ 必须放在 _isCompletedFromHistory 检查之后！
    if (!isCompletedFromHistoryRef.current) {
      console.log('[TaskResultNode] Skipping restore (new task in progress)');
      return;
    }

    // 新任务路径（只在初始化时运行一次）
    if (data.taskId && data.taskId !== taskIdRef.current && taskIdRef.current === null) {
      console.log('[TaskResultNode] Initial taskId from data:', data.taskId);
      setTaskId(data.taskId);

      // ⭐ 关键：检查是否已完成（必须同时满足两个条件）
      if (data.taskStatus === 'SUCCESS' && data.videoUrl) {
        isCompletedFromHistoryRef.current = true;
        setPolling(false);
        setTaskStatus(data.taskStatus);
        setVideoUrl(data.videoUrl);
        // ⭐ 已完成的任务设置 progress 为 100（如果没有有效进度）
        if (data.progress && data.progress > 0) {
          setProgress(data.progress);
        } else {
          setProgress(100);
        }
        if (data.error) {
          setError(data.error);
        }
      } else {
        isCompletedFromHistoryRef.current = false;
      }
    }
  }, []); // ⭐ 空依赖数组：只在挂载时运行一次

  // ⭐ useEffect 1.5: 从连接的 VideoGenerateNode 读取 platform（修复旧数据）
  useEffect(() => {
    const sourceId = data.connectedSourceId || connectedSourceIdRef.current;
    if (sourceId && (!platform || platform === 'juxin')) {
      // 查找连接的源节点
      const allNodes = getNodes();
      const sourceNode = allNodes.find(n => n.id === sourceId);

      // 如果源节点是 VideoGenerateNode 且有 apiConfig，读取 platform
      if (sourceNode && sourceNode.type === 'videoGenerateNode' && sourceNode.data?.apiConfig?.platform) {
        const sourcePlatform = sourceNode.data.apiConfig.platform;

        // 更新内部状态和 node.data
        setPlatform(sourcePlatform);
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, platform: sourcePlatform } }
              : node
          )
        );
      }
    }
  }, [data.connectedSourceId]); // ⭐ 当连接变化时运行

  // ⭐ useEffect 2: 设置事件监听器（只在挂载时执行一次）
  useEffect(() => {
    // Listen for custom event when video is created
    const handleVideoCreated = (event) => {
      const { sourceNodeId, taskId: newTaskId, platform: newPlatform } = event.detail;
      // ⭐ 修复：使用 connectedSourceIdRef.current 而不是 data.connectedSourceId
      // ref 始终保持最新值（由另一个 useEffect 更新），避免闭包陷阱
      const connectedSourceId = connectedSourceIdRef.current;
      console.log('[TaskResultNode] Event received:', { sourceNodeId, newTaskId, newPlatform, connectedSourceId });

      // ⭐ 新增：验证源节点类型
      // 获取所有节点并找到源节点，验证其类型是否有效
      const allNodes = getNodes();
      const sourceNode = allNodes.find(n => n.id === sourceNodeId);
      const validSourceTypes = ['videoGenerateNode', 'storyboardNode', 'characterCreateNode'];

      // 检查：1) connectedSourceId 匹配 2) 源节点类型有效 3) newTaskId 存在且不同
      if (connectedSourceId === sourceNodeId &&
          sourceNode &&
          validSourceTypes.includes(sourceNode.type) &&
          newTaskId &&
          newTaskId !== taskIdRef.current) {
        console.log('[TaskResultNode] Match! Setting taskId:', newTaskId, 'platform:', newPlatform);

        // ⭐ 关键修复：先设置 ref 为 true，确保后续恢复逻辑使用新数据
        // 这会阻止 useEffect 1 从旧 data 恢复 taskId
        isCompletedFromHistoryRef.current = true;

        // ⭐ 关键修复：立即同步到 node.data（不等 useEffect）
        // 这确保 VideoGenerateNode 的 getNodes() 调用能捕获到正确的 taskId
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    taskId: newTaskId,
                    platform: newPlatform || 'juxin', // ⭐ 保存 platform
                    taskStatus: 'idle',
                    videoUrl: null,
                    error: null,
                    _isCompletedFromHistory: false // 新任务不是历史记录
                  }
                }
              : node
          )
        );

        // 然后更新 useState（用于 UI）
        setTaskId(newTaskId);
        setPlatform(newPlatform || 'juxin'); // ⭐ 更新 platform 状态
        setTaskStatus('idle');
        setVideoUrl(null);
        setError(null);
        setPolling(false);
        isCompletedFromHistoryRef.current = false; // ⭐ 恢复 ref 值，允许后续更新
      }
    };

    window.addEventListener('video-task-created', handleVideoCreated);

    return () => {
      window.removeEventListener('video-task-created', handleVideoCreated);
    };
  }, []); // ⭐ 空依赖数组：只在组件挂载时执行一次，使用 ref 获取最新值

  // Poll task status when taskId is set
  useEffect(() => {
    if (!taskId) {
      return;
    }

    // ⭐ 新增：如果是已完成的历史记录，不开始轮询
    if (isCompletedFromHistoryRef.current) {
      console.log('[TaskResultNode] Skipping polling for completed task from history');
      return;
    }

    // Stop if task completed successfully with video URL or failed
    if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        // ⭐ 使用正确的 platform 参数并添加缓存破坏
        const cacheBuster = Date.now();
        const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}&_t=${cacheBuster}`);
        const result = await response.json();

        if (result.success && result.data) {
          const { status, data: taskData, progress: taskProgress } = result.data;
          setTaskStatus(status);

          // ⭐ 更新进度百分比（支持数字和字符串格式 "100%"）
          if (typeof taskProgress === 'number') {
            setProgress(taskProgress);
          } else if (typeof taskProgress === 'string') {
            const parsedProgress = parseInt(taskProgress.replace('%', ''));
            if (!isNaN(parsedProgress)) {
              setProgress(parsedProgress);
            }
          }

          if (status === 'SUCCESS' && taskData?.output) {
            // ⭐ 处理视频 URL：如果是相对路径，拼接完整 URL
            let finalVideoUrl = taskData.output;
            if (finalVideoUrl.startsWith('/downloads/')) {
              finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
            }

            // ⭐ 新增：如果当前是本地路径，不覆盖
            const currentIsLocal = videoUrl?.includes('/downloads/');
            const newIsLocal = taskData.output?.startsWith('/downloads/');

            if (currentIsLocal && !newIsLocal) {
              console.log('[TaskResultNode] 保留本地路径，忽略远程 URL:', taskData.output);
              return; // 不覆盖本地路径
            }

            setVideoUrl(finalVideoUrl);
            setProgress(100); // ⭐ 关键：任务完成时设置进度为 100%
            setPolling(false);
            clearInterval(pollInterval);
            console.log('[TaskResultNode] Video URL set:', finalVideoUrl);
          } else if (status === 'FAILURE') {
            setError(taskData?.fail_reason || '生成失败');
            setPolling(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('[TaskResultNode] Failed to poll task status:', err);
      }
    }, 30000); // Poll every 30 seconds

    setPolling(true);

    return () => {
      clearInterval(pollInterval);
      setPolling(false);
    };
  }, [taskId, taskStatus, platform]); // ⭐ 移除 videoUrl，避免循环；添加 platform

  // ⭐ 关键修复：将结果同步到 node.data（用于工作流快照保存）
  // 使用 ref 存储上次的值，避免无限循环
  const lastSyncedDataRef = useRef({ taskId: null, taskStatus: null, videoUrl: null, error: null });

  useEffect(() => {
    // 当任务完成或有结果时，同步到 node.data
    if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
      // ⭐ 关键：只在值真正变化时才调用 setNodes()，避免无限循环
      const currentData = { taskId, taskStatus, videoUrl, error };
      const lastData = lastSyncedDataRef.current;

      const hasChanged =
        currentData.taskId !== lastData.taskId ||
        currentData.taskStatus !== lastData.taskStatus ||
        currentData.videoUrl !== lastData.videoUrl ||
        currentData.error !== lastData.error;

      if (hasChanged) {
        console.log('[TaskResultNode] Syncing to node.data:', currentData);
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    taskId,
                    taskStatus,
                    videoUrl,
                    error
                  }
                }
              : node
          )
        );
        lastSyncedDataRef.current = currentData;
      }
    }
  }, [taskStatus, videoUrl, error, taskId, nodeId, setNodes]);

  // Manual refresh
  const refreshStatus = async () => {
    if (!taskId) return;

    try {
      // ⭐ 添加时间戳破坏缓存，使用正确的 platform
      const cacheBuster = Date.now();
      const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=${platform}&_t=${cacheBuster}`);
      const result = await response.json();

      if (result.success && result.data) {
        const { status, data: taskData, progress: taskProgress } = result.data;
        setTaskStatus(status);

        // ⭐ 更新进度百分比（支持数字和字符串格式 "100%"）
        if (typeof taskProgress === 'number') {
          setProgress(taskProgress);
        } else if (typeof taskProgress === 'string') {
          const parsedProgress = parseInt(taskProgress.replace('%', ''));
          if (!isNaN(parsedProgress)) {
            setProgress(parsedProgress);
          }
        }

        if (status === 'SUCCESS' && taskData?.output) {
          // ⭐ 处理视频 URL：如果是相对路径，拼接完整 URL
          let finalVideoUrl = taskData.output;
          if (finalVideoUrl.startsWith('/downloads/')) {
            finalVideoUrl = `${API_BASE}${finalVideoUrl}`;
          }
          setVideoUrl(finalVideoUrl);
          // ⭐ 任务完成时确保进度为 100%
          if (!taskProgress || taskProgress === 0) {
            setProgress(100);
          }
        } else if (status === 'FAILURE') {
          setError(taskData?.fail_reason || '生成失败');
        }
      }
    } catch (err) {
      console.error('Failed to refresh task status:', err);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000); // Clear success message after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return '#059669';
      case 'FAILURE': return '#dc2626';
      case 'IN_PROGRESS': return '#2563eb';
      case 'NOT_START': return '#64748b';
      default: return '#9ca3af';
    }
  };

  // Get status text with progress
  const getStatusText = (status, progressValue) => {
    switch (status) {
      case 'SUCCESS': return `✓ 完成 ${progressValue}%`;
      case 'FAILURE': return '✗ 失败';
      case 'IN_PROGRESS': return `⏳ 处理中 ${progressValue}%`;
      case 'NOT_START': return '⏸️ 未开始';
      default: return '⏸️ 等待中';
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#0ea5e9',
      borderStyle: 'solid',
      backgroundColor: '#e0f2fe',
      ...resizeStyles,
    }}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="task-input"
        style={{ background: '#0ea5e9', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#0369a1',
        marginBottom: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>📺 {data.label || '任务结果'}</span>
        {taskId && (
          <button
            className="nodrag"
            onClick={refreshStatus}
            disabled={polling}
            style={{
              padding: '2px 6px',
              backgroundColor: polling ? '#d1d5db' : '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: polling ? 'not-allowed' : 'pointer',
              fontSize: '10px',
            }}
          >
            {polling ? '...' : '刷新'}
          </button>
        )}
      </div>

      {/* Task ID Display */}
      {taskId ? (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#bae6fd',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#0c4a6e',
          wordBreak: 'break-all',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>任务ID:</span>
            <button
              className="nodrag"
              onClick={() => copyToClipboard(taskId, 'taskId')}
              disabled={copySuccess === 'taskId'}
              style={{
                padding: '2px 6px',
                fontSize: '9px',
                backgroundColor: copySuccess === 'taskId' ? '#059669' : '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {copySuccess === 'taskId' ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          <div style={{ fontSize: '10px', wordBreak: 'break-all' }}>{taskId}</div>
        </div>
      ) : (
        <div style={{
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          连接视频生成节点以查看结果
        </div>
      )}

      {/* Status Badge */}
      {taskId && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '8px',
        }}>
          <div style={{
            padding: '4px 12px',
            backgroundColor: getStatusColor(taskStatus),
            color: 'white',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
          }}>
            {getStatusText(taskStatus, progress)}
            {polling && ' ...'}
          </div>
        </div>
      )}

      {/* Video Preview */}
      {videoUrl && (
        <div style={{
          marginBottom: '8px',
        }}>
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              borderRadius: '4px',
              maxHeight: '160px',
            }}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '6px 8px',
          backgroundColor: '#fecaca',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
          color: '#991b1b',
        }}>
          ❌ {error}
        </div>
      )}

      {/* Download Button and Copy Link */}
      {videoUrl && (
        <>
          <a
            href={videoUrl}
            download
            style={{
              display: 'block',
              padding: '8px',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              textDecoration: 'none',
              cursor: 'pointer',
              marginBottom: '4px',
            }}
          >
            ⬇️ 下载视频
          </a>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="nodrag"
              onClick={() => copyToClipboard(videoUrl, 'videoUrl')}
              disabled={copySuccess === 'videoUrl'}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: copySuccess === 'videoUrl' ? '#059669' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {copySuccess === 'videoUrl' ? '✓ 已复制链接' : '🔗 复制链接'}
            </button>
            <button
              className="nodrag"
              onClick={refreshStatus}
              disabled={polling}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: polling ? '#9ca3af' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: polling ? 'not-allowed' : 'pointer',
                fontSize: '11px',
              }}
            >
              {polling ? '查询中...' : '🔄 手动查询'}
            </button>
          </div>
        </>
      )}

      {/* Manual Refresh Button (when no video URL but has taskId) */}
      {taskId && !videoUrl && (
        <button
          className="nodrag"
          onClick={refreshStatus}
          disabled={polling}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: polling ? '#9ca3af' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: polling ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}
        >
          {polling ? '查询中...' : '🔄 手动查询状态'}
        </button>
      )}

      {/* Input Label */}
      {taskId && (
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#64748b',
          textAlign: 'left',
        }}>
          ← 任务ID
        </div>
      )}

      {/* Resize Handle (ComfyUI style) */}
      <div
        className="nodrag"
        onMouseDown={handleResizeMouseDown}
        style={getResizeHandleStyles('#0ea5e9')}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        title="拖动调整节点大小"
      />
    </div>
  );
}

export default TaskResultNode;
