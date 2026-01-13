import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9000';

/**
 * 批量结果节点 - 显示所有批量任务的进度
 */
function BatchResultNode({ data }) {
  const { batchId, platform, totalJobs, jobs, sentences } = data;
  const [polling, setPolling] = useState(true);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [error, setError] = useState(null);
  const [jobStatuses, setJobStatuses] = useState({});

  // 轮询批量任务状态
  useEffect(() => {
    if (!polling) return;

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
            newStatuses[job.jobId] = job;
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
            console.log('[BatchResultNode] ✅ 所有任务已完成');
          }
        }
      } catch (err) {
        console.error('[BatchResultNode] 轮询失败:', err);
        setError(err.message);
      }
    }, 30000); // 30秒轮询一次

    return () => clearInterval(pollInterval);
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

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '✓ 完成';
      case 'failed': return '✗ 失败';
      case 'submitted': return '⏳ 已提交';
      case 'submitting': return '🔄 提交中';
      default: return '⏳ 处理中';
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
        <button
          onClick={handleRefresh}
          disabled={polling}
          className="nodrag"
          style={{
            padding: '3px 8px',
            fontSize: '11px',
            background: polling ? '#e2e8f0' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: polling ? 'not-allowed' : 'pointer'
          }}
        >
          {polling ? '轮询中...' : '🔄 刷新'}
        </button>
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
                  {getStatusText(status.status)}
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
    </div>
  );
}

export default BatchResultNode;
