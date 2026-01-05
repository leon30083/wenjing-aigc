/**
 * usePromptOptimizer Hook
 *
 * 提示词优化核心 Hook
 * 提供生成、评估、补全等功能
 */

import { useState, useCallback, useRef } from 'react';
import { PromptBuilder } from '../utils/prompt/promptBuilder.js';
import { PromptTemplateManager } from '../utils/prompt/promptTemplates.js';
import { PromptEvaluator } from '../utils/prompt/promptEvaluator.js';
import { GENERATION_MODES, DEFAULT_CONFIG } from '../utils/prompt/constants.js';

/**
 * 提示词优化器 Hook
 */
export function usePromptOptimizer(options = {}) {
  const {
    defaultMode = GENERATION_MODES.TEXT_TO_VIDEO,
    defaultTemplate = DEFAULT_CONFIG.defaultTemplate,
    autoEvaluate = true, // 生成后自动评估
  } = options;

  // 状态管理
  const [mode, setMode] = useState(defaultMode);
  const [templateId, setTemplateId] = useState(defaultTemplate);
  const [prompt, setPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState(null);

  // 用于取消异步操作的 ref
  const isMountedRef = useRef(true);

  /**
   * 自动生成提示词
   */
  const generatePrompt = useCallback(
    async (sceneDescription, generateOptions = {}) => {
      if (!sceneDescription) {
        setError('场景描述不能为空');
        return { success: false, error: '场景描述不能为空' };
      }

      setIsGenerating(true);
      setError(null);
      setGeneratedPrompt(null);
      if (autoEvaluate) {
        setEvaluationResult(null);
      }

      try {
        const result = await Promise.resolve(
          PromptBuilder.generate({
            mode,
            templateId,
            sceneDescription,
            characters: generateOptions.characters || [],
            images: generateOptions.images || [],
            variables: generateOptions.variables || {},
          })
        );

        if (!isMountedRef.current) return result;

        if (result.success) {
          setGeneratedPrompt(result);
          setPrompt(result.prompt);

          // 自动评估生成的提示词
          if (autoEvaluate) {
            await evaluatePrompt(result.prompt, {
              characters: generateOptions.characters || [],
              images: generateOptions.images || [],
            });
          }
        } else {
          setError(result.error);
        }

        return result;
      } catch (err) {
        const errorMessage = err.message || '生成失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [mode, templateId, autoEvaluate]
  );

  /**
   * 评估提示词质量
   */
  const evaluatePrompt = useCallback(
    async (promptToEvaluate, context = {}) => {
      if (!promptToEvaluate) {
        setError('提示词不能为空');
        return { success: false, error: '提示词不能为空' };
      }

      setIsEvaluating(true);
      setError(null);

      try {
        const result = await Promise.resolve(
          PromptEvaluator.evaluate(promptToEvaluate, mode, context)
        );

        if (isMountedRef.current) {
          setEvaluationResult(result);
        }

        return result;
      } catch (err) {
        const errorMessage = err.message || '评估失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        if (isMountedRef.current) {
          setIsEvaluating(false);
        }
      }
    },
    [mode]
  );

  /**
   * 智能补全提示词
   */
  const autoComplete = useCallback(
    async (partialPrompt, autoCompleteOptions = {}) => {
      if (!partialPrompt) {
        setError('提示词不能为空');
        return { success: false, error: '提示词不能为空' };
      }

      setIsGenerating(true);
      setError(null);

      try {
        const result = await Promise.resolve(
          PromptBuilder.autoComplete(partialPrompt, {
            mode,
            characters: autoCompleteOptions.characters || [],
            images: autoCompleteOptions.images || [],
            templateId: autoCompleteOptions.templateId || templateId,
          })
        );

        if (isMountedRef.current && result.success) {
          setPrompt(result.completedPrompt);
        }

        return result;
      } catch (err) {
        const errorMessage = err.message || '补全失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        if (isMountedRef.current) {
          setIsGenerating(false);
        }
      }
    },
    [mode, templateId]
  );

  /**
   * 应用改进建议
   */
  const applySuggestion = useCallback(
    async (suggestionType) => {
      if (!prompt) {
        setError('没有可优化的提示词');
        return { success: false, error: '没有可优化的提示词' };
      }

      try {
        const optimizedPrompt = PromptEvaluator.applySuggestion(prompt, suggestionType);

        setPrompt(optimizedPrompt);

        // 重新评估
        if (autoEvaluate) {
          await evaluatePrompt(optimizedPrompt);
        }

        return { success: true, prompt: optimizedPrompt };
      } catch (err) {
        const errorMessage = err.message || '应用建议失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [prompt, autoEvaluate, evaluatePrompt]
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setPrompt('');
    setGeneratedPrompt(null);
    setEvaluationResult(null);
    setError(null);
    setIsGenerating(false);
    setIsEvaluating(false);
  }, []);

  /**
   * 更新生成模式
   */
  const updateMode = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  /**
   * 更新模板
   */
  const updateTemplate = useCallback((newTemplateId) => {
    setTemplateId(newTemplateId);
  }, []);

  /**
   * 手动设置提示词
   */
  const setPromptValue = useCallback((newPrompt) => {
    setPrompt(newPrompt);
  }, []);

  /**
   * 获取所有可用模板
   */
  const getAvailableTemplates = useCallback(() => {
    return PromptTemplateManager.getTemplateList();
  }, []);

  /**
   * 清理副作用
   */
  const cleanup = useCallback(() => {
    isMountedRef.current = false;
  }, []);

  return {
    // 状态
    mode,
    templateId,
    prompt,
    generatedPrompt,
    evaluationResult,
    isGenerating,
    isEvaluating,
    error,

    // 方法
    generatePrompt,
    evaluatePrompt,
    autoComplete,
    applySuggestion,
    reset,
    updateMode,
    updateTemplate,
    setPromptValue,
    getAvailableTemplates,
    cleanup,

    // 便捷属性
    hasPrompt: !!prompt,
    hasEvaluation: !!evaluationResult,
    score: evaluationResult?.score || null,
    grade: evaluationResult?.grade || null,
    gradeLabel: evaluationResult?.gradeLabel || null,
  };
}

export default usePromptOptimizer;
