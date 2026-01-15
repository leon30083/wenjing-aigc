import { Handle, Position, useReactFlow, useNodeId } from 'reactflow';
import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:9000';

/**
 * 批量结果节点 - 显示所有批量任务的进度
 * ⭐ 支持 jobStatuses 数据持久化（刷新后恢复）
 */
function BatchResultNode({ data }) {
  const nodeId = useNodeId();
  const { setNodes } = useReactFlow();

  // ⭐ Refs for infinite loop prevention
  const isInitialLoadRef = useRef(true);
  const isPollingRef = useRef(false);

  const { batchId, platform, totalJobs, jobs, sentences } = data;
  const [polling, setPolling] = useState(true);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [error, setError] = useState(null);

  // ⭐ 从 data.jobStatuses 恢复（工作流恢复），降级到 jobs prop（向后兼容）
  const [jobStatuses, setJobStatuses] = useState(() => {
    // 优先从 data.jobStatuses 恢复（工作流恢复）
    if (data.jobStatuses && Object.keys(data.jobStatuses).length > 0) {
      console.log('[BatchResultNode] 从 data.jobStatuses 恢复:', Object.keys(data.jobStatuses).length);
      return data.jobStatuses;
    }
    // 降级到 jobs prop（向后兼容）
    if (jobs && jobs.length > 0) {
      const initialStatuses = {};
      jobs.forEach(job => {
        initialStatuses[job.jobId] = job;
      });
      return initialStatuses;
    }
    return {};
  });

  // ⭐ 重试状态
  const [retryingJobId, setRetryingJobId] = useState(null);
  const [retryPrompt, setRetryPrompt] = useState('');
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // 轮询批量任务状态
  useEffect(() => {
    if (!polling) return;

    // ⭐ 设置轮询标记
    isPollingRef.current = true;

    // ⭐ 立即执行一次初始轮询
    const initialPoll = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/batch/${batchId}/status`);
        const result = await response.json();

        if (result.success) {
          const { jobs: initialJobs } = result.data;
          const newStatuses = {};
          initialJobs.forEach(job => {
            newStatuses[job.jobId] = job;
          });
          setJobStatuses(newStatuses);

          // 收集已完成的任务
          const completed = initialJobs.filter(j => j.status === 'completed');
          setCompletedJobs(completed);
        }
      } catch (err) {
        console.error('[BatchResultNode] 初始状态获取失败:', err);
      }
    };

    initialPoll();

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/batch/${batchId}/poll`);
        const result = await response.json();

        if (result.success) {
          const { jobs: updatedJobs } = result.data;

          // 更新任务状态
          const newStatuses = {};
          updatedJobs.forEach(job => {
            // ⭐ 关键修复：保留已存在的 prompt（重试时使用）
            const existingStatus = jobStatuses[job.jobId] || {};
            newStatuses[job.jobId] = {
              ...job,
              prompt: job.prompt || existingStatus.prompt  // ⭐ 优先使用后端返回的 prompt，否则保留现有的
            };
          });
          setJobStatuses(prev => ({ ...prev, ...newStatuses }));

          // 收集已完成的任务
          const completed = updatedJobs.filter(j => j.status === 'completed');
          setCompletedJobs(completed);

          // 检查是否全部完成
          const allCompleted = updatedJobs.every(j =>
            j.status === 'completed' || j.status === 'failed'
          );

          if (allCompleted) {
            setPolling(false);
            isPollingRef.current = false;  // ⭐ 清除轮询标记
            console.log('[BatchResultNode] ✅ 所有任务已完成');
          }
        }
      } catch (err) {
        console.error('[BatchResultNode] 轮询失败:', err);
        setError(err.message);
      }
    }, 30000); // 30秒轮询一次

    return () => {
      clearInterval(pollInterval);
      isPollingRef.current = false;  // ⭐ 清除轮询标记
    };
  }, [batchId, totalJobs, polling]);

  // ⭐ 手动刷新
  const handleRefresh = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/batch/${batchId}/poll`);
      const result = await response.json();

      if (result.success) {
        const { jobs: updatedJobs } = result.data;

        const newStatuses = {};
        updatedJobs.forEach(job => {
          newStatuses[job.jobId] = job;
        });
        setJobStatuses(prev => ({ ...prev, ...newStatuses }));

        const completed = updatedJobs.filter(j => j.status === 'completed');
        setCompletedJobs(completed);
      }
    } catch (err) {
      console.error('[BatchResultNode] 刷新失败:', err);
      setError(err.message);
    }
  };

  // ⭐ 执行重试
  const executeRetry = async () => {
    if (!retryPrompt.trim()) {
      alert('⚠️ 提示词不能为空');
      return;
    }

    setRetrying(true);
    try {
      const response = await fetch(`${API_BASE}/api/batch/${batchId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: retryingJobId, prompt: retryPrompt })
      });
      const result = await response.json();

      if (result.success) {
        const newStatuses = {
          ...jobStatuses,
          [retryingJobId]: { ...jobStatuses[retryingJobId], status: 'submitted', prompt: retryPrompt }
        };
        setJobStatuses(newStatuses);

        // ⭐ 关键修复：立即同步到 node.data（确保刷新后也能看到更新）
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, jobStatuses: newStatuses } }
              : node
          )
        );

        setPolling(true);
        setShowRetryModal(false);
        setRetryingJobId(null);
        setRetryPrompt('');
        alert('✅ 已重新提交任务');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert(`❌ 重试失败: ${error.message}`);
    } finally {
      setRetrying(false);
    }
  };

  // ⭐ 同步 jobStatuses 到 node.data（工作流持久化）
  useEffect(() => {
    // ⭐ 跳过初始加载（避免覆盖恢复的数据）
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // ⭐ 轮询期间暂停写入（避免性能问题）
    if (isPollingRef.current) return;

    // ⭐ 检查数据是否真正变化
    const dataChanged = JSON.stringify(data.jobStatuses) !== JSON.stringify(jobStatuses);
    if (!dataChanged) return;

    console.log('[BatchResultNode] 同步 jobStatuses 到 node.data:', Object.keys(jobStatuses).length);

    // ⭐ 通过事件系统通知父节点更新
    window.dispatchEvent(new CustomEvent('batch-result-update', {
      detail: { batchId, jobStatuses }
    }));
  }, [jobStatuses, data.jobStatuses, batchId]);

  const getStatusText = (status, progress = 0) => {
    switch (status) {
      case 'completed': return `✓ 完成 ${progress}%`;
      case 'failed': return '✗ 失败';
      case 'submitted': return `⏳ 已提交 ${progress}%`;
      case 'submitting': return '🔄 提交中';
      default: return `⏳ 处理中 ${progress}%`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'failed': return '#dc2626';
      default: return '#ca8a04';
    }
  };

  return (
    <div style={{
      padding: '10px',
      width: '320px',
      minHeight: '200px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#8b5cf6',
      borderStyle: 'solid',
      backgroundColor: '#f5f3ff',
    }}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="batch-input"
        style={{ background: '#8b5cf6', width: 10, height: 10 }}
      />

      {/* Input Label */}
      <div style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <span style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>批量</span>
      </div>

      {/* 标题 */}
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#6b21a8'
      }}>
        🎬 批量任务结果 ({platform === 'juxin' ? '聚鑫' : '贞贞'})
      </div>

      {/* 进度 */}
      <div style={{
        fontSize: '12px',
        marginBottom: '10px',
        color: '#475569',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>进度: {completedJobs.length}/{totalJobs} 完成</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            {polling ? '自动轮询中 (30秒)' : '自动轮询暂停'}
          </span>
          <button
            onClick={handleRefresh}
            className="nodrag"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7c3aed';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#8b5cf6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="立即刷新所有任务状态"
          >
            🔄 立即刷新
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div style={{
        height: '6px',
        background: '#e2e8f0',
        borderRadius: '3px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${(completedJobs.length / totalJobs) * 100}%`,
          background: '#22c55e',
          transition: 'width 0.3s'
        }} />
      </div>

      {/* 错误显示 */}
      {error && (
        <div style={{
          fontSize: '11px',
          color: '#dc2626',
          marginBottom: '10px',
          padding: '4px 8px',
          backgroundColor: '#fee2e2',
          borderRadius: '4px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 任务列表 */}
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '5px'
      }}>
        {jobs && jobs.map((job, index) => {
          const status = jobStatuses[job.jobId] || job;
          const sentence = sentences && sentences[index];

          return (
            <div key={job.jobId} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: status.status === 'completed' ? '#f0fdf4' : '#ffffff',
              transition: 'background-color 0.3s'
            }}>
              {/* 任务标题 */}
              <div style={{
                fontSize: '11px',
                fontWeight: 'bold',
                marginBottom: '4px',
                color: '#374151',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>视频 {index + 1}</span>
                <span style={{ color: getStatusColor(status.status) }}>
                  {getStatusText(status.status, status.progress || 0)}
                </span>
              </div>

              {/* 句子预览 */}
              {sentence && (
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginBottom: '6px',
                  lineHeight: '1.4'
                }}>
                  💡 {sentence.text?.substring(0, 40)}...
                </div>
              )}

              {/* Task ID */}
              {status.taskId && (
                <div style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  marginBottom: '4px',
                  fontFamily: 'monospace'
                }}>
                  ID: {status.taskId}
                </div>
              )}

              {/* 错误信息 */}
              {status.status === 'failed' && status.error && (
                <div style={{
                  fontSize: '10px',
                  color: '#dc2626',
                  marginTop: '4px',
                  padding: '4px',
                  background: '#fef2f2',
                  borderRadius: '4px'
                }}>
                  ❌ {status.error}
                </div>
              )}

              {/* ⭐ 重试按钮（失败任务） */}
              {status.status === 'failed' && (
                <button
                  onClick={() => {
                    setRetryingJobId(job.jobId);
                    setRetryPrompt(status.prompt || sentence?.optimized || sentence?.text || '');
                    setShowRetryModal(true);
                  }}
                  className="nodrag"
                  disabled={retryingJobId === job.jobId}
                  style={{
                    width: '100%',
                    padding: '6px',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    marginTop: '4px'
                  }}
                >
                  🔄 修改提示词并重试
                </button>
              )}

              {/* 视频结果 */}
              {status.status === 'completed' && status.result?.output && (
                <div style={{ marginTop: '6px' }}>
                  <video
                    src={status.result.output}
                    style={{
                      width: '100%',
                      borderRadius: '4px',
                      display: 'block'
                    }}
                    muted
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                  <a
                    href={status.result.output}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nodrag"
                    style={{
                      fontSize: '10px',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      display: 'block',
                      marginTop: '4px'
                    }}
                  >
                    📥 下载视频
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ⭐ 重试模态框 */}
      {showRetryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '500px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🔄 重试失败的视频</h3>
            <textarea
              value={retryPrompt}
              onChange={(e) => setRetryPrompt(e.target.value)}
              className="nodrag"
              placeholder="输入修改后的提示词..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => {
                  setShowRetryModal(false);
                  setRetryingJobId(null);
                  setRetryPrompt('');
                }}
                className="nodrag"
                disabled={retrying}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={executeRetry}
                className="nodrag"
                disabled={!retryPrompt.trim() || retrying}
                style={{
                  padding: '8px 16px',
                  background: (!retryPrompt.trim() || retrying) ? '#9ca3af' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!retryPrompt.trim() || retrying) ? 'not-allowed' : 'pointer'
                }}
              >
                {retrying ? '🔄 提交中...' : '✓ 提交重试'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchResultNode;
