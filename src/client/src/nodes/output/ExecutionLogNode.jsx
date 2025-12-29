import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';

function ExecutionLogNode({ data }) {
  const [logs, setLogs] = useState(data.logs || []);

  // Update logs when data.logs changes
  useEffect(() => {
    if (data.logs && data.logs.length > 0) {
      setLogs(data.logs);
    }
  }, [data.logs]);

  // Get log level color
  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return '#dc2626';
      case 'warn': return '#f59e0b';
      case 'success': return '#059669';
      case 'info': return '#2563eb';
      default: return '#64748b';
    }
  };

  // Get log icon
  const getLogIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    if (data.onClearLogs) {
      data.onClearLogs();
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#64748b',
      borderStyle: 'solid',
      backgroundColor: '#f8fafc',
      minWidth: '300px',
      maxWidth: '340px',
    }}>
      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#334155',
        marginBottom: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>📋 {data.label || '执行日志'}</span>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            style={{
              padding: '2px 6px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
            }}
          >
            清空
          </button>
        )}
      </div>

      {/* Log Stats */}
      {logs.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '10px',
        }}>
          <div style={{ color: '#059669' }}>
            成功: {logs.filter(l => l.level === 'success').length}
          </div>
          <div style={{ color: '#2563eb' }}>
            信息: {logs.filter(l => l.level === 'info').length}
          </div>
          <div style={{ color: '#f59e0b' }}>
            警告: {logs.filter(l => l.level === 'warn').length}
          </div>
          <div style={{ color: '#dc2626' }}>
            错误: {logs.filter(l => l.level === 'error').length}
          </div>
        </div>
      )}

      {/* Log List */}
      <div style={{
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: '#1e293b',
        borderRadius: '4px',
        padding: '8px',
        fontFamily: 'monospace',
        fontSize: '10px',
      }}>
        {logs.length === 0 ? (
          <div style={{
            color: '#64748b',
            textAlign: 'center',
            padding: '16px',
            fontStyle: 'italic',
          }}>
            暂无日志
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                color: getLogLevelColor(log.level),
                marginBottom: '4px',
                paddingBottom: '4px',
                borderBottom: index < logs.length - 1 ? '1px solid #334155' : 'none',
                wordBreak: 'break-word',
              }}
            >
              <span style={{ color: '#94a3b8', marginRight: '4px' }}>
                [{log.timestamp || new Date().toLocaleTimeString()}]
              </span>
              <span style={{ marginRight: '4px' }}>
                {getLogIcon(log.level)}
              </span>
              <span>
                {log.message}
              </span>
              {log.node && (
                <span style={{ color: '#94a3b8', marginLeft: '4px' }}>
                  ({log.node})
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Log Count */}
      {logs.length > 0 && (
        <div style={{
          marginTop: '6px',
          fontSize: '10px',
          color: '#64748b',
          textAlign: 'right',
        }}>
          共 {logs.length} 条日志
        </div>
      )}
    </div>
  );
}

export default ExecutionLogNode;
