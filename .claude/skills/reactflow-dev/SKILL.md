# React Flow 节点开发技能

> **技能名称**: reactflow-dev
> **用途**: 快速创建 React Flow 自定义节点
> **版本**: v1.0.0

---

## 技能说明

此技能帮助开发者快速创建符合项目规范的 React Flow 自定义节点，包括：
- 输入节点（文本、图片、角色库、API设置）
- 处理节点（视频生成、角色创建、故事板、提示词优化）
- 输出节点（任务结果、角色结果）

---

## 使用方式

### 基本用法

```bash
# 创建一个新的输入节点
/skills reactflow-dev --type=input --name=myCustomNode

# 创建一个新的处理节点
/skills reactflow-dev --type=process --name=videoEditor

# 创建一个新的输出节点
/skills reactflow-dev --type=output --name=resultDisplay
```

### 高级用法

```bash
# 创建带特定 Handle 的节点
/skills reactflow-dev --type=process --name=promptOptimizer --handles=prompt-input,character-input,optimized-output

# 创建可调整大小的节点
/skills reactflow-dev --type=process --name=advancedNode --resizable=true
```

---

## 参数说明

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `--type` | 节点类型 | `input`, `process`, `output` | `process` |
| `--name` | 节点名称（PascalCase） | 任意有效字符串 | `CustomNode` |
| `--handles` | Handle 配置 | 逗号分隔的 Handle ID | 根据类型自动生成 |
| `--resizable` | 是否可调整大小 | `true`, `false` | `false` |
| `--min-width` | 最小宽度 | 数字（像素） | 200 |
| `--min-height` | 最小高度 | 数字（像素） | 100 |

---

## 自动生成的文件

### 节点组件
```
src/client/src/nodes/{type}/{name}.jsx
```

### 节点样式
```
src/client/src/nodes/{type}/{name}.css
```

### 节点测试
```
src/client/src/nodes/{type}/{name}.test.jsx
```

---

## 节点模板

### 输入节点模板

```javascript
import { Handle, Position } from 'reactflow';
import React, { useState } from 'react';
import './{NodeName}.css';

function {NodeName}({ data }) {
  const [value, setValue] = useState(data.value || '');

  const handleChange = (e) => {
    setValue(e.target.value);
    if (data.onUpdate) {
      data.onUpdate({ ...data, value: e.target.value });
    }
  };

  return (
    <div className="custom-node input-node">
      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="handle-output"
      />

      {/* 节点头部 */}
      <div className="node-header">
        <span className="node-icon">📝</span>
        <span className="node-title">{data.label}</span>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="输入内容..."
          className="node-input"
        />
      </div>
    </div>
  );
}

export default {NodeName};
```

### 处理节点模板

```javascript
import { Handle, Position, useNodeId } from 'reactflow';
import React, { useState, useEffect } from 'react';
import './{NodeName}.css';

const API_BASE = 'http://localhost:9000';

function {NodeName}({ data }) {
  const nodeId = useNodeId();
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  // 接收外部数据
  const connectedData = data.connectedData || null;
  const connectedCharacters = data.connectedCharacters || [];
  const connectedImages = data.connectedImages || [];

  useEffect(() => {
    if (data.taskId) {
      setStatus('success');
      setResult(data.taskId);
    }
  }, [data.taskId]);

  const handleExecute = async () => {
    setStatus('loading');

    try {
      const response = await fetch(`${API_BASE}/api/endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: connectedData,
          characters: connectedCharacters,
          images: connectedImages
        })
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setResult(result.data);
        // 更新节点数据，传递给下游
        if (data.onUpdate) {
          data.onUpdate({ ...data, result: result.data });
        }
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      console.error('执行失败:', error);
    }
  };

  return (
    <div className="custom-node process-node">
      {/* 输入 Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="handle-input"
      />

      {/* 节点头部 */}
      <div className="node-header">
        <span className="node-icon">⚡</span>
        <span className="node-title">{data.label}</span>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        <div className="status-indicator">
          {status === 'idle' && '⚪ 空闲'}
          {status === 'loading' && '🔄 处理中...'}
          {status === 'success' && '✅ 完成'}
          {status === 'error' && '❌ 失败'}
        </div>

        {connectedData && (
          <div className="connected-data">
            <strong>输入:</strong> {connectedData}
          </div>
        )}

        {connectedCharacters.length > 0 && (
          <div className="connected-data">
            <strong>角色:</strong> {connectedCharacters.length} 个
          </div>
        )}

        <button
          onClick={handleExecute}
          disabled={status === 'loading'}
          className="execute-btn"
        >
          {status === 'loading' ? '执行中...' : '执行'}
        </button>
      </div>

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="handle-output"
      />
    </div>
  );
}

export default {NodeName};
```

### 输出节点模板

```javascript
import { Handle, Position } from 'reactflow';
import React, { useState, useEffect } from 'react';
import './{NodeName}.css';

function {NodeName}({ data }) {
  const [result, setResult] = useState(null);

  // 从上游节点接收结果
  useEffect(() => {
    if (data.result) {
      setResult(data.result);
    }
  }, [data.result]);

  // 监听上游节点变化
  useEffect(() => {
    if (data.connectedSourceId) {
      // 订阅上游节点的数据变化
      const checkSourceData = () => {
        // 这里可以实现自定义的数据检查逻辑
        console.log('检查上游节点数据:', data.connectedSourceId);
      };

      checkSourceData();
      const interval = setInterval(checkSourceData, 2000);

      return () => clearInterval(interval);
    }
  }, [data.connectedSourceId]);

  return (
    <div className="custom-node output-node">
      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="handle-input"
      />

      {/* 节点头部 */}
      <div className="node-header">
        <span className="node-icon">📺</span>
        <span className="node-title">{data.label}</span>
      </div>

      {/* 节点内容 */}
      <div className="node-body">
        {result ? (
          <div className="result-display">
            <div className="result-item">
              <strong>任务 ID:</strong> {result.taskId || result.id}
            </div>
            {result.output && (
              <div className="result-item">
                <strong>输出:</strong>
                <a href={result.output} target="_blank" rel="noopener noreferrer">
                  查看结果
                </a>
              </div>
            )}
            {result.status && (
              <div className="result-item">
                <strong>状态:</strong> {result.status}
              </div>
            )}
          </div>
        ) : (
          <div className="no-result">
            等待输入...
          </div>
        )}
      </div>
    </div>
  );
}

export default {NodeName};
```

---

## 样式模板

```css
.custom-node {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  min-width: 200px;
  min-height: 100px;
  color: #f8fafc;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.custom-node:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #334155;
}

.node-icon {
  font-size: 18px;
}

.node-title {
  font-weight: 600;
  font-size: 14px;
}

.node-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Handle 样式 */
.handle-input,
.handle-output {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border: 2px solid #60a5fa;
}

/* 输入节点样式 */
.input-node {
  border-left: 3px solid #3b82f6;
}

/* 处理节点样式 */
.process-node {
  border-left: 3px solid #8b5cf6;
}

/* 输出节点样式 */
.output-node {
  border-left: 3px solid #10b981;
}

/* 状态指示器 */
.status-indicator {
  padding: 6px 10px;
  background: #334155;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

/* 按钮 */
.execute-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.execute-btn:hover:not(:disabled) {
  background: #2563eb;
}

.execute-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 连接数据显示 */
.connected-data {
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
  font-size: 12px;
}

/* 结果显示 */
.result-display {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  padding: 6px 8px;
  background: #0f172a;
  border-radius: 4px;
  font-size: 12px;
}

.result-item a {
  color: #3b82f6;
  text-decoration: none;
}

.result-item a:hover {
  text-decoration: underline;
}

.no-result {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}
```

---

## 集成到 App.jsx

### 1. 导入节点

```javascript
import {NodeName} from './nodes/{type}/{NodeName}';
```

### 2. 注册节点类型

```javascript
const nodeTypes = {
  // ... 其他节点
  {nodeName}: {NodeName},
};
```

### 3. 添加到节点模板

```javascript
const nodeTemplates = [
  // ... 其他模板
  {
    type: '{nodeName}',
    label: '🎯 {Node Title}',
    category: '{type}'
  },
];
```

### 4. 在 useEffect 中处理连接

```javascript
useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      const incomingEdges = edges.filter((e) => e.target === node.id);
      const newData = { ...node.data };

      // 处理 {nodeName} 的连接
      if (node.type === '{nodeName}') {
        const inputEdge = incomingEdges.find(
          (e) => e.targetHandle === 'input'
        );

        if (inputEdge) {
          const sourceNode = nds.find((n) => n.id === inputEdge.source);
          newData.connectedData = sourceNode?.data?.value;
        }
      }

      // 其他节点类型的处理...

      return { ...node, data: newData };
    })
  );
}, [edges, setNodes]);
```

---

## 测试节点

### 单元测试

```javascript
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import {NodeName} from './{NodeName}';

describe('{NodeName}', () => {
  it('should render node with label', () => {
    const nodes = [{
      id: '1',
      type: '{nodeName}',
      data: { label: '测试节点' }
    }];

    render(
      <ReactFlowProvider>
        <ReactFlow nodes={nodes} edges={[]} />
      </ReactFlowProvider>
    );

    expect(screen.getByText('测试节点')).toBeInTheDocument();
  });

  it('should handle input change', () => {
    // 测试输入处理
  });

  it('should execute and update status', () => {
    // 测试执行逻辑
  });
});
```

---

## 常见问题

### Q: 节点不显示？

**A**: 检查以下几点：
1. 节点是否正确导入
2. 节点是否在 `nodeTypes` 中注册
3. 节点 ID 是否唯一
4. 节点 `position` 是否有效

### Q: Handle 无法连接？

**A**: 检查：
1. Handle 的 `type`（target/source）是否正确
2. Handle 的 `id` 是否唯一
3. Handle 是否正确放置在节点组件中

### Q: 数据未传递？

**A**: 检查：
1. `useEffect` 的依赖是否正确
2. Handle ID 是否匹配
3. 是否正确更新节点数据

---

## 参考文档

- [React Flow 官方文档](https://reactflow.dev/)
- [项目 React Flow 规则](../../rules/reactflow.md)

---

**最后更新**: 2026-01-08
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
