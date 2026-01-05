/**
 * 提示词模板库
 *
 * 管理官方风格模板和自定义模板
 * 基于官方 OpenAI Sora 2 Prompting Guide
 */

import { OFFICIAL_STYLE_TEMPLATES } from './constants.js';

/**
 * 提示词模板管理器
 */
export class PromptTemplateManager {
  /**
   * 获取所有可用模板
   */
  static getAllTemplates() {
    return OFFICIAL_STYLE_TEMPLATES;
  }

  /**
   * 根据模板ID获取模板
   */
  static getTemplateById(templateId) {
    return OFFICIAL_STYLE_TEMPLATES[templateId] || null;
  }

  /**
   * 根据关键词搜索模板
   */
  static searchTemplates(keyword) {
    if (!keyword) return [];

    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    for (const [id, template] of Object.entries(OFFICIAL_STYLE_TEMPLATES)) {
      // 搜索范围：模板ID、名称、描述、关键词
      if (
        id.includes(lowerKeyword) ||
        template.name.toLowerCase().includes(lowerKeyword) ||
        template.nameEn.toLowerCase().includes(lowerKeyword) ||
        template.description.toLowerCase().includes(lowerKeyword) ||
        template.keywords.some((kw) => kw.toLowerCase().includes(lowerKeyword))
      ) {
        results.push({ id, ...template });
      }
    }

    return results;
  }

  /**
   * 获取推荐的模板（基于提示词内容）
   */
  static getRecommendedTemplates(prompt) {
    if (!prompt) return [];

    const lowerPrompt = prompt.toLowerCase();
    const recommendations = [];

    // 根据提示词中的关键词匹配推荐模板
    for (const [id, template] of Object.entries(OFFICIAL_STYLE_TEMPLATES)) {
      let relevanceScore = 0;

      // 检查关键词匹配度
      template.keywords.forEach((keyword) => {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          relevanceScore += 1;
        }
      });

      if (relevanceScore > 0) {
        recommendations.push({ id, ...template, relevanceScore });
      }
    }

    // 按相关性排序
    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * 应用模板到提示词
   */
  static applyTemplate(templateId, sceneDescription, options = {}) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return {
        success: false,
        error: `模板 ${templateId} 不存在`,
      };
    }

    const {
      cameraShot = 'medium shot, eye level',
      mood = 'cinematic',
      actions = [],
      dialogue = '',
      backgroundSound = '',
      includeCinematography = true,
    } = options;

    // 构建提示词
    let prompt = template.template.replace('[场景描述]', sceneDescription);

    // 如果模板不包含 Cinematography 部分，且需要添加
    if (includeCinematography && !prompt.toLowerCase().includes('cinematography')) {
      prompt += '\n\nCinematography:\n';
      prompt += `Camera shot: ${cameraShot}\n`;
      prompt += `Mood: ${mood}`;
    }

    // 添加 Actions
    if (actions && actions.length > 0) {
      prompt += '\n\nActions:\n';
      actions.forEach((action) => {
        prompt += `- ${action}\n`;
      });
    }

    // 添加 Dialogue
    if (dialogue) {
      prompt += `\n\nDialogue:\n${dialogue}`;
    }

    // 添加 Background Sound
    if (backgroundSound) {
      prompt += `\n\nBackground Sound:\n${backgroundSound}`;
    }

    return {
      success: true,
      prompt: prompt.trim(),
      appliedTemplate: template.name,
    };
  }

  /**
   * 生成示例提示词（基于模板）
   */
  static generateExamplePrompt(templateId) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return null;
    }

    return template.example;
  }

  /**
   * 获取模板列表（用于下拉选择）
   */
  static getTemplateList() {
    return Object.entries(OFFICIAL_STYLE_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      nameEn: template.nameEn,
      description: template.description,
    }));
  }
}

/**
 * 快捷方法：应用默认模板
 */
export function applyDefaultTemplate(sceneDescription, options = {}) {
  return PromptTemplateManager.applyTemplate('documentary', sceneDescription, options);
}

/**
 * 快捷方法：获取所有模板列表
 */
export function getAllTemplates() {
  return PromptTemplateManager.getAllTemplates();
}

/**
 * 快捷方法：搜索模板
 */
export function searchTemplates(keyword) {
  return PromptTemplateManager.searchTemplates(keyword);
}

export default PromptTemplateManager;
