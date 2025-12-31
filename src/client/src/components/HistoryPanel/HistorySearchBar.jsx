import React from 'react';

/**
 * HistorySearchBar - 历史记录搜索栏组件
 * 提供搜索输入框，支持按提示词搜索
 */
function HistorySearchBar({ value, onChange, onClear }) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* 搜索图标 */}
        <span style={{
          position: 'absolute',
          left: '12px',
          fontSize: '14px',
          color: '#9ca3af',
          pointerEvents: 'none',
        }}>
          🔍
        </span>

        {/* 搜索输入框 */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="搜索提示词、标签..."
          className="nodrag"
          style={{
            width: '100%',
            padding: '8px 12px 8px 36px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
          }}
        />

        {/* 清除按钮 */}
        {value && (
          <button
            onClick={handleClear}
            className="nodrag"
            style={{
              position: 'absolute',
              right: '8px',
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
            title="清除搜索"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default HistorySearchBar;
