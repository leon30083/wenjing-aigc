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
   * @param {string} options.customStyleDescription - 自定义风格描述
   * @param {string} options.optimizationDirection - 优化方向（更详细、更简洁、更生动、更专业等）⭐ 新增
   * @param {Object} options.context - 上下文信息
   * @returns {Promise<Object>} 优化结果
   */
  async optimizePrompt(options) {
    const {
      prompt,
      style = 'picture-book',
      customStyleDescription,
      optimizationDirection, // ⭐ 新增：优化方向
      context = {}
    } = options;

    try {
      console.log('[OpenAIClient] 开始优化提示词:', {
        prompt,
        style,
        customStyleDescription,
        optimizationDirection, // ⭐ 新增
        context
      });

      // ⭐ 获取优化方向指令
      const directionInstruction = this._getDirectionInstruction(optimizationDirection);

      // 构建系统提示词（包含优化方向）
      const systemPrompt = this._buildSystemPrompt(style, context, customStyleDescription, directionInstruction);

      // 构建用户提示词（包含优化方向）
      const userPrompt = this._buildUserPrompt(prompt, style, context, customStyleDescription, directionInstruction);

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
  _buildSystemPrompt(style, context, customStyleDescription, directionInstruction) {
    // ⭐ 新增：优化方向指令（如果有）
    const directionText = directionInstruction ? `\n\n优化方向要求：\n${directionInstruction}` : '';

    // ⭐ 构建角色映射（在系统提示词中，强调对应关系）
    let characterMappingInSystem = '';
    if (context.characters && context.characters.length > 0) {
      const characterList = context.characters.map(c => {
        const alias = c.alias || c.username;
        return `  - @${c.username} = ${alias}`;
      }).join('\n');

      characterMappingInSystem = `\n\n角色映射（必须使用左侧 @username，不能使用右侧别名）：
${characterList}

⚠️ 关键规则：
- 输出时必须使用 @${context.characters.map(c => c.username).join('、@')}
- 不能将 @username 替换为别名或其他 ID
- 不能描述角色外观（Sora2会使用角色真实外观）`;
    }

    if (style === 'picture-book') {
      return `你是专业的动画绘本提示词专家。

任务：将简单的绘本旁白优化成 Sora 2 视频生成提示词。${directionText}${characterMappingInSystem}

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
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"卡通绘本风格的视频。一只拟人化的卡通猫咪在阳光明媚的花园里欢快地追逐蝴蝶，跳跃着探索每一处角落。画面色彩明亮饱和，充满童趣，动作夸张且富有弹性，背景细节丰富，光影效果梦幻，适合10秒的视频时长。"

❌ 禁止的格式：
- 不要使用"角色设计："、"场景："、"动画风格："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息（风格、角色、场景、氛围、动画、时长）`;
    }

    if (style === 'cinematic') {
      return `你是专业的电影风格视频提示词专家。

任务：将简单描述优化成 Sora 2 视频生成提示词。${directionText}${characterMappingInSystem}

电影风格要求：
- ✅ 电影级画质（高分辨率、细节丰富）
- ✅ 专业摄影构图（黄金分割、引导线）
- ✅ 戏剧性光影（高对比度、明暗对比）
- ✅ 电影感色调（根据场景情绪调整）
- ✅ 流畅的镜头运动（推拉摇移跟）

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"电影风格的视频。夕阳西下的城市街道，主角孤独地走在人行道上。画面采用广角镜头拍摄，浅景深突出主体，温暖的黄金时刻光线从侧面照射，营造出怀旧而忧伤的氛围。色彩倾向为暖色调，情绪氛围温馨而略带忧郁，适合10秒的视频时长。"

❌ 禁止的格式：
- 不要使用"场景描述："、"摄影风格："、"氛围："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息（风格、场景、摄影、氛围、时长）`;
    }

    if (style === 'documentary') {
      return `你是专业的纪录片风格视频提示词专家。

任务：将简单描述优化成 Sora 2 视频生成提示词。${directionText}${characterMappingInSystem}

纪录片风格要求：
- ✅ 写实风格（真实感、自然感）
- ✅ 观察者视角（不干预、客观记录）
- ✅ 自然光线（避免过度修饰）
- ✅ 真实环境（不过度美化）
- ✅ 纪实性叙事（信息传达优先）

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"纪录片风格的视频。一个工人在建筑工地上操作装载机，真实记录日常工作场景。采用旁观者视角，自然光线照射，构图平衡稳重，展现劳动者的工作状态和工地环境，适合10秒的视频时长。"

❌ 禁止的格式：
- 不要使用"场景记录："、"拍摄风格："、"信息传达："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息（风格、场景、拍摄、信息、时长）`;
    }

    if (style === 'animation') {
      return `你是专业的动画风格视频提示词专家。

任务：将简单描述优化成 Sora 2 视频生成提示词。${directionText}${characterMappingInSystem}

动画风格要求：
- ✅ 流畅的动作（夸张、弹性）
- ✅ 鲜明的角色设计（独特外观、表情丰富）
- ✅ 丰富的环境细节（背景、道具）
- ✅ 适合动画的色彩（饱和、明快）
- ✅ 节奏感（动作与音乐配合）

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"动画风格的视频。一只卡通风格的猫咪在阳光明媚的花园里欢快地追逐蝴蝶，跳跃着探索每一处角落。画面色彩明亮饱和，动作夸张且富有弹性，背景细节丰富，光影效果梦幻，适合15秒的视频时长。"

❌ 禁止的格式：
- 不要使用"角色设计："、"场景："、"动画风格："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息（风格、角色、场景、动画、时长）`;
    }

    // 自定义风格：在系统提示词中包含风格描述
    const styleText = customStyleDescription || '自定义风格';
    return `你是视频提示词优化专家。

任务：将简单描述优化成 Sora 2 视频生成提示词。${directionText}${characterMappingInSystem}

**核心风格要求：必须使用 ${styleText} 风格！**

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述（使用 ${styleText} 风格），以流畅的自然语言描述场景，包含所有必要信息（风格、场景、色彩、氛围、摄影、时长）。

❌ 禁止的格式：
- 不要使用"场景描述："、"视觉风格："、"摄影指导："等标题
- 不要使用项目符号（- 或 •）
- 不要使用分段或换行
- 不要使用列表格式

✅ 正确的格式：
- 单一段落
- 流畅的自然语言
- 包含所有必要信息`;
  }

  /**
   * 构建用户提示词
   * @private
   */
  _buildUserPrompt(prompt, style, context, customStyleDescription, directionInstruction) {
    let characterContext = '';
    let characterMapping = '';
    let characterInstruction = '';

    // 添加角色上下文
    if (context.characters && context.characters.length > 0) {
      const characterList = context.characters.map(c => {
        const alias = c.alias || c.username;
        return `  - @${c.username} (${alias})`;
      }).join('\n');

      characterMapping = `\n\n可用角色列表（必须使用 @username 格式引用）：\n${characterList}`;

      characterContext = `\n\n重要：当提示词需要描述角色时，必须使用 @username 格式引用角色（注意：username 后面必须加空格，如 @username 在...），不要直接描述角色的外貌特征。`;

      characterInstruction = '6. 如果提供了角色上下文，必须使用 @username 格式引用角色（注意：@username 后面必须加空格），不要直接描述角色';
    } else {
      // ⭐ 关键修复：明确告知不要使用 @username 格式
      characterInstruction = '6. 不要使用 @username 格式引用角色（未提供角色上下文），直接描述主体即可';
    }

    // 动态生成风格指令（不再硬编码）
    let styleInstruction = '';
    if (style === 'picture-book') {
      styleInstruction = '使用绘本/卡通风格（拟人化、鲜艳、友好）';
    } else if (style === 'cinematic') {
      styleInstruction = '使用电影风格（高画质、专业构图、戏剧性光影）';
    } else if (style === 'documentary') {
      styleInstruction = '使用纪录片风格（写实、自然、客观）';
    } else if (style === 'animation') {
      styleInstruction = '使用动画风格（流畅动作、鲜明角色、丰富细节）';
    } else if (style === 'custom' && customStyleDescription) {
      styleInstruction = `使用自定义风格：${customStyleDescription}`;
    }

    // ⭐ 新增：优化方向指令（如果有）
    const directionText = directionInstruction ? `\n0. ${directionInstruction}` : '';

    // ⭐ 添加示例（当有角色引用时）
    const examplesSection = (context.characters && context.characters.length > 0) ? `

输出示例：
✅ 正确：
${context.characters.map(c => `  @${c.username} 在海边玩耍，充满好奇和喜悦地探索沙滩。`).join('\n  ')}

❌ 错误：
  所有角色均采用拟人化设计，拥有大而闪亮的眼睛、友好的微笑表情和可爱的姿态。
  一只卡通风格的小猫在海边玩耍。
  @${context.characters[0].alias || context.characters[0].username} 在海边玩。（❌ 不能使用别名）` : '';

    return `请将以下简单描述优化成 Sora 2 视频生成提示词：${characterMapping}

原文：${prompt}${characterContext}

要求：${directionText}
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. ${styleInstruction}
4. 包含摄影指导和动画风格描述
5. 适合${context.target_duration || 10}秒视频时长
${characterInstruction}${examplesSection}

请直接输出优化后的提示词，不要解释。`;
  }

  /**
   * 获取优化方向指令
   * @private
   * @param {string} direction - 优化方向（更详细、更简洁、更生动、更专业等）
   * @returns {string} 优化方向指令
   */
  _getDirectionInstruction(direction) {
    if (!direction) return '';

    const instructions = {
      '更详细': '请增加细节描述，提供更多视觉细节、环境描述和感官体验。添加具体的颜色、形状、材质、光影效果等细节。',
      '更简洁': '请简化描述，保持核心内容，去掉冗余的修饰词和次要细节。使用简洁明了的语言表达。保留最重要的视觉元素和动作，删减不必要的描述。',
      '更生动': '请使用更生动的语言，增强画面感和动态感。添加动态动词、拟声词、比喻等修辞手法，让描述更具活力和表现力。',
      '更专业': '请使用专业术语和更正式的表达方式。采用行业标准词汇、技术参数描述，让提示词更具专业性和权威感。'
    };

    return instructions[direction] || `请按照以下方向优化：${direction}`;
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
