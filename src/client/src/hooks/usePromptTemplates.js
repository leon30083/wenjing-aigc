/**
 * usePromptTemplates Hook
 *
 * 提示词模板管理 Hook
 * 提供模板加载、选择、应用等功能
 */

import { useState, useCallback, useEffect } from 'react';
import { PromptTemplateManager } from '../utils/prompt/promptTemplates.js';
import { OFFICIAL_STYLE_TEMPLATES } from '../utils/prompt/constants.js';

/**
 * 提示词模板 Hook
 */
export function usePromptTemplates(options = {}) {
  const { autoLoad = true, defaultTemplate = 'documentary' } = options;

  // 状态管理
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 加载所有模板
   */
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allTemplates = PromptTemplateManager.getTemplateList();
      const templatesArray = Object.entries(OFFICIAL_STYLE_TEMPLATES).map(([id, template]) => ({
        id,
        ...template,
      }));

      if (mounted) {
        setTemplates(templatesArray);
        setFilteredTemplates(templatesArray);
      }
    } catch (err) {
      const errorMessage = err.message || '加载模板失败';
      setError(errorMessage);
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * 根据ID选择模板
   */
  const selectTemplate = useCallback(
    async (templateId) => {
      setSelectedTemplateId(templateId);

      try {
        const template = PromptTemplateManager.getTemplateById(templateId);
        setSelectedTemplate(template);
        return { success: true, template };
      } catch (err) {
        const errorMessage = err.message || '选择模板失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 搜索模板
   */
  const searchTemplates = useCallback(
    async (keyword) => {
      setSearchKeyword(keyword);

      if (!keyword || keyword.trim() === '') {
        setFilteredTemplates(templates);
        return { success: true, results: templates };
      }

      try {
        const results = PromptTemplateManager.searchTemplates(keyword);
        setFilteredTemplates(results);
        return { success: true, results };
      } catch (err) {
        const errorMessage = err.message || '搜索模板失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [templates]
  );

  /**
   * 应用模板到场景描述
   */
  const applyTemplate = useCallback(
    async (templateId, sceneDescription, options = {}) => {
      try {
        const result = PromptTemplateManager.applyTemplate(templateId, sceneDescription, options);
        return result;
      } catch (err) {
        const errorMessage = err.message || '应用模板失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 获取推荐的模板
   */
  const getRecommendedTemplates = useCallback(
    async (prompt) => {
      if (!prompt) {
        return { success: true, recommendations: [] };
      }

      try {
        const recommendations = PromptTemplateManager.getRecommendedTemplates(prompt);
        return { success: true, recommendations };
      } catch (err) {
        const errorMessage = err.message || '获取推荐模板失败';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 重置搜索
   */
  const resetSearch = useCallback(() => {
    setSearchKeyword('');
    setFilteredTemplates(templates);
  }, [templates]);

  /**
   * 重置到默认模板
   */
  const resetToDefault = useCallback(() => {
    setSelectedTemplateId(defaultTemplate);
    setSearchKeyword('');
    setFilteredTemplates(templates);
  }, [defaultTemplate, templates]);

  // 自动加载模板
  useEffect(() => {
    let mounted = true;

    if (autoLoad) {
      loadTemplates();
    }

    return () => {
      mounted = false;
    };
  }, [autoLoad, loadTemplates]);

  // 当选择的模板ID变化时，更新选中的模板
  useEffect(() => {
    if (selectedTemplateId) {
      const template = PromptTemplateManager.getTemplateById(selectedTemplateId);
      setSelectedTemplate(template);
    }
  }, [selectedTemplateId]);

  return {
    // 状态
    templates,
    selectedTemplateId,
    selectedTemplate,
    searchKeyword,
    filteredTemplates,
    isLoading,
    error,

    // 方法
    loadTemplates,
    selectTemplate,
    searchTemplates,
    applyTemplate,
    getRecommendedTemplates,
    resetSearch,
    resetToDefault,

    // 便捷属性
    hasTemplates: templates.length > 0,
    templatesCount: templates.length,
  };
}

export default usePromptTemplates;
