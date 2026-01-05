/**
 * TemplateSelector 组件
 *
 * 提示词模板选择器
 */

import React from 'react';

/**
 * 模板选择器组件
 */
export function TemplateSelector({
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  showDescription = false,
  disabled = false,
  compact = false,
  style = {},
}) {
  const handleSelect = (e) => {
    const templateId = e.target.value;
    if (onSelectTemplate && templateId) {
      onSelectTemplate(templateId);
    }
  };

  if (!templates || templates.length === 0) {
    return (
      <select
        disabled
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
          fontSize: '11px',
          backgroundColor: '#f3f4f6',
          color: '#9ca3af',
          cursor: 'not-allowed',
          ...style,
        }}
      >
        <option value="">加载中...</option>
      </select>
    );
  }

  return (
    <select
      value={selectedTemplateId || ''}
      onChange={handleSelect}
      disabled={disabled}
      className="nodrag"
      style={{
        width: '100%',
        padding: compact ? '4px 6px' : '6px 8px',
        borderRadius: '4px',
        border: '1px solid #d1d5db',
        fontSize: compact ? '10px' : '11px',
        backgroundColor: disabled ? '#f3f4f6' : 'white',
        color: disabled ? '#9ca3af' : '#1f2937',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      <option value="">选择风格模板...</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {showDescription
            ? `${template.name} - ${template.description}`
            : template.name}
        </option>
      ))}
    </select>
  );
}

/**
 * 模板卡片选择器（网格布局）
 */
export function TemplateCardSelector({
  templates = [],
  selectedTemplateId,
  onSelectTemplate,
  columns = 2,
  disabled = false,
}) {
  if (!templates || templates.length === 0) {
    return (
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '11px',
        }}
      >
        加载模板中...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '8px',
      }}
    >
      {templates.map((template) => {
        const isSelected = template.id === selectedTemplateId;

        return (
          <div
            key={template.id}
            onClick={() => !disabled && onSelectTemplate(template.id)}
            className="nodrag"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: `2px solid ${isSelected ? '#8b5cf6' : '#e5e7eb'}`,
              backgroundColor: isSelected ? '#f5f3ff' : 'white',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {/* 模板名称 */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: isSelected ? '#7c3aed' : '#1f2937',
                marginBottom: '4px',
              }}
            >
              {template.name}
            </div>

            {/* 模板描述 */}
            <div
              style={{
                fontSize: '9px',
                color: '#6b7280',
                marginBottom: '4px',
              }}
            >
              {template.description}
            </div>

            {/* 选中标识 */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 'bold',
                }}
              >
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 模板预览组件
 */
export function TemplatePreview({ template, example }) {
  if (!template) {
    return null;
  }

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        fontSize: '10px',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '4px',
        }}
      >
        📝 {template.name}
      </div>
      <div
        style={{
          color: '#6b7280',
          marginBottom: '6px',
        }}
      >
        {template.description}
      </div>
      {example && (
        <div
          style={{
            padding: '4px',
            backgroundColor: 'white',
            borderRadius: '3px',
            border: '1px dashed #d1d5db',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: '#9ca3af',
              marginBottom: '2px',
            }}
          >
            示例：
          </div>
          <div
            style={{
              color: '#4b5563',
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap',
            }}
          >
            {example}
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;
