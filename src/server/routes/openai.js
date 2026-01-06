/**
 * OpenAI API 路由
 * 处理提示词优化相关请求
 */

const express = require('express');
const router = express.Router();
const OpenAIClient = require('../services/openaiClient');

/**
 * POST /api/openai/optimize
 * 优化绘本旁白提示词
 */
router.post('/optimize', async (req, res) => {
  try {
    const {
      base_url,
      api_key,
      model,
      prompt,
      style = 'picture-book',
      customStyleDescription,
      context = {}
    } = req.body;

    // 验证必填参数
    if (!base_url || !api_key || !model) {
      return res.json({
        success: false,
        error: '缺少必要的 API 配置参数 (base_url, api_key, model)'
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.json({
        success: false,
        error: '请输入要优化的提示词'
      });
    }

    // 验证自定义风格必须提供描述
    if (style === 'custom') {
      if (!customStyleDescription || !customStyleDescription.trim()) {
        return res.json({
          success: false,
          error: '自定义风格必须提供风格描述（customStyleDescription 参数）'
        });
      }
    }

    // 创建客户端实例
    const client = new OpenAIClient(base_url, api_key, model);

    // 调用优化接口
    const result = await client.optimizePrompt({
      prompt,
      style,
      customStyleDescription,
      context
    });

    res.json(result);
  } catch (error) {
    console.error('[/api/openai/optimize] 服务器错误:', error);
    res.json({
      success: false,
      error: `服务器错误: ${error.message}`
    });
  }
});

/**
 * POST /api/openai/test
 * 测试 API 连接
 */
router.post('/test', async (req, res) => {
  try {
    const { base_url, api_key, model } = req.body;

    // 验证必填参数
    if (!base_url || !api_key || !model) {
      return res.json({
        success: false,
        error: '缺少必要的 API 配置参数'
      });
    }

    // 创建客户端实例
    const client = new OpenAIClient(base_url, api_key, model);

    // 测试连接
    const result = await client.testConnection();

    res.json(result);
  } catch (error) {
    console.error('[/api/openai/test] 服务器错误:', error);
    res.json({
      success: false,
      error: `服务器错误: ${error.message}`
    });
  }
});

module.exports = router;
