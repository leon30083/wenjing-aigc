/**
 * EvaluationCard 组件
 *
 * 显示提示词质量评估结果
 */

import React from 'react';

/**
 * 评分卡片组件
 */
export function EvaluationCard({ evaluationResult, onApplySuggestion, compact = false }) {
  if (!evaluationResult) {
    return (
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
        }}
      >
        暂无评估结果
      </div>
    );
  }

  const {
    score,
    grade,
    gradeLabel,
    gradeColor,
    gradeBgColor,
    dimensions,
    suggestions,
    summary,
  } = evaluationResult;

  // 计算进度条颜色
  const getProgressColor = (percentage) => {
    if (percentage >= 75) return '#10b981'; // green
    if (percentage >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div
      style={{
        padding: compact ? '8px' : '12px',
        backgroundColor: gradeBgColor,
        borderRadius: '6px',
        border: `2px solid ${gradeColor}`,
        fontSize: '12px',
      }}
    >
      {/* 评分标题 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#1f2937' }}>📊 质量评分</span>
        <span style={{ fontSize: compact ? '14px' : '16px', fontWeight: 'bold', color }}>
          {score}/100
        </span>
      </div>

      {/* 等级标签 */}
      <div
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '3px',
          backgroundColor: gradeColor,
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          marginBottom: compact ? '6px' : '8px',
        }}
      >
        {grade} - {gradeLabel}
      </div>

      {/* 各维度得分 */}
      {!compact && dimensions && dimensions.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          {dimensions.map((dim) => (
            <div key={dim.id} style={{ marginBottom: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: '#4b5563' }}>{dim.name}</span>
                <span style={{ color: '#6b7280' }}>
                  {dim.score}/{dim.weight}
                </span>
              </div>
              <div
                style={{
                  height: '4px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${dim.percentage}%`,
                    backgroundColor: getProgressColor(dim.percentage),
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 改进建议 */}
      {suggestions && suggestions.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #d1d5db',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              marginBottom: '4px',
              color: '#1f2937',
            }}
          >
            💡 改进建议 ({suggestions.length}):
          </div>
          {suggestions.slice(0, compact ? 2 : 5).map((suggestion, index) => (
            <div
              key={index}
              style={{
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '4px',
              }}
            >
              {onApplySuggestion && (
                <button
                  onClick={() => onApplySuggestion(suggestion)}
                  className="nodrag"
                  style={{
                    padding: '2px 6px',
                    fontSize: '9px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="点击应用此建议"
                >
                  应用
                </button>
              )}
              <span
                style={{
                  fontSize: '9px',
                  color: '#4b5563',
                  flex: 1,
                }}
              >
                {suggestion.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 总结 */}
      {!compact && summary && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed #d1d5db',
            fontSize: '10px',
            color: '#6b7280',
            fontStyle: 'italic',
            whiteSpace: 'pre-line',
          }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑版评分组件（仅显示分数和等级）
 */
export function MiniScore({ evaluationResult }) {
  if (!evaluationResult) {
    return null;
  }

  const { score, grade, gradeColor, gradeBgColor } = evaluationResult;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: gradeBgColor,
        borderRadius: '3px',
        border: `1px solid ${gradeColor}`,
        fontSize: '10px',
        fontWeight: 'bold',
      }}
    >
      <span style={{ color: gradeColor }}>{grade}</span>
      <span style={{ color: '#1f2937' }}>{score}/100</span>
    </div>
  );
}

export default EvaluationCard;
