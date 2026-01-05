/**
 * 提示词评估引擎
 *
 * 基于 OpenAI 官方 Sora 2 Prompting Guide 的评估规则
 * https://cookbook.openai.com/examples/sora/sora2_prompting_guide
 */

import { EVALUATION_DIMENSIONS, getGrade, GRADE_THRESHOLDS } from './constants.js';

/**
 * 提示词评估器
 */
export class PromptEvaluator {
  /**
   * 评估提示词质量
   *
   * @param {string} prompt - 待评估的提示词
   * @param {string} mode - 生成模式（'text-to-video' | 'image-to-video' | 'storyboard'）
   * @param {object} context - 上下文信息（如 images, characters 等）
   * @returns {object} 评估结果
   */
  static evaluate(prompt, mode = 'text-to-video', context = {}) {
    if (!prompt || typeof prompt !== 'string') {
      return {
        success: false,
        error: '提示词不能为空',
      };
    }

    // 确定适用的评估维度
    const applicableDimensions = this._getApplicableDimensions(mode);

    // 执行评估
    const evaluationResult = this._executeEvaluation(prompt, applicableDimensions, context);

    // 计算最终评分
    const finalScore = Math.round(
      (evaluationResult.totalScore / evaluationResult.totalWeight) * 100
    );

    // 获取等级
    const gradeInfo = getGrade(finalScore);

    // 生成总结
    const summary = this._generateSummary(finalScore, evaluationResult.dimensionScores);

    return {
      success: true,
      score: finalScore,
      grade: gradeInfo.grade,
      gradeLabel: gradeInfo.label,
      gradeColor: gradeInfo.color,
      gradeBgColor: gradeInfo.bgColor,
      dimensions: evaluationResult.dimensionScores,
      suggestions: evaluationResult.suggestions,
      summary,
      promptLength: prompt.length,
      wordCount: prompt.split(/\s+/).length,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * 批量评估多个提示词
   */
  static evaluateBatch(prompts, mode = 'text-to-video', context = {}) {
    if (!Array.isArray(prompts)) {
      return {
        success: false,
        error: '提示词必须是数组',
      };
    }

    const results = prompts.map((prompt, index) => ({
      index,
      prompt,
      ...this.evaluate(prompt, mode, context),
    }));

    // 计算平均分
    const validResults = results.filter((r) => r.success);
    const averageScore =
      validResults.length > 0
        ? Math.round(validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length)
        : 0;

    return {
      success: true,
      results,
      averageScore,
      totalCount: prompts.length,
      validCount: validResults.length,
    };
  }

  /**
   * 比较两个提示词的质量
   */
  static compare(prompt1, prompt2, mode = 'text-to-video', context = {}) {
    const evaluation1 = this.evaluate(prompt1, mode, context);
    const evaluation2 = this.evaluate(prompt2, mode, context);

    if (!evaluation1.success || !evaluation2.success) {
      return {
        success: false,
        error: '评估失败',
      };
    }

    const scoreDiff = evaluation2.score - evaluation1.score;

    return {
      success: true,
      winner: scoreDiff > 0 ? 'prompt2' : scoreDiff < 0 ? 'prompt1' : 'tie',
      scoreDiff,
      prompt1: evaluation1,
      prompt2: evaluation2,
      recommendation:
        scoreDiff > 10
          ? '提示词2 明显优于 提示词1'
          : scoreDiff > 5
          ? '提示词2 优于 提示词1'
          : scoreDiff > -5
          ? '两个提示词质量相当'
          : scoreDiff > -10
          ? '提示词1 优于 提示词2'
          : '提示词1 明显优于 提示词2',
    };
  }

  /**
   * 获取改进建议
   */
  static getSuggestions(evaluationResult) {
    if (!evaluationResult || !evaluationResult.suggestions) {
      return [];
    }

    // 按优先级排序
    return evaluationResult.suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 应用建议到提示词（一键优化）
   */
  static applySuggestion(prompt, suggestionType) {
    const suggestions = {
      add_camera_direction: (p) =>
        p + '\n\nCinematography:\nCamera shot: medium shot, eye level\nMood: cinematic',
      add_action_description: (p) => p + '\n\nActions:\n- Character moves slightly\n- Pauses and looks around',
      add_lighting: (p) => p.replace(/\n\nCinematography:.*/s, ''),
      add_visual_details: (p) => {
        // 在开头添加视觉细节
        const colors = ['red', 'blue', 'green', 'warm', 'cool'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        return `A ${randomColor} toned scene. ${p}`;
      },
      describe_reference_image: (p) => {
        if (p.startsWith('@')) {
          return 'Detailed scene description with characters, environment, and atmosphere. ' + p;
        }
        return p;
      },
    };

    const applyFunction = suggestions[suggestionType];
    if (applyFunction) {
      return applyFunction(prompt);
    }

    return prompt;
  }

  /**
   * 获取适用的评估维度
   */
  static _getApplicableDimensions(mode) {
    const dimensions = [];

    // 通用维度
    dimensions.push('clarity', 'cinematography', 'actions', 'lighting');

    // 图生视频特定维度
    if (mode === 'image-to-video') {
      dimensions.push('imageReference');
    }

    return dimensions;
  }

  /**
   * 执行评估
   */
  static _executeEvaluation(prompt, applicableDimensions, context) {
    let totalScore = 0;
    let totalWeight = 0;
    const dimensionScores = [];
    const suggestions = [];

    for (const dimKey of applicableDimensions) {
      const dimension = EVALUATION_DIMENSIONS[dimKey];

      // 跳过不适用的维度
      if (dimension.appliesTo && dimension.appliesTo !== context.mode) {
        continue;
      }

      let dimScore = 0;
      let dimWeight = dimension.weight;

      // 执行该维度的所有检查
      for (const check of dimension.checks) {
        const result = check.check(prompt, context);
        dimScore += result.score;

        // 如果检查未通过，添加到建议列表
        if (!result.passed) {
          suggestions.push({
            type: check.id,
            dimension: dimKey,
            dimensionName: dimension.name,
            priority: result.severity === 'error' ? 'high' : result.severity === 'warning' ? 'medium' : 'low',
            text: result.message,
            applyAction: () => this.applySuggestion(prompt, check.id),
          });
        }
      }

      dimensionScores.push({
        id: dimKey,
        name: dimension.name,
        nameEn: dimension.nameEn,
        score: dimScore,
        weight: dimWeight,
        percentage: Math.round((dimScore / dimWeight) * 100),
      });

      totalScore += dimScore;
      totalWeight += dimWeight;
    }

    return {
      totalScore,
      totalWeight,
      dimensionScores,
      suggestions,
    };
  }

  /**
   * 生成评估总结
   */
  static _generateSummary(finalScore, dimensionScores) {
    const summaries = {
      excellent: '优秀的提示词！包含丰富的视觉细节、摄影指导和动作描述。',
      good: '良好的提示词。建议添加更多摄影和灯光细节以提升质量。',
      pass: '及格的提示词。建议补充具体的视觉元素和动作描述。',
      poor: '提示词需要改进。建议添加更多细节描述、镜头指导和动作说明。',
    };

    let summary;
    if (finalScore >= GRADE_THRESHOLDS.EXCELLENT) {
      summary = summaries.excellent;
    } else if (finalScore >= GRADE_THRESHOLDS.GOOD) {
      summary = summaries.good;
    } else if (finalScore >= GRADE_THRESHOLDS.PASS) {
      summary = summaries.pass;
    } else {
      summary = summaries.poor;
    }

    // 添加维度特定建议
    const weakDimensions = dimensionScores.filter((d) => d.percentage < 60);
    if (weakDimensions.length > 0) {
      const weakNames = weakDimensions.map((d) => d.name).join('、');
      summary += `\n\n需要加强：${weakNames}`;
    }

    return summary;
  }
}

/**
 * 快捷方法：评估提示词
 */
export function evaluatePrompt(prompt, mode, context) {
  return PromptEvaluator.evaluate(prompt, mode, context);
}

/**
 * 快捷方法：获取建议
 */
export function getSuggestions(evaluationResult) {
  return PromptEvaluator.getSuggestions(evaluationResult);
}

/**
 * 快捷方法：应用建议
 */
export function applySuggestion(prompt, suggestionType) {
  return PromptEvaluator.applySuggestion(prompt, suggestionType);
}

export default PromptEvaluator;
