/**
 * OpenAI Client
 * 支持OpenAI格式的API调用（DeepSeek、GLM等）
 */

const axios = require('axios');

class OpenAIClient {
  /**
   * @param {string} baseUrl - API base URL (e.g., https://api.deepseek.com)
   * @param {string} apiKey - API key
   * @param {string} model - Model name (e.g., deepseek-chat)
   */
  constructor(baseUrl, apiKey, model) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除尾部斜杠
    this.apiKey = apiKey;
    this.model = model;
    this.client = axios.create({
      timeout: 30000, // 30秒超时
    });
  }

  /**
   * 优化绘本旁白提示词
   * @param {Object} options - 优化选项
   * @param {string} options.prompt - 简单描述
   * @param {string} options.style - 风格 (picture-book, documentary, animation, etc.)
   * @param {Object} options.context - 上下文信息
   * @returns {Promise<Object>} 优化结果
   */
  async optimizePrompt(options) {
    const { prompt, style = 'picture-book', context = {} } = options;

    try {
      console.log('[OpenAIClient] 开始优化提示词:', { prompt, style, context });

      // 构建系统提示词
      const systemPrompt = this._buildSystemPrompt(style, context);

      // 构建用户提示词
      const userPrompt = this._buildUserPrompt(prompt, style, context);

      // 调用 API
      const response = await this.client.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;

      console.log('[OpenAIClient] 优化成功:', result.substring(0, 100) + '...');

      return {
        success: true,
        data: {
          optimized_prompt: result,
          meta: {
            model_used: this.model,
            style: style,
            tokens_used: response.data.usage?.total_tokens || 0
          }
        }
      };
    } catch (error) {
      console.error('[OpenAIClient] 优化失败:', error.message);

      // 返回详细错误信息
      const errorMessage = this._parseErrorMessage(error);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 测试 API 连接
   * @returns {Promise<Object>} 测试结果
   */
  async testConnection() {
    try {
      console.log('[OpenAIClient] 测试连接...', {
        baseUrl: this.baseUrl,
        model: this.model
      });

      const response = await this.client.post(
        `${this.baseUrl}/v1/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: '你好，请回复"连接成功"'
            }
          ],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.choices[0].message.content;

      console.log('[OpenAIClient] 连接测试成功:', result);

      return {
        success: true,
        data: {
          message: result,
          model: this.model
        }
      };
    } catch (error) {
      console.error('[OpenAIClient] 连接测试失败:', error.message);

      return {
        success: false,
        error: this._parseErrorMessage(error)
      };
    }
  }

  /**
   * 构建系统提示词
   * @private
   */
  _buildSystemPrompt(style, context) {
    if (style === 'picture-book') {
      return `你是专业的动画绘本提示词专家。

任务：将简单的绘本旁白优化成 Sora 2 视频生成提示词。

三层扩展模型：
1. Layer 1 (核心层 30%)：保持旁白的核心动作，不偏离故事主线
2. Layer 2 (丰富层 40%)：添加视觉细节、环境、氛围
3. Layer 3 (动态层 30%)：留出 AI 自然发挥空间，不要写死每个瞬间

绘本风格要求：
- ✅ 拟人化角色设计（大眼睛、表情、友好姿态）
- ✅ 鲜艳明亮的色彩（非写实、柔和）
- ✅ 简化的环境（适合儿童理解）
- ✅ 温暖友好的氛围
- ✅ 旁白感（暗示有配音、互动性）

避免：
- ❌ 改变故事核心动作
- ❌ 添加无关情节
- ❌ 过于写实（保持卡通感）
- ❌ 复杂或暴力的动作

输出格式：
卡通风格的绘本动画。

角色设计：[拟人化描述]

场景：[简化环境 + 色彩]

核心动作：[旁白中的关键动作]

细节与氛围：
- [3-5 个视觉细节]
- [光影、色彩描述]

Cinematography:
- [镜头类型]
- [视角高度]

Animation style:
- [运动风格描述]

视频时长：${context.target_duration || 10}秒`;
    }

    // 可以添加更多风格...
    return `你是视频提示词优化专家，请将简单描述优化成详细的 Sora 2 提示词。`;
  }

  /**
   * 构建用户提示词
   * @private
   */
  _buildUserPrompt(prompt, style, context) {
    return `请将以下绘本旁白优化成 Sora 2 视频生成提示词：

旁白原文：${prompt}

要求：
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. 使用绘本/卡通风格
4. 包含摄影指导和动画风格描述
5. 适合${context.target_duration || 10}秒视频时长

请直接输出优化后的提示词，不要解释。`;
  }

  /**
   * 解析错误信息
   * @private
   */
  _parseErrorMessage(error) {
    if (error.response) {
      // API 返回了错误
      const { status, data } = error.response;
      return `API 错误 (${status}): ${data?.error?.message || JSON.stringify(data)}`;
    } else if (error.request) {
      // 请求发送了但没有收到响应
      return '网络错误：无法连接到 API 服务器';
    } else {
      // 其他错误
      return `错误: ${error.message}`;
    }
  }
}

module.exports = OpenAIClient;
