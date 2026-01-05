/**
 * PromptOptimizer 组件
 *
 * 提示词优化器主组件
 * 整合评估、建议、模板选择等功能
 */

import React from 'react';
import { EvaluationCard, MiniScore } from './EvaluationCard.jsx';
import { TemplateSelector, TemplateCardSelector, TemplatePreview } from './TemplateSelector.jsx';

/**
 * 提示词优化器组件
 */
export function PromptOptimizer({
  evaluationResult,
  templates,
  selectedTemplateId,
  onGeneratePrompt,
  onEvaluatePrompt,
  onApplySuggestion,
  onSelectTemplate,
  onAutoComplete,
  isGenerating,
  isEvaluating,
  error,
  compact = false,
  showTemplateSelector = true,
  showSuggestions = true,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...style,
      }}
    >
      {/* 错误提示 */}
      {error && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#fee2e2',
            borderRadius: '4px',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '11px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* 快速操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onGeneratePrompt}
          disabled={isGenerating}
          className="nodrag"
          style={{
            padding: '6px 10px',
            backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1,
          }}
          title="基于模板自动生成提示词"
        >
          {isGenerating ? '⏳ 生成中...' : '✨ 自动生成'}
        </button>

        <button
          onClick={onEvaluatePrompt}
          disabled={isEvaluating}
          className="nodrag"
          style={{
            padding: '6px 10px',
            backgroundColor: isEvaluating ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: isEvaluating ? 'not-allowed' : 'pointer',
            opacity: isEvaluating ? 0.6 : 1,
          }}
          title="评估当前提示词质量"
        >
          {isEvaluating ? '⏳ 评估中...' : '🔍 评估质量'}
        </button>

        <button
          onClick={onAutoComplete}
          disabled={isGenerating}
          className="nodrag"
          style={{
            padding: '6px 10px',
            backgroundColor: isGenerating ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.6 : 1,
          }}
          title="智能补全提示词"
        >
          {isGenerating ? '⏳ 补全中...' : '🧩 智能补全'}
        </button>
      </div>

      {/* 模板选择器 */}
      {showTemplateSelector && templates && templates.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#4b5563',
              marginBottom: '4px',
            }}
          >
            📋 风格模板
          </div>
          <TemplateSelector
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={onSelectTemplate}
            compact={compact}
          />
        </div>
      )}

      {/* 评估结果 */}
      {evaluationResult && (
        <EvaluationCard
          evaluationResult={evaluationResult}
          onApplySuggestion={showSuggestions ? onApplySuggestion : null}
          compact={compact}
        />
      )}
    </div>
  );
}

/**
 * 紧凑版优化器（仅显示按钮和迷你评分）
 */
export function CompactOptimizer({
  evaluationResult,
  onGeneratePrompt,
  onEvaluatePrompt,
  onApplySuggestion,
  isGenerating,
  isEvaluating,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
    >
      {/* 迷你评分 */}
      {evaluationResult && <MiniScore evaluationResult={evaluationResult} />}

      {/* 快速按钮 */}
      <button
        onClick={onGeneratePrompt}
        disabled={isGenerating}
        className="nodrag"
        style={{
          padding: '4px 8px',
          backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '9px',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
        }}
        title="自动生成提示词"
      >
        ✨
      </button>

      <button
        onClick={onEvaluatePrompt}
        disabled={isEvaluating}
        className="nodrag"
        style={{
          padding: '4px 8px',
          backgroundColor: isEvaluating ? '#9ca3af' : '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '9px',
          cursor: isEvaluating ? 'not-allowed' : 'pointer',
        }}
        title="评估提示词质量"
      >
        🔍
      </button>
    </div>
  );
}

/**
 * 侧边栏优化器（完整功能，适合侧边栏展示）
 */
export function SidebarOptimizer(props) {
  const { evaluationResult, templates, selectedTemplateId } = props;

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'white',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        fontSize: '11px',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        🎨 提示词优化器
      </div>

      {/* 完整优化器 */}
      <PromptOptimizer {...props} />

      {/* 模板预览 */}
      {selectedTemplateId && templates && (
        <div style={{ marginTop: '8px' }}>
          <TemplatePreview
            template={templates.find((t) => t.id === selectedTemplateId)}
          />
        </div>
      )}
    </div>
  );
}

export default PromptOptimizer;
