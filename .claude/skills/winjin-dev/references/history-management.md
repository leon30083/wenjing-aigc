# ComfyUI 风格历史记录管理规划

**文档版本**: v1.0
**创建日期**: 2025-12-31
**状态**: 规划中

---

## 1. 功能概述

参考 ComfyUI 的历史记录管理界面，在工作流编辑器中添加侧边历史记录面板，实现以下功能：

### 核心功能
- **历史记录侧边面板**: 显示所有任务历史记录
- **卡片式布局**: 每条记录显示缩略图、提示词、状态、时间
- **点击加载工作流**: 点击历史卡片恢复工作流
- **筛选和搜索**: 按状态、平台、类型、日期筛选
- **右键菜单**: 删除、复制提示词、复制工作流 JSON
- **收藏功能**: 标记常用工作流
- **批量操作**: 批量删除、导出、导入

---

## 2. UI/UX 设计

### 2.1 侧边面板布局

```
┌──────────────────────────────────────────────────────────┐
│  工作流画布 (React Flow)           │  历史记录 (侧边栏)  │
│                                    │                     │
│  ┌──────┐    ┌──────┐              │  🔍 搜索...        │
│  │ 文本 │───→│ 视频 │              │  ⚙️ 筛选 ▼         │
│  └──────┘    └──────┘              │  ───────────────   │
│                                    │                     │
│  ┌──────┐    ┌──────┐              │  ┌─────────────┐   │
│  │角色库│───→│故事板│              │  │ 🖼️ 缩略图   │   │
│  └──────┘    └──────┘              │  │ 提示词...   │   │
│                                    │  │ ✅ 完成     │   │
│                                    │  │ 10 分钟前   │   │
│                                    │  └─────────────┘   │
│                                    │                     │
│                                    │  ┌─────────────┐   │
│                                    │  │ 🖼️ 缩略图   │   │
│                                    │  │ 提示词...   │   │
│                                    │  │ ⏳ 处理中   │   │
│                                    │  │ 5 分钟前    │   │
│                                    │  └─────────────┘   │
│                                    │                     │
│                                    │  < 1 2 3 ... >     │
└──────────────────────────────────────────────────────────┘
```

### 2.2 历史卡片样式

```javascript
// HistoryCard.jsx
<div style={{
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: '#ffffff',
}}>
  {/* 缩略图 */}
  <img
    src={thumbnail || defaultThumbnail}
    alt="视频缩略图"
    style={{
      width: '100%',
      height: '120px',
      objectFit: 'cover',
      borderRadius: '4px',
      marginBottom: '8px',
    }}
  />

  {/* 状态标签 */}
  <div style={{
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    backgroundColor: statusColor,
    color: 'white',
  }}>
    {statusLabel}
  </div>

  {/* 提示词预览 */}
  <div style={{
    fontSize: '12px',
    color: '#374151',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  }}>
    {prompt}
  </div>

  {/* 时间戳 */}
  <div style={{
    fontSize: '10px',
    color: '#9ca3af',
    display: 'flex',
    justifyContent: 'space-between',
  }}>
    <span>{timeAgo}</span>
    <span>⭐ {favorite ? '已收藏' : '收藏'}</span>
  </div>
</div>
```

---

## 3. 数据结构扩展

### 3.1 历史记录数据结构

```javascript
// 现有结构
{
  id: "history_timestamp_random",
  taskId: "video_xxx",
  platform: "juxin" | "zhenzhen",
  prompt: "...",
  model: "sora-2" | "sora-2-pro",
  options: { duration, aspect_ratio, watermark, images, shots },
  status: "queued" | "processing" | "completed" | "failed",
  createdAt: "ISO string",
  updatedAt: "ISO string",
  result: { output: "video_url" } | null,
  downloadedPath: "local path" | null,
  error: "error message" | null
}

// ⭐ 新增字段
{
  workflowSnapshot: {    // ⭐ 工作流快照
    nodes: [...],        // React Flow 节点数组
    edges: [...],        // React Flow 连线数组
    viewport: { x, y, zoom }  // 画布视口状态
  },
  thumbnail: null,       // ⭐ 缩略图 URL（本地或远程）
  tags: [],              // ⭐ 标签数组（用户自定义）
  favorite: false,       // ⭐ 是否收藏
  viewedCount: 0,        // ⭐ 查看次数
  lastViewedAt: null,    // ⭐ 最后查看时间
  promptLower: "",       // ⭐ 提示词小写版本（搜索优化）
  type: "text-to-video" | "image-to-video" | "storyboard"  // ⭐ 任务类型
}
```

### 3.2 类型识别逻辑

```javascript
function detectTaskType(record) {
  const { options, prompt } = record;

  // 检查是否是故事板
  if (options.shots && Array.isArray(options.shots) && options.shots.length > 0) {
    return 'storyboard';
  }

  // 检查是否有参考图片
  if (options.images && Array.isArray(options.images) && options.images.length > 0) {
    return 'image-to-video';
  }

  // 默认为文生视频
  return 'text-to-video';
}
```

---

## 4. 前端组件架构

### 4.1 组件树结构

```
src/client/src/components/HistoryPanel/
├── HistoryPanel.jsx          # 主面板容器
├── HistoryCard.jsx           # 单个历史卡片
├── HistorySearchBar.jsx      # 搜索栏
├── HistoryToolbar.jsx        # 工具栏（筛选、批量操作）
├── HistoryDetailsModal.jsx   # 详情模态框
└── HistoryContextMenu.jsx    # 右键菜单
```

### 4.2 HistoryPanel.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';

function HistoryPanel() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // 获取历史记录
  useEffect(() => {
    fetchHistoryRecords();
  }, []);

  // 筛选和搜索
  useEffect(() => {
    applyFilters();
  }, [records, searchQuery, statusFilter, platformFilter, typeFilter]);

  const fetchHistoryRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/history/list');
      const result = await response.json();
      if (result.success) {
        setRecords(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = records;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // 平台筛选
    if (platformFilter !== 'all') {
      filtered = filtered.filter(r => r.platform === platformFilter);
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.promptLower?.includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredRecords(filtered);
  };

  return (
    <Panel defaultSize={25} minSize={20}>
      <div style={{
        height: '100%',
        borderLeft: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 搜索栏 */}
        <HistorySearchBar
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* 工具栏 */}
        <HistoryToolbar
          statusFilter={statusFilter}
          platformFilter={platformFilter}
          typeFilter={typeFilter}
          onStatusChange={setStatusFilter}
          onPlatformChange={setPlatformFilter}
          onTypeChange={setTypeFilter}
        />

        {/* 历史记录列表 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}>
          {loading ? (
            <div>加载中...</div>
          ) : filteredRecords.length === 0 ? (
            <div>暂无历史记录</div>
          ) : (
            filteredRecords.map(record => (
              <HistoryCard
                key={record.id}
                record={record}
                onClick={() => loadWorkflowFromHistory(record)}
              />
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}

export default HistoryPanel;
```

### 4.3 HistoryCard.jsx

```javascript
import React from 'react';

function HistoryCard({ record, onClick }) {
  const { prompt, status, createdAt, thumbnail, favorite, type } = record;

  const statusColors = {
    queued: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
  };

  const statusLabels = {
    queued: '排队中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };

  const typeLabels = {
    'text-to-video': '文生视频',
    'image-to-video': '图生视频',
    'storyboard': '故事板',
  };

  const timeAgo = getTimeAgo(createdAt);

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* 缩略图 */}
      <img
        src={thumbnail || '/default-thumbnail.png'}
        alt="视频缩略图"
        style={{
          width: '100%',
          height: '120px',
          objectFit: 'cover',
          borderRadius: '4px',
          marginBottom: '8px',
        }}
      />

      {/* 状态标签 */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: statusColors[status],
        color: 'white',
      }}>
        {statusLabels[status]}
      </div>

      {/* 类型标签 */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        backgroundColor: '#6b7280',
        color: 'white',
      }}>
        {typeLabels[type]}
      </div>

      {/* 提示词预览 */}
      <div style={{
        fontSize: '12px',
        color: '#374151',
        marginBottom: '8px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {prompt}
      </div>

      {/* 时间戳和收藏 */}
      <div style={{
        fontSize: '10px',
        color: '#9ca3af',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>{timeAgo}</span>
        <span>{favorite ? '⭐ 已收藏' : '☆ 收藏'}</span>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  return `${diffDays} 天前`;
}

export default HistoryCard;
```

---

## 5. 核心功能实现

### 5.1 点击加载工作流

```javascript
// App.jsx
function loadWorkflowFromHistory(record) {
  const { workflowSnapshot } = record;

  if (!workflowSnapshot) {
    console.warn('No workflow snapshot found');
    return;
  }

  // 恢复节点和连线
  setNodes(workflowSnapshot.nodes || []);
  setEdges(workflowSnapshot.edges || []);

  // 恢复视口状态（可选）
  if (workflowSnapshot.viewport) {
    setViewport(workflowSnapshot.viewport);
  }

  // 更新查看次数
  updateViewedCount(record.id);
}

const updateViewedCount = async (recordId) => {
  await fetch(`/api/history/${recordId}/view`, { method: 'POST' });
};
```

### 5.2 右键菜单

```javascript
// HistoryContextMenu.jsx
function HistoryContextMenu({ record, position, onClose }) {
  const handleDelete = async () => {
    if (confirm(`确认删除历史记录 "${record.prompt}"?`)) {
      await fetch(`/api/history/${record.taskId}`, { method: 'DELETE' });
      onClose();
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(record.prompt);
    onClose();
  };

  const handleCopyWorkflowJSON = () => {
    const json = JSON.stringify(record.workflowSnapshot, null, 2);
    navigator.clipboard.writeText(json);
    onClose();
  };

  const handleToggleFavorite = async () => {
    await fetch(`/api/history/${record.taskId}/favorite`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: !record.favorite }),
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem onClick={handleCopyPrompt}>📋 复制提示词</MenuItem>
      <MenuItem onClick={handleCopyWorkflowJSON}>📋 复制工作流 JSON</MenuItem>
      <MenuItem onClick={handleToggleFavorite}>
        {record.favorite ? '☆ 取消收藏' : '⭐ 收藏'}
      </MenuItem>
      <MenuItem onClick={handleDelete}>🗑️ 删除</MenuItem>
    </div>
  );
}
```

### 5.3 搜索和筛选

```javascript
// HistorySearchBar.jsx
function HistorySearchBar({ value, onChange }) {
  return (
    <div style={{ padding: '12px' }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="🔍 搜索提示词、标签..."
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '12px',
        }}
      />
    </div>
  );
}

// HistoryToolbar.jsx
function HistoryToolbar({
  statusFilter,
  platformFilter,
  typeFilter,
  onStatusChange,
  onPlatformChange,
  onTypeChange,
}) {
  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      gap: '8px',
    }}>
      {/* 状态筛选 */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        style={{ flex: 1, padding: '6px' }}
      >
        <option value="all">全部状态</option>
        <option value="completed">已完成</option>
        <option value="processing">处理中</option>
        <option value="failed">失败</option>
      </select>

      {/* 平台筛选 */}
      <select
        value={platformFilter}
        onChange={(e) => onPlatformChange(e.target.value)}
        style={{ flex: 1, padding: '6px' }}
      >
        <option value="all">全部平台</option>
        <option value="juxin">聚鑫</option>
        <option value="zhenzhen">贞贞</option>
      </select>

      {/* 类型筛选 */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
        style={{ flex: 1, padding: '6px' }}
      >
        <option value="all">全部类型</option>
        <option value="text-to-video">文生视频</option>
        <option value="image-to-video">图生视频</option>
        <option value="storyboard">故事板</option>
      </select>
    </div>
  );
}
```

---

## 6. 后端 API 扩展

### 6.1 新增 API 端点

```javascript
// src/server/index.js

// 获取工作流快照
app.get('/api/history/:taskId/workflow', (req, res) => {
  const record = historyStorage.getRecord(req.params.taskId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }
  res.json({ success: true, data: record.workflowSnapshot });
});

// 更新查看次数
app.post('/api/history/:taskId/view', (req, res) => {
  const record = historyStorage.getRecord(req.params.taskId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  record.viewedCount = (record.viewedCount || 0) + 1;
  record.lastViewedAt = new Date().toISOString();

  historyStorage.updateRecord(req.params.taskId, record);
  res.json({ success: true });
});

// 切换收藏状态
app.put('/api/history/:taskId/favorite', (req, res) => {
  const { favorite } = req.body;
  const record = historyStorage.getRecord(req.params.taskId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  record.favorite = favorite;
  historyStorage.updateRecord(req.params.taskId, record);
  res.json({ success: true, data: record });
});

// 添加标签
app.post('/api/history/:taskId/tags', (req, res) => {
  const { tags } = req.body;
  const record = historyStorage.getRecord(req.params.taskId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  record.tags = tags;
  historyStorage.updateRecord(req.params.taskId, record);
  res.json({ success: true, data: record });
});
```

### 6.2 HistoryStorage 扩展

```javascript
// src/server/history-storage.js

class HistoryStorage {
  // ... 现有方法

  // 更新查看次数
  updateViewedCount(taskId) {
    const records = this._loadRecords();
    const index = records.findIndex(r => r.taskId === taskId);
    if (index !== -1) {
      records[index].viewedCount = (records[index].viewedCount || 0) + 1;
      records[index].lastViewedAt = new Date().toISOString();
      this._saveRecords(records);
    }
  }

  // 切换收藏状态
  toggleFavorite(taskId) {
    const records = this._loadRecords();
    const index = records.findIndex(r => r.taskId === taskId);
    if (index !== -1) {
      records[index].favorite = !records[index].favorite;
      this._saveRecords(records);
      return records[index];
    }
    return null;
  }

  // 搜索记录
  searchRecords(query) {
    const records = this._loadRecords();
    const lowerQuery = query.toLowerCase();
    return records.filter(r =>
      r.promptLower?.includes(lowerQuery) ||
      r.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // 获取收藏的记录
  getFavorites() {
    const records = this._loadRecords();
    return records.filter(r => r.favorite);
  }
}
```

---

## 7. 开发阶段规划

### Phase 1: 基础显示 (优先级: 高)

**目标**: 实现历史记录侧边面板的基本显示

**任务清单**:
- [ ] 创建 `HistoryPanel.jsx` 主面板组件
- [ ] 创建 `HistoryCard.jsx` 卡片组件
- [ ] 创建 `HistorySearchBar.jsx` 搜索栏
- [ ] 创建 `HistoryToolbar.jsx` 工具栏
- [ ] 集成到 App.jsx (使用 PanelGroup)
- [ ] 实现历史记录获取和显示
- [ ] 添加状态筛选（全部/已完成/处理中/失败）
- [ ] 添加平台筛选（全部/聚鑫/贞贞）
- [ ] 添加分页功能（每页 20 条）

**验证标准**:
- 历史记录面板正常显示
- 卡片正确显示提示词、状态、时间
- 筛选功能正常工作
- 分页功能正常工作

### Phase 2: 核心交互 (优先级: 高)

**目标**: 实现点击加载工作流和右键菜单

**任务清单**:
- [ ] 实现点击卡片加载工作流
- [ ] 实现右键菜单显示/隐藏
- [ ] 实现右键菜单功能:
  - [ ] 复制提示词
  - [ ] 复制工作流 JSON
  - [ ] 删除记录
  - [ ] 切换收藏状态
- [ ] 添加确认对话框（删除操作）
- [ ] 实现搜索功能（提示词、标签）
- [ ] 更新查看次数

**验证标准**:
- 点击卡片能正确恢复工作流
- 右键菜单功能正常
- 删除操作有确认对话框
- 搜索功能返回正确结果

### Phase 3: 高级功能 (优先级: 中)

**目标**: 实现批量操作、标签系统、统计信息

**任务清单**:
- [ ] 实现批量选择（多选框）
- [ ] 实现批量删除
- [ ] 实现批量导出（JSON 文件）
- [ ] 实现批量导入
- [ ] 实现标签管理（添加、删除、编辑）
- [ ] 实现标签筛选
- [ ] 实现收藏列表
- [ ] 实现统计信息面板（总数、完成率、平台分布）
- [ ] 添加缩略图生成和显示
- [ ] 实现时间筛选（今天/本周/本月）

**验证标准**:
- 批量操作正常工作
- 标签系统完整
- 统计信息准确
- 缩略图正确显示

---

## 8. 技术要点

### 8.1 工作流快照保存时机

```javascript
// 在提交任务时保存工作流快照
// VideoGenerateNode.jsx, StoryboardNode.jsx

const handleSubmit = async () => {
  // ... 准备请求参数

  // 获取当前工作流状态
  const { nodes, edges, getViewport } = useReactFlow();
  const workflowSnapshot = {
    nodes,
    edges,
    viewport: getViewport(),
  };

  // 发送请求时包含工作流快照
  const response = await fetch('/api/video/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      images,
      workflowSnapshot,  // ⭐ 添加工作流快照
    }),
  });

  // ...
};
```

### 8.2 缩略图生成策略

```javascript
// src/server/thumbnail-generator.js

class ThumbnailGenerator {
  async generateThumbnail(videoUrl) {
    // 方案1: 使用视频第一帧
    // 方案2: 使用视频中间帧
    // 方案3: 使用 ffprobe 提取缩略图
    // 方案4: 使用远程视频服务的缩略图 API

    // MVP: 先使用远程视频 URL，后续优化
    return videoUrl; // 或提取的缩略图 URL
  }
}
```

### 8.3 性能优化

- **虚拟滚动**: 使用 `react-window` 优化长列表渲染
- **懒加载**: 缩略图使用懒加载，只加载可见区域
- **防抖搜索**: 搜索输入使用 300ms 防抖
- **缓存策略**: 缓存已加载的历史记录

---

## 9. 待解决问题

1. **缩略图存储**: 本地存储还是远程 URL？
2. **历史记录迁移**: 如何迁移现有历史记录（无 workflowSnapshot）？
3. **面板布局**: 使用固定宽度还是可调整宽度？
4. **数据同步**: 如何处理多标签页的数据同步？

---

## 10. 相关文档

- ComfyUI 历史记录界面参考: https://github.com/comfyanonymous/ComfyUI
- React Flow 文档: https://reactflow.dev/
- Panel 组件库: https://github.com/bvaughn/react-resizable-panels
