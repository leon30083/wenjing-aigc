/**
 * 提示词构建器
 *
 * 核心功能：
 * 1. 自动生成提示词（基于官方结构）
 * 2. 质量评估
 * 3. 智能补全
 *
 * 基于 OpenAI 官方 Sora 2 Prompting Guide
 * https://cookbook.openai.com/examples/sora/sora2_prompting_guide
 */

import { PromptTemplateManager } from './promptTemplates.js';
import { PromptEvaluator } from './promptEvaluator.js';
import { OFFICIAL_STYLE_TEMPLATES, DEFAULT_CONFIG, GENERATION_MODES, analyzePromptStructure } from './constants.js';

/**
 * 提示词构建器
 */
export class PromptBuilder {
  /**
   * 自动生成提示词
   *
   * @param {object} options - 生成选项
   * @param {string} options.mode - 生成模式（'text-to-video' | 'image-to-video' | 'storyboard'）
   * @param {string} options.templateId - 风格模板ID（默认：'documentary'）
   * @param {string} options.sceneDescription - 场景描述
   * @param {Array} options.characters - 角色列表
   * @param {Array} options.images - 参考图片列表
   * @param {object} options.variables - 其他变量
   * @returns {object} 生成结果
   */
  static generate(options) {
    const {
      mode = GENERATION_MODES.TEXT_TO_VIDEO,
      templateId = DEFAULT_CONFIG.defaultTemplate,
      sceneDescription,
      characters = [],
      images = [],
      variables = {},
    } = options;

    // 验证场景描述
    if (!sceneDescription || typeof sceneDescription !== 'string') {
      return {
        success: false,
        error: '场景描述不能为空',
      };
    }

    // 选择风格模板
    const template = OFFICIAL_STYLE_TEMPLATES[templateId] || OFFICIAL_STYLE_TEMPLATES.documentary;

    // 准备生成参数
    const generateOptions = {
      cameraShot: variables.cameraShot || DEFAULT_CONFIG.defaultCameraShot,
      mood: variables.mood || DEFAULT_CONFIG.defaultMood,
      actions: variables.actions || this._generateDefaultActions(),
      dialogue: variables.dialogue || '',
      backgroundSound: variables.backgroundSound || '',
      includeCinematography: variables.cinematography !== false,
    };

    // 应用模板生成基础提示词
    const applyResult = PromptTemplateManager.applyTemplate(templateId, sceneDescription, generateOptions);

    if (!applyResult.success) {
      return {
        success: false,
        error: applyResult.error,
      };
    }

    let prompt = applyResult.prompt;

    // 插入角色引用
    const insertedCharacters = this._insertCharacterReferences(prompt, characters);
    if (insertedCharacters.characters.length > 0) {
      prompt = insertedCharacters.prompt;
    }

    // 图生视频模式：检查是否描述了参考图片
    if (mode === GENERATION_MODES.IMAGE_TO_VIDEO && images.length > 0) {
      const imageCheck = this._checkImageDescription(prompt);
      if (!imageCheck.passed) {
        return {
          success: false,
          error: '图生视频必须描述参考图片内容',
          details: imageCheck.message,
          prompt, // 返回生成的提示词供用户参考
        };
      }
    }

    // 分析提示词结构
    const structure = analyzePromptStructure(prompt);

    return {
      success: true,
      prompt,
      appliedTemplate: template.name,
      insertedCharacters: insertedCharacters.characters,
      structure,
      mode,
      metadata: {
        templateId,
        characterCount: insertedCharacters.characters.length,
        imageCount: images.length,
        promptLength: prompt.length,
      },
    };
  }

  /**
   * 质量评估
   */
  static evaluate(prompt, mode = GENERATION_MODES.TEXT_TO_VIDEO, context = {}) {
    return PromptEvaluator.evaluate(prompt, mode, context);
  }

  /**
   * 智能补全（基于用户输入的部分提示词）
   */
  static autoComplete(partialPrompt, options = {}) {
    if (!partialPrompt || typeof partialPrompt !== 'string') {
      return {
        success: false,
        error: '提示词不能为空',
      };
    }

    const {
      mode = GENERATION_MODES.TEXT_TO_VIDEO,
      characters = [],
      images = [],
      templateId = null,
    } = options;

    // 分析现有提示词
    const structure = analyzePromptStructure(partialPrompt);
    const result = {
      success: true,
      originalPrompt: partialPrompt,
      completedPrompt: partialPrompt,
      additions: [],
    };

    // 检查并添加缺失的部分
    if (!structure.hasProseDescription) {
      // 如果没有场景描述，添加默认描述
      const defaultDescription = this._generateSceneDescription(options);
      result.completedPrompt = defaultDescription + '\n\n' + result.completedPrompt;
      result.additions.push({ type: 'scene', content: defaultDescription });
    }

    if (!structure.hasCinematography && partialPrompt.length < 200) {
      // 如果提示词较短且没有摄影指导，添加
      const cinematography = `\n\nCinematography:\nCamera shot: ${DEFAULT_CONFIG.defaultCameraShot}\nMood: ${DEFAULT_CONFIG.defaultMood}`;
      result.completedPrompt += cinematography;
      result.additions.push({ type: 'cinematography', content: cinematography });
    }

    if (!structure.hasActions && partialPrompt.length < 200) {
      // 如果提示词较短且没有动作描述，添加
      const defaultActions = this._generateDefaultActions();
      const actionsText = '\n\nActions:\n' + defaultActions.map((a) => `- ${a}`).join('\n');
      result.completedPrompt += actionsText;
      result.additions.push({ type: 'actions', content: actionsText });
    }

    // 插入角色引用（如果有）
    if (characters.length > 0) {
      const inserted = this._insertCharacterReferences(result.completedPrompt, characters);
      if (inserted.characters.length > 0) {
        result.completedPrompt = inserted.prompt;
        result.additions.push({
          type: 'characters',
          content: inserted.characters.map((c) => c.username || c.alias).join(', '),
        });
      }
    }

    // 如果指定了模板，应用模板
    if (templateId) {
      const template = OFFICIAL_STYLE_TEMPLATES[templateId];
      if (template) {
        result.completedPrompt = template.template.replace('[场景描述]', result.completedPrompt);
        result.additions.push({ type: 'template', content: template.name });
      }
    }

    return result;
  }

  /**
   * 提取并优化提示词中的关键信息
   */
  static extractKeyElements(prompt) {
    const elements = {
      scene: null,
      characters: [],
      actions: [],
      cinematography: null,
      mood: null,
      lighting: [],
    };

    // 提取场景描述（Cinematography 之前的部分）
    const proseMatch = prompt.match(/^([\s\S]*?)(?=\n\nCinematography:|$)/i);
    if (proseMatch) {
      elements.scene = proseMatch[1].trim();
    }

    // 提取 Cinematography
    const cinematographyMatch = prompt.match(/Cinematography:\s*([\s\S]*?)(?=\n\nActions:|$)/i);
    if (cinematographyMatch) {
      const cinematographyText = cinematographyMatch[1];
      const cameraShotMatch = cinematographyText.match(/Camera shot:\s*(.+)$/im);
      if (cameraShotMatch) {
        elements.cinematography = cameraShotMatch[1].trim();
      }
      const moodMatch = cinematographyText.match(/Mood:\s*(.+)$/im);
      if (moodMatch) {
        elements.mood = moodMatch[1].trim();
      }
    }

    // 提取 Actions
    const actionsMatch = prompt.match(/Actions:\s*([\s\S]*?)(?=\n\nDialogue:|\n\nBackground Sound:|$)/i);
    if (actionsMatch) {
      const actionsText = actionsMatch[1];
      const actionLines = actionsText.split('\n').filter((line) => line.trim().startsWith('-'));
      elements.actions = actionLines.map((line) => line.replace(/^-\s*/, '').trim());
    }

    // 提取角色引用
    const characterRegex = /@([a-zA-Z0-9_.]+)/g;
    let match;
    while ((match = characterRegex.exec(prompt)) !== null) {
      elements.characters.push(match[1]);
    }

    // 提取灯光关键词
    const lightingKeywords = [
      'natural light',
      'sunlight',
      'golden hour',
      'soft light',
      'hard light',
      'warm',
      'cool',
      'amber',
      'teal',
    ];
    lightingKeywords.forEach((keyword) => {
      if (prompt.toLowerCase().includes(keyword)) {
        elements.lighting.push(keyword);
      }
    });

    return elements;
  }

  /**
   * 生成场景描述（基于用户输入的变量）
   */
  static _generateSceneDescription(options = {}) {
    const {
      subject = 'a character',
      environment = 'in a room',
      weather = 'with soft lighting',
      timeOfDay = 'during the day',
    } = options;

    return `${subject} ${environment}, ${timeOfDay}, ${weather}.`;
  }

  /**
   * 生成默认动作
   */
  static _generateDefaultActions() {
    return [
      'Character slowly turns to look at the camera',
      'Pauses briefly, then continues their activity',
    ];
  }

  /**
   * 智能插入角色引用到提示词
   */
  static _insertCharacterReferences(prompt, characters) {
    if (!characters || characters.length === 0) {
      return { prompt, characters: [] };
    }

    let updatedPrompt = prompt;
    const insertedCharacters = [];

    // 智能插入：在场景描述之后插入
    const proseEndMatch = prompt.match(/^([\s\S]*?)(?=\n\nCinematography:|$)/i);
    if (proseEndMatch) {
      const proseEnd = proseEndMatch.index + proseEndMatch[1].length;

      // 为每个角色添加引用
      const characterRefs = characters.map((char) => {
        insertedCharacters.push(char);
        return `@${char.username}`;
      });

      // 插入到场景描述之后
      const insertPosition = proseEnd;
      const refsText = '，' + characterRefs.join(' 和 ') + ' ';
      updatedPrompt =
        prompt.substring(0, insertPosition) + refsText + prompt.substring(insertPosition);
    } else {
      // 如果找不到合适位置，在开头添加
      const characterRefs = characters.map((char) => {
        insertedCharacters.push(char);
        return `@${char.username}`;
      });
      updatedPrompt = characterRefs.join(' 和 ') + ' ' + prompt;
    }

    return {
      prompt: updatedPrompt,
      characters: insertedCharacters,
    };
  }

  /**
   * 检查图生视频模式是否描述了参考图片
   */
  static _checkImageDescription(prompt) {
    // 检查提示词长度（描述图片通常需要至少20个字符）
    const hasDescription = /[\u4e00-\u9fa5a-zA-Z]{20,}/.test(prompt.split('@')[0] || prompt);

    return {
      passed: hasDescription,
      message: hasDescription
        ? '已描述参考图片内容'
        : '图生视频必须描述参考图片！建议先描述图片中的主体、外观、环境、氛围',
    };
  }

  /**
   * 批量生成提示词
   */
  static generateBatch(scenes, options = {}) {
    if (!Array.isArray(scenes)) {
      return {
        success: false,
        error: '场景必须是数组',
      };
    }

    const results = [];
    const errors = [];

    scenes.forEach((scene, index) => {
      const result = this.generate({
        ...options,
        sceneDescription: scene,
      });

      if (result.success) {
        results.push({
          index,
          scene,
          ...result,
        });
      } else {
        errors.push({
          index,
          scene,
          error: result.error,
        });
      }
    });

    return {
      success: true,
      results,
      errors,
      totalScenes: scenes.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }
}

/**
 * 快捷方法：生成提示词
 */
export function generatePrompt(options) {
  return PromptBuilder.generate(options);
}

/**
 * 快捷方法：评估提示词
 */
export function evaluatePrompt(prompt, mode, context) {
  return PromptBuilder.evaluate(prompt, mode, context);
}

/**
 * 快捷方法：智能补全
 */
export function autoCompletePrompt(partialPrompt, options) {
  return PromptBuilder.autoComplete(partialPrompt, options);
}

export default PromptBuilder;
