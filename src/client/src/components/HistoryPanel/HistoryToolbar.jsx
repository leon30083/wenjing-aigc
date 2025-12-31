import React from 'react';

/**
 * HistoryToolbar - 历史记录工具栏组件
 * 提供筛选下拉菜单（状态、平台、类型、收藏）和清空全部按钮
 */
function HistoryToolbar({
  statusFilter,
  platformFilter,
  typeFilter,
  favoriteFilter,
  onStatusChange,
  onPlatformChange,
  onTypeChange,
  onFavoriteChange,
  onClearAll,
  counts = {}
}) {
  // 状态选项
  const statusOptions = [
    { value: 'all', label: '全部状态', count: counts.all || 0 },
    { value: 'completed', label: '已完成', count: counts.completed || 0 },
    { value: 'processing', label: '处理中', count: counts.processing || 0 },
    { value: 'failed', label: '失败', count: counts.failed || 0 },
  ];

  // 平台选项
  const platformOptions = [
    { value: 'all', label: '全部平台' },
    { value: 'juxin', label: '聚鑫' },
    { value: 'zhenzhen', label: '贞贞' },
  ];

  // 类型选项
  const typeOptions = [
    { value: 'all', label: '全部类型' },
    { value: 'text-to-video', label: '文生视频' },
    { value: 'image-to-video', label: '图生视频' },
    { value: 'storyboard', label: '故事板' },
  ];

  // 收藏选项
  const favoriteOptions = [
    { value: 'all', label: '全部记录' },
    { value: 'favorites', label: '⭐ 我的收藏' },
  ];

  return (
    <div style={{
      padding: '8px 12px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      gap: '6px',
    }}>
      {/* 状态筛选 */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="nodrag"
        style={{
          flex: 1,
          padding: '6px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '11px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {statusOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label} {option.count > 0 && `(${option.count})`}
          </option>
        ))}
      </select>

      {/* 平台筛选 */}
      <select
        value={platformFilter}
        onChange={(e) => onPlatformChange(e.target.value)}
        className="nodrag"
        style={{
          flex: 1,
          padding: '6px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '11px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {platformOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 类型筛选 */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
        className="nodrag"
        style={{
          flex: 1,
          padding: '6px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '11px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {typeOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 收藏筛选 */}
      <select
        value={favoriteFilter}
        onChange={(e) => onFavoriteChange(e.target.value)}
        className="nodrag"
        style={{
          flex: 1,
          padding: '6px 8px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          fontSize: '11px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {favoriteOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 清空全部按钮 */}
      <button
        onClick={onClearAll}
        className="nodrag"
        style={{
          padding: '6px 12px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
        title="清空所有历史记录"
      >
        🗑️ 清空全部
      </button>
    </div>
  );
}

export default HistoryToolbar;
