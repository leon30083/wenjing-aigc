import { Handle, Position, useNodeId, useReactFlow } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';
import { useNodeResize } from '../../hooks/useNodeResize';

const API_BASE = 'http://localhost:9000';

function TaskResultNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  // ⭐ 关键修复：从 data 恢复状态（支持工作流加载）
  const [taskId, setTaskId] = useState(data.taskId || null);
  const taskIdRef = useRef(taskId);
  const [taskStatus, setTaskStatus] = useState(data.taskStatus || 'idle');
  const [videoUrl, setVideoUrl] = useState(data.videoUrl || null);
  const [error, setError] = useState(data.error || null);
  const [polling, setPolling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(null); // 'taskId' | 'videoUrl' | null

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

  // ⭐ 关键修复：优先检查 _isCompletedFromHistory 标记（避免无限循环）
  // 使用 useEffect 只恢复状态，不调用 setNodes()
  useEffect(() => {
    if (data._isCompletedFromHistory) {
      console.log('[TaskResultNode] Loaded from history (flagged), skipping polling and node updates');
      isCompletedFromHistoryRef.current = true;

      // ⭐ 只恢复内部状态，不调用 setNodes() 避免循环
      if (data.taskId && data.taskId !== taskIdRef.current) {
        setTaskId(data.taskId);
      }
      if (data.taskStatus) {
        setTaskStatus(data.taskStatus);
      }
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      }
      if (data.error) {
        setError(data.error);
      }
      setPolling(false);

      return; // ⭐ 直接返回，不执行后续逻辑
    }
  }, [data._isCompletedFromHistory, data.taskId, data.taskStatus, data.videoUrl, data.error]);

  // ⭐ 单独的 useEffect：设置事件监听器（只在非历史记录时）
  useEffect(() => {
    // ⭐ 如果是从历史记录加载的，不需要监听事件
    if (isCompletedFromHistoryRef.current) {
      return;
    }

    // ⭐ 关键修复：从 data 恢复状态（工作流加载时）
    if (data.taskId && data.taskId !== taskIdRef.current) {
      console.log('[TaskResultNode] Initial taskId from data:', data.taskId);
      setTaskId(data.taskId);

      // ⭐ 新增：检查是否是从历史记录加载的已完成任务
      if (data.taskStatus === 'SUCCESS' && data.videoUrl) {
        isCompletedFromHistoryRef.current = true;
        console.log('[TaskResultNode] Completed task from history, skipping polling');
      } else {
        isCompletedFromHistoryRef.current = false;
      }
    }

    // ⭐ 关键修复：如果 data 中已有结果状态，直接恢复（跳过轮询）
    if (data.taskStatus && data.taskStatus !== 'idle') {
      setTaskStatus(data.taskStatus);
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setPolling(false); // 已有结果，不需要轮询
      }
      if (data.error) {
        setError(data.error);
      }
    }

    // ⭐ 关键修复：只有当连接到源节点时才监听事件
    // 使用 connectedSourceIdRef.current 而不是 data.connectedSourceId，避免依赖 data
    if (!connectedSourceIdRef.current) {
      console.log('[TaskResultNode] No connected source, skipping event listener setup');
      return;
    }

    // Listen for custom event when video is created
    const handleVideoCreated = (event) => {
      const { sourceNodeId, taskId: newTaskId } = event.detail;
      console.log('[TaskResultNode] Event received:', { sourceNodeId, newTaskId, connectedSourceId: connectedSourceIdRef.current });
      // Check if this task result node is connected to the source node
      if (connectedSourceIdRef.current === sourceNodeId && newTaskId && newTaskId !== taskIdRef.current) {
        console.log('[TaskResultNode] Match! Setting taskId:', newTaskId);

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
        setTaskStatus('idle');
        setVideoUrl(null);
        setError(null);
        setPolling(false);
        isCompletedFromHistoryRef.current = false;
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
        const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);
        const result = await response.json();

        if (result.success && result.data) {
          const { status, data: taskData } = result.data;
          setTaskStatus(status);

          if (status === 'SUCCESS' && taskData?.output) {
            setVideoUrl(taskData.output);
            setPolling(false);
            clearInterval(pollInterval);
            console.log('[TaskResultNode] Video URL set:', taskData.output);
          } else if (status === 'FAILURE') {
            setError(taskData?.fail_reason || '生成失败');
            setPolling(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('[TaskResultNode] Failed to poll task status:', err);
      }
    }, 5000); // Poll every 5 seconds

    setPolling(true);

    return () => {
      clearInterval(pollInterval);
      setPolling(false);
    };
  }, [taskId, taskStatus, videoUrl]);

  // ⭐ 关键修复：将结果同步到 node.data（用于工作流快照保存）
  useEffect(() => {
    // 当任务完成或有结果时，同步到 node.data
    if ((taskStatus === 'SUCCESS' && videoUrl) || taskStatus === 'FAILURE') {
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
    }
  }, [taskStatus, videoUrl, error, taskId, nodeId, setNodes]);

  // Manual refresh
  const refreshStatus = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${API_BASE}/api/task/${taskId}?platform=juxin`);
      const result = await response.json();

      if (result.success && result.data) {
        const { status, data: taskData } = result.data;
        setTaskStatus(status);

        if (status === 'SUCCESS' && taskData?.output) {
          setVideoUrl(taskData.output);
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

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'SUCCESS': return '✓ 完成';
      case 'FAILURE': return '✗ 失败';
      case 'IN_PROGRESS': return '⏳ 处理中';
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
            {getStatusText(taskStatus)}
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
