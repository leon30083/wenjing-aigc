---

path: src/client/src/nodes/**/*.jsx

---

# React Flow 节点模板

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **用途**: React Flow 节点开发模板

---

## 目录

- [输入节点模板](#输入节点模板)
- [处理节点模板](#处理节点模板)
- [输出节点模板](#输出节点模板)
- [通用组件模板](#通用组件模板)

---

## 输入节点模板

### TextNode (文本输入)

```jsx
// src/client/src/nodes/input/TextNode.jsx
import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const TextNode = ({ data, selected }) => {
  const [text, setText] = useState(data.value || '');

  const handleChange = (e) => {
    const newValue = e.target.value;
    setText(newValue);

    // 同步到 node.data
    if (data.onUpdate) {
      data.onUpdate(data.id, { value: newValue });
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? '#3b82f6' : '#334155'}`,
        background: '#1e293b',
        color: '#f8fafc',
        minWidth: '200px',
      }}
    >
      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="text-output"
        style={{ width: '10px', height: '10px', background: '#3b82f6' }}
      />

      {/* 节点头部 */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        📝 {data.label}
      </div>

      {/* 节点内容 */}
      <textarea
        className="nodrag"
        value={text}
        onChange={handleChange}
        placeholder="输入提示词..."
        style={{
          width: '100%',
          minHeight: '60px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '4px',
          padding: '8px',
          color: '#f8fafc',
          resize: 'vertical',
        }}
      />

      {/* 输出标签 */}
      <div
        style={{
          position: 'absolute',
          right: '-70px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        text
      </div>
    </div>
  );
};

TextNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.string,
    onUpdate: PropTypes.func,
  }).isRequired,
  selected: PropTypes.bool,
};

export default TextNode;
```

---

### CharacterLibraryNode (角色库选择)

```jsx
// src/client/src/nodes/input/CharacterLibraryNode.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const CharacterLibraryNode = ({ data, selected }) => {
  const [characters, setCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(data.selectedCharacter || null);

  useEffect(() => {
    // 加载角色库
    const loadCharacters = async () => {
      try {
        const response = await fetch('/api/characters');
        const result = await response.json();
        if (result.success) {
          setCharacters(result.data);
        }
      } catch (error) {
        console.error('加载角色库失败:', error);
      }
    };

    loadCharacters();
  }, []);

  const handleSelect = (char) => {
    setSelectedChar(char);

    // 同步到 node.data
    if (data.onUpdate) {
      data.onUpdate(data.id, {
        selectedCharacter: char,
        connectedCharacters: [char]
      });
    }
  };

  const handleInsert = () => {
    if (!selectedChar) return;

    // 插入真实 ID 到上游节点
    if (data.onInsertCharacter) {
      data.onInsertCharacter(selectedChar.username);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? '#8b5cf6' : '#334155'}`,
        background: '#1e293b',
        color: '#f8fafc',
        minWidth: '250px',
        maxHeight: '400px',
        overflow: 'auto',
      }}
    >
      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="character-output"
        style={{ width: '10px', height: '10px', background: '#8b5cf6' }}
      />

      {/* 节点头部 */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        👥 {data.label}
      </div>

      {/* 角色列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {characters.map((char) => (
          <div
            key={char.username}
            onClick={() => handleSelect(char)}
            className="nodrag"
            style={{
              padding: '8px',
              borderRadius: '4px',
              background: selectedChar?.username === char.username
                ? '#8b5cf6'
                : '#0f172a',
              border: selectedChar?.username === char.username
                ? '2px solid #a78bfa'
                : '1px solid #334155',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {char.alias || char.username}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              @{char.username}
            </div>
          </div>
        ))}
      </div>

      {/* 插入按钮 */}
      {selectedChar && (
        <button
          onClick={handleInsert}
          className="nodrag"
          style={{
            marginTop: '12px',
            padding: '6px 12px',
            background: '#8b5cf6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          插入角色引用
        </button>
      )}

      {/* 输出标签 */}
      <div
        style={{
          position: 'absolute',
          right: '-80px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '10px',
          color: '#94a3b8',
        }}
      >
        character
      </div>
    </div>
  );
};

CharacterLibraryNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    selectedCharacter: PropTypes.object,
    onUpdate: PropTypes.func,
    onInsertCharacter: PropTypes.func,
  }).isRequired,
  selected: PropTypes.bool,
};

export default CharacterLibraryNode;
```

---

## 处理节点模板

### VideoGenerateNode (视频生成)

```jsx
// src/client/src/nodes/process/VideoGenerateNode.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import PropTypes from 'prop-types';

const VideoGenerateNode = ({ data, selected }) => {
  const nodeId = useNodeId();
  const [platform, setPlatform] = useState(data.platform || 'juxin');
  const [model, setModel] = useState(data.model || '');
  const [status, setStatus] = useState('idle');
  const [taskId, setTaskId] = useState(data.taskId || null);
  const [result, setResult] = useState(null);

  // 接收上游节点数据
  const connectedPrompt = data.connectedPrompt || '';
  const connectedCharacter = data.connectedCharacter || null;
  const connectedImages = data.connectedImages || [];

  const handleCreate = async () => {
    if (!connectedPrompt) {
      alert('请先连接提示词输入节点');
      return;
    }

    try {
      setStatus('loading');

      const requestBody = {
        prompt: connectedCharacter ? `${connectedCharacter} ${connectedPrompt}` : connectedPrompt,
        platform: platform,
        model: model || (platform === 'juxin' ? 'sora-2-all' : 'sora-2')
      };

      if (connectedImages && connectedImages.length > 0) {
        requestBody.image_url = connectedImages[0].url;
      }

      const response = await fetch('/api/video/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        const newTaskId = result.data.id || result.data.task_id;
        setTaskId(newTaskId);
        setStatus('processing');

        // 更新节点数据
        if (data.onUpdate) {
          data.onUpdate(nodeId, { taskId: newTaskId, status: 'processing' });
        }
      } else {
        setStatus('error');
        alert(result.error);
      }
    } catch (error) {
      setStatus('error');
      console.error('创建失败:', error);
      alert('创建视频失败: ' + error.message);
    }
  };

  const statusColors = {
    idle: '#64748b',
    loading: '#eab308',
    processing: '#3b82f6',
    success: '#22c55e',
    error: '#ef4444'
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? '#8b5cf6' : '#334155'}`,
        background: '#1e293b',
        color: '#f8fafc',
        minWidth: '250px',
      }}
    >
      {/* 输入 Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ top: '30%', width: '10px', height: '10px', background: '#3b82f6' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="character-input"
        style={{ top: '50%', width: '10px', height: '10px', background: '#8b5cf6' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images-input"
        style={{ top: '70%', width: '10px', height: '10px', background: '#f59e0b' }}
      />

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="task-output"
        style={{ width: '10px', height: '10px', background: '#8b5cf6' }}
      />

      {/* 节点头部 */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        🎬 {data.label}
      </div>

      {/* 平台选择 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#94a3b8' }}>平台:</label>
        <select
          className="nodrag"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '4px',
            color: '#f8fafc',
          }}
        >
          <option value="juxin">聚鑫平台</option>
          <option value="zhenzhen">贞贞平台</option>
        </select>
      </div>

      {/* 模型输入 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#94a3b8' }}>模型:</label>
        <input
          className="nodrag"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={platform === 'juxin' ? 'sora-2-all' : 'sora-2'}
          style={{
            width: '100%',
            padding: '4px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '4px',
            color: '#f8fafc',
          }}
        />
      </div>

      {/* 状态显示 */}
      <div
        style={{
          padding: '8px',
          borderRadius: '4px',
          background: '#0f172a',
          border: `1px solid ${statusColors[status]}`,
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {status === 'idle' && '等待创建'}
        {status === 'loading' && '创建中...'}
        {status === 'processing' && `处理中 (ID: ${taskId?.slice(0, 8)}...)`}
        {status === 'success' && '创建成功'}
        {status === 'error' && '创建失败'}
      </div>

      {/* 创建按钮 */}
      <button
        onClick={handleCreate}
        disabled={status === 'loading' || status === 'processing'}
        className="nodrag"
        style={{
          padding: '8px',
          background: status === 'loading' || status === 'processing'
            ? '#475569'
            : '#8b5cf6',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: status === 'loading' || status === 'processing'
            ? 'not-allowed'
            : 'pointer',
          width: '100%',
        }}
      >
        {status === 'loading' || status === 'processing' ? '处理中...' : '创建视频'}
      </button>

      {/* 输入标签 */}
      <div style={{ position: 'absolute', left: '-60px', top: '30%', fontSize: '10px', color: '#94a3b8' }}>
        prompt
      </div>
      <div style={{ position: 'absolute', left: '-70px', top: '50%', fontSize: '10px', color: '#94a3b8' }}>
        character
      </div>
      <div style={{ position: 'absolute', left: '-50px', top: '70%', fontSize: '10px', color: '#94a3b8' }}>
        images
      </div>
    </div>
  );
};

VideoGenerateNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    platform: PropTypes.string,
    model: PropTypes.string,
    taskId: PropTypes.string,
    connectedPrompt: PropTypes.string,
    connectedCharacter: PropTypes.string,
    connectedImages: PropTypes.array,
    onUpdate: PropTypes.func,
  }).isRequired,
  selected: PropTypes.bool,
};

export default VideoGenerateNode;
```

---

### PromptOptimizerNode (提示词优化)

```jsx
// src/client/src/nodes/process/PromptOptimizerNode.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, useNodeId } from 'reactflow';
import PropTypes from 'prop-types';

const SYSTEM_PROMPTS = {
  'picture-book': `你是专业的绘本视频提示词优化专家...

优化规则：
1. 必须保留角色引用 (@username 格式)
2. 不描述角色外观（Sora2 会使用角色真实外观）
3. 重点描述场景、动作、氛围、细节
4. 语言简洁生动，符合绘本风格...`,

  'documentary': `你是专业的纪录片视频提示词优化专家...

优化规则：
1. 保持纪录片风格的真实性
2. 强调场景的细节和氛围
3. 语言客观、准确...`,

  'default': `你是专业的视频提示词优化专家...

优化规则：
1. 保留角色引用
2. 优化语言表达
3. 增强画面感...`
};

const PromptOptimizerNode = ({ data, selected }) => {
  const nodeId = useNodeId();
  const [style, setStyle] = useState(data.style || 'picture-book');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState(data.optimizedPrompt || '');

  const connectedPrompt = data.connectedPrompt || '';

  const handleOptimize = async () => {
    if (!connectedPrompt) {
      alert('请先连接提示词输入节点');
      return;
    }

    try {
      setOptimizing(true);

      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: connectedPrompt,
          style: style
        })
      });

      const result = await response.json();

      if (result.success) {
        setOptimizedPrompt(result.data.optimizedPrompt);

        // 更新节点数据
        if (data.onUpdate) {
          data.onUpdate(nodeId, {
            optimizedPrompt: result.data.optimizedPrompt,
            sentencesCount: result.data.sentences?.length || 0
          });
        }
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('优化失败:', error);
      alert('优化提示词失败: ' + error.message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? '#f59e0b' : '#334155'}`,
        background: '#1e293b',
        color: '#f8fafc',
        minWidth: '300px',
      }}
    >
      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-input"
        style={{ width: '10px', height: '10px', background: '#3b82f6' }}
      />

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="optimized-output"
        style={{ width: '10px', height: '10px', background: '#f59e0b' }}
      />

      {/* 节点头部 */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        ✨ {data.label}
      </div>

      {/* 风格选择 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#94a3b8' }}>优化风格:</label>
        <select
          className="nodrag"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '4px',
            color: '#f8fafc',
          }}
        >
          <option value="picture-book">绘本风格</option>
          <option value="documentary">纪录片风格</option>
          <option value="animation">动画风格</option>
          <option value="cinematic">电影风格</option>
          <option value="default">通用</option>
        </select>
      </div>

      {/* 原始提示词 */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#94a3b8' }}>原始提示词:</label>
        <div
          style={{
            padding: '8px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '4px',
            minHeight: '40px',
            fontSize: '12px',
            color: '#94a3b8',
          }}
        >
          {connectedPrompt || '(等待输入...)'}
        </div>
      </div>

      {/* 优化按钮 */}
      <button
        onClick={handleOptimize}
        disabled={optimizing || !connectedPrompt}
        className="nodrag"
        style={{
          padding: '8px',
          background: optimizing || !connectedPrompt ? '#475569' : '#f59e0b',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: optimizing || !connectedPrompt ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '8px',
        }}
      >
        {optimizing ? '优化中...' : '优化提示词'}
      </button>

      {/* 优化结果 */}
      {optimizedPrompt && (
        <div>
          <label style={{ fontSize: '12px', color: '#94a3b8' }}>优化结果:</label>
          <div
            style={{
              padding: '8px',
              background: '#0f172a',
              border: '1px solid #22c55e',
              borderRadius: '4px',
              minHeight: '60px',
              fontSize: '12px',
              color: '#f8fafc',
              whiteSpace: 'pre-wrap',
            }}
          >
            {optimizedPrompt}
          </div>
        </div>
      )}

      {/* 输入标签 */}
      <div style={{ position: 'absolute', left: '-60px', top: '50%', fontSize: '10px', color: '#94a3b8' }}>
        prompt
      </div>
    </div>
  );
};

PromptOptimizerNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    style: PropTypes.string,
    connectedPrompt: PropTypes.string,
    optimizedPrompt: PropTypes.string,
    onUpdate: PropTypes.func,
  }).isRequired,
  selected: PropTypes.bool,
};

export default PromptOptimizerNode;
```

---

## 输出节点模板

### TaskResultNode (任务结果)

```jsx
// src/client/src/nodes/output/TaskResultNode.jsx
import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import PropTypes from 'prop-types';

const TaskResultNode = ({ data, selected }) => {
  const [taskId, setTaskId] = useState(data.taskId || null);
  const [status, setStatus] = useState('idle');
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (data.taskId && data.taskId !== taskId) {
      setTaskId(data.taskId);
      pollTaskStatus(data.taskId);
    }
  }, [data.taskId]);

  const pollTaskStatus = async (id) => {
    try {
      setStatus('loading');

      const response = await fetch(`/api/task/${id}`);
      const result = await response.json();

      if (result.success) {
        setStatus(result.data.status);

        if (result.data.status === 'SUCCESS') {
          setVideoUrl(result.data.videoUrl);
        } else if (result.data.status === 'FAILURE') {
          setError(result.data.error || '任务失败');
        }
      } else {
        setError(result.error);
        setStatus('error');
      }
    } catch (err) {
      console.error('查询任务失败:', err);
      setError('查询任务失败');
      setStatus('error');
    }
  };

  const statusLabels = {
    idle: '等待任务',
    loading: '查询中...',
    processing: '处理中',
    SUCCESS: '完成',
    FAILURE: '失败',
    error: '错误'
  };

  const statusColors = {
    idle: '#64748b',
    loading: '#eab308',
    processing: '#3b82f6',
    SUCCESS: '#22c55e',
    FAILURE: '#ef4444',
    error: '#ef4444'
  };

  const handleRefresh = () => {
    if (taskId) {
      pollTaskStatus(taskId);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? '#10b981' : '#334155'}`,
        background: '#1e293b',
        color: '#f8fafc',
        minWidth: '300px',
      }}
    >
      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="task-input"
        style={{ width: '10px', height: '10px', background: '#10b981' }}
      />

      {/* 节点头部 */}
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        📊 {data.label}
      </div>

      {/* 任务ID */}
      {taskId && (
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8' }}>任务ID:</label>
          <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            {taskId}
          </div>
        </div>
      )}

      {/* 状态显示 */}
      <div
        style={{
          padding: '8px',
          borderRadius: '4px',
          background: '#0f172a',
          border: `1px solid ${statusColors[status]}`,
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {statusLabels[status] || status}
      </div>

      {/* 错误信息 */}
      {error && (
        <div
          style={{
            padding: '8px',
            borderRadius: '4px',
            background: '#450a0a',
            border: '1px solid #ef4444',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {/* 视频预览 */}
      {videoUrl && (
        <div style={{ marginBottom: '8px' }}>
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              borderRadius: '4px',
              maxHeight: '200px',
            }}
          />
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleRefresh}
          className="nodrag"
          style={{
            flex: 1,
            padding: '8px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          刷新
        </button>
        {videoUrl && (
          <button
            onClick={handleDownload}
            className="nodrag"
            style={{
              flex: 1,
              padding: '8px',
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            下载
          </button>
        )}
      </div>

      {/* 输入标签 */}
      <div style={{ position: 'absolute', left: '-50px', top: '50%', fontSize: '10px', color: '#94a3b8' }}>
        task
      </div>
    </div>
  );
};

TaskResultNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    taskId: PropTypes.string,
  }).isRequired,
  selected: PropTypes.bool,
};

export default TaskResultNode;
```

---

## 通用组件模板

### 节点样式组件

```jsx
// src/client/src/components/NodeStyles.jsx
export const nodeStyles = {
  base: {
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #334155',
    background: '#1e293b',
    color: '#f8fafc',
    minWidth: '200px',
  },
  selected: {
    border: '2px solid #3b82f6',
  },
};

export const handleStyles = {
  base: {
    width: '10px',
    height: '10px',
  },
  blue: { background: '#3b82f6' },
  purple: { background: '#8b5cf6' },
  green: { background: '#10b981' },
  orange: { background: '#f59e0b' },
};

export const inputStyles = {
  base: {
    width: '100%',
    padding: '6px 8px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '4px',
    color: '#f8fafc',
    fontSize: '14px',
  },
  textarea: {
    minHeight: '60px',
    resize: 'vertical' as const,
  },
  select: {
    cursor: 'pointer',
  },
};

export const buttonStyles = {
  base: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  primary: {
    background: '#3b82f6',
  },
  secondary: {
    background: '#64748b',
  },
  danger: {
    background: '#ef4444',
  },
  success: {
    background: '#22c55e',
  },
  disabled: {
    background: '#475569',
    cursor: 'not-allowed',
  },
};
```

---

### 节点状态 Hook

```jsx
// src/client/src/hooks/useNodeState.js
import { useState, useEffect } from 'react';

export const useNodeState = (data) => {
  const [state, setState] = useState({
    value: data.value || '',
    status: 'idle',
    error: null,
  });

  useEffect(() => {
    if (data.value !== undefined && data.value !== state.value) {
      setState((prev) => ({ ...prev, value: data.value }));
    }
  }, [data.value]);

  const updateValue = (newValue) => {
    setState((prev) => ({ ...prev, value: newValue }));

    if (data.onUpdate) {
      data.onUpdate(data.id, { value: newValue });
    }
  };

  const updateStatus = (newStatus) => {
    setState((prev) => ({ ...prev, status: newStatus }));
  };

  const updateError = (newError) => {
    setState((prev) => ({ ...prev, error: newError, status: 'error' }));
  };

  return {
    ...state,
    updateValue,
    updateStatus,
    updateError,
  };
};
```

---

## 快速开始

### 1. 创建新节点

```bash
# 使用技能创建节点
/skills reactflow-dev --type=input|process|output --name=MyNode
```

### 2. 复制模板

1. 选择合适的节点模板
2. 复制到目标文件
3. 修改节点名称和样式
4. 自定义业务逻辑

### 3. 注册节点

```jsx
// src/client/src/App.jsx
import MyNode from './nodes/MyNode';

const nodeTypes = {
  myNode: MyNode,
  // ... 其他节点
};
```

---

## 参考文档

**相关文档**:
- [节点架构](./node-architecture.md) - 节点架构模式
- [Handle 连接](./handle-connections.md) - 连接规范
- [错误模式](../04-error-patterns/errors-by-type.md) - React Flow 相关错误

**外部资源**:
- [React Flow 官方文档](https://reactflow.dev/)
- [React 自定义节点](https://reactflow.dev/docs/guides/custom-nodes/)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
