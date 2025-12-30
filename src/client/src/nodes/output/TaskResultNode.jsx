import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

function TaskResultNode({ data }) {
  const [taskId, setTaskId] = useState(data.taskId || null);
  const [taskStatus, setTaskStatus] = useState('idle');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [polling, setPolling] = useState(false);

  // Listen for taskId updates from connected video generation nodes
  useEffect(() => {
    console.log('[TaskResultNode] Node data:', { id: data.id, connectedSourceId: data.connectedSourceId });

    // Check initial data.taskId
    if (data.taskId && data.taskId !== taskId) {
      setTaskId(data.taskId);
      setTaskStatus('idle');
      setVideoUrl(null);
      setError(null);
    }

    // Listen for custom event when video is created
    const handleVideoCreated = (event) => {
      const { sourceNodeId, taskId: newTaskId } = event.detail;
      console.log('[TaskResultNode] Event received:', { sourceNodeId, newTaskId, connectedSourceId: data.connectedSourceId });
      // Check if this task result node is connected to the source node
      if (data.connectedSourceId === sourceNodeId && newTaskId && newTaskId !== taskId) {
        console.log('[TaskResultNode] Match! Setting taskId:', newTaskId);
        setTaskId(newTaskId);
        setTaskStatus('idle');
        setVideoUrl(null);
        setError(null);
      }
    };

    window.addEventListener('video-task-created', handleVideoCreated);

    return () => {
      window.removeEventListener('video-task-created', handleVideoCreated);
    };
  }, [data.taskId, data.connectedSourceId, taskId]);

  // Poll task status when taskId is set
  useEffect(() => {
    if (!taskId || taskStatus === 'SUCCESS' || taskStatus === 'FAILURE') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/task/${taskId}?platform=juxin`);
        const result = await response.json();

        if (result.success && result.data) {
          const { status, data: taskData } = result.data;
          setTaskStatus(status);

          if (status === 'SUCCESS' && taskData?.output) {
            setVideoUrl(taskData.output);
            setPolling(false);
            clearInterval(pollInterval);
          } else if (status === 'FAILURE') {
            setError(taskData?.fail_reason || '生成失败');
            setPolling(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Failed to poll task status:', err);
      }
    }, 5000); // Poll every 5 seconds

    setPolling(true);

    return () => {
      clearInterval(pollInterval);
      setPolling(false);
    };
  }, [taskId, taskStatus]);

  // Manual refresh
  const refreshStatus = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${API_BASE}/task/${taskId}?platform=juxin`);
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
      minWidth: '280px',
      maxWidth: '320px',
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
          任务ID: {taskId}
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

      {/* Download Button */}
      {videoUrl && (
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
          }}
        >
          ⬇️ 下载视频
        </a>
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
    </div>
  );
}

export default TaskResultNode;
