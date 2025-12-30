import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState } from 'react';

const API_BASE = 'http://localhost:9000';

function CharacterCreateNode({ data }) {
  const nodeId = useNodeId(); // Get current node ID
  const [platform, setPlatform] = useState('zhenzhen'); // juxin or zhenzhen
  const [inputType, setInputType] = useState('url'); // 'url' or 'task'
  const [videoUrl, setVideoUrl] = useState('');
  const [taskId, setTaskId] = useState('');
  const [timestamps, setTimestamps] = useState('1,3');
  const [alias, setAlias] = useState('');
  const [status, setStatus] = useState('idle'); // idle, creating, success, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    // Validation
    if (inputType === 'url' && !videoUrl.trim()) {
      setError('请输入视频URL');
      return;
    }
    if (inputType === 'task' && !taskId.trim()) {
      setError('请输入任务ID');
      return;
    }
    if (!timestamps.trim()) {
      setError('请输入时间戳（格式：1,3）');
      return;
    }

    // Validate timestamps format
    const tsArray = timestamps.split(',').map(s => parseFloat(s.trim()));
    if (tsArray.length !== 2 || tsArray.some(isNaN)) {
      setError('时间戳格式错误，应为：开始秒,结束秒（如：1,3）');
      return;
    }
    const diff = Math.abs(tsArray[1] - tsArray[0]);
    if (diff < 1 || diff > 3) {
      setError('时间戳范围必须在1-3秒之间');
      return;
    }

    setStatus('creating');
    setError(null);
    setResult(null);

    try {
      const payload = {
        platform: platform, // 使用选定的平台
        timestamps: timestamps.trim(),
      };

      if (inputType === 'url') {
        payload.url = videoUrl.trim();
      } else {
        payload.from_task = taskId.trim();
      }

      if (alias.trim()) {
        payload.alias = alias.trim();
      }

      const response = await fetch(`${API_BASE}/api/character/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setStatus('success');
        setResult(result.data);

        // Dispatch event for connected nodes
        window.dispatchEvent(new CustomEvent('character-created', {
          detail: { sourceNodeId: nodeId, character: result.data }
        }));

        // Notify parent
        if (data.onCharacterCreated) {
          data.onCharacterCreated(result.data);
        }
      } else {
        setStatus('error');
        setError(result.error || '创建失败');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || '网络错误');
    }
  };

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      borderWidth: '2px',
      borderColor: '#ec4899',
      borderStyle: 'solid',
      backgroundColor: '#fdf2f8',
      minWidth: '280px',
    }}>
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="url-input"
        style={{ background: '#ec4899', width: 10, height: 10 }}
      />

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="character-output"
        style={{ background: '#ec4899', width: 10, height: 10 }}
      />

      {/* Node Header */}
      <div style={{
        fontWeight: 'bold',
        color: '#be185d',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        🎭 {data.label || '角色生成'}
      </div>

      {/* Platform Selector */}
      <div style={{ marginBottom: '8px' }}>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          disabled={status === 'creating'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #f9a8d4',
            fontSize: '11px',
            backgroundColor: '#fff',
            color: '#be185d',
            fontWeight: 'bold',
          }}
        >
          <option value="zhenzhen">贞贞平台 (支持角色创建)</option>
          <option value="juxin">聚鑫平台 (不支持)</option>
        </select>
      </div>

      {/* Input Type Toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '8px',
      }}>
        <button
          onClick={() => setInputType('url')}
          style={{
            flex: 1,
            padding: '6px',
            backgroundColor: inputType === 'url' ? '#ec4899' : '#fbcfe8',
            color: inputType === 'url' ? 'white' : '#be185d',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          视频URL
        </button>
        <button
          onClick={() => setInputType('task')}
          style={{
            flex: 1,
            padding: '6px',
            backgroundColor: inputType === 'task' ? '#ec4899' : '#fbcfe8',
            color: inputType === 'task' ? 'white' : '#be185d',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          任务ID
        </button>
      </div>

      {/* Video URL / Task ID Input */}
      {inputType === 'url' ? (
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="视频 URL (https://...)"
          disabled={status === 'creating'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #f9a8d4',
            fontSize: '11px',
            marginBottom: '6px',
          }}
        />
      ) : (
        <input
          type="text"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="任务 ID"
          disabled={status === 'creating'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #f9a8d4',
            fontSize: '11px',
            marginBottom: '6px',
          }}
        />
      )}

      {/* Timestamps (Required) */}
      <div style={{ marginBottom: '6px' }}>
        <label style={{
          fontSize: '10px',
          color: '#be185d',
          fontWeight: 'bold',
        }}>
          时间戳 * (1-3秒)
        </label>
        <input
          type="text"
          value={timestamps}
          onChange={(e) => setTimestamps(e.target.value)}
          placeholder="1,3"
          disabled={status === 'creating'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #f9a8d4',
            fontSize: '11px',
          }}
        />
      </div>

      {/* Alias (Optional) */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{
          fontSize: '10px',
          color: '#9d174d',
        }}>
          别名 (可选)
        </label>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="角色别名"
          disabled={status === 'creating'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid #f9a8d4',
            fontSize: '11px',
          }}
        />
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={status === 'creating'}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: status === 'creating'
            ? '#9ca3af'
            : status === 'success'
            ? '#059669'
            : status === 'error'
            ? '#dc2626'
            : '#ec4899',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: status === 'creating' ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {status === 'idle' && '创建角色'}
        {status === 'creating' && '创建中...'}
        {status === 'success' && '✓ 创建成功'}
        {status === 'error' && '✗ 创建失败'}
      </button>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#fecaca',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div style={{
          marginTop: '6px',
          padding: '6px',
          backgroundColor: '#d1fae5',
          borderRadius: '4px',
          fontSize: '10px',
          color: '#065f46',
        }}>
          <div style={{ fontWeight: 'bold' }}>✓ 角色创建成功</div>
          <div>@{result.username}</div>
        </div>
      )}

      {/* Labels */}
      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>← URL/ID</span>
        <span>角色 →</span>
      </div>
    </div>
  );
}

export default CharacterCreateNode;
