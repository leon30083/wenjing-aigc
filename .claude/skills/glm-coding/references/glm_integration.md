# GLM-4.7 Coding Plan API Reference

Complete API reference for GLM-4.7 Coding Plan integration.

## API Specification

### Base URL
```
https://open.bigmodel.cn/api/coding/paas/v4
```

### Endpoints

#### Chat Completions
```
POST /chat/completions
```

**Full URL**: `https://open.bigmodel.cn/api/coding/paas/v4/chat/completions`

**Headers**:
```json
{
  "Authorization": "Bearer {api_key}",
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "model": "GLM-4.7",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "User prompt here"
    }
  ],
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 2000
}
```

**Response**:
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "",
      "reasoning_content": "Actual response content here"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
      "completion_tokens": 500,
      "total_tokens": 600
  },
  "model": "GLM-4.7"
}
```

**⚠️ Critical**: The `reasoning_content` field contains the actual response, NOT `content`.

## Response Format Handling

### Standard Pattern (Compatible with All Providers)

```javascript
function extractMessageContent(message) {
  // GLM-4.7: uses reasoning_content
  // Standard OpenAI: uses content
  return message.content || message.reasoning_content || '';
}

// Usage
const message = response.data.choices[0].message;
const content = extractMessageContent(message);
```

### Streaming Response

GLM-4.7 supports streaming responses:

```javascript
const response = await axios.post(url, body, {
  headers: { 'Authorization': `Bearer ${apiKey}` },
  responseType: 'stream'
});

response.data.on('data', (chunk) => {
  const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      const content = data.choices[0].delta.content || data.choices[0].delta.reasoning_content || '';
      processChunk(content);
    }
  }
});
```

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Invalid API Key | Verify API key format: `{id}.{key}` |
| 404 | Endpoint Not Found | Check URL format (no `/v1` prefix) |
| 429 | Rate Limit | Implement retry with exponential backoff |
| 500 | Internal Server Error | Retry after delay |

### Retry Pattern

```javascript
async function callGLMWithRetry(request, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, request, {
        timeout: 120000,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000 * (attempt + 1);
        console.log(`Rate limited, retrying after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else if (attempt === maxRetries - 1) {
        throw error;
      } else {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
}
```

## Model Parameters

### GLM-4.7 Specific Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `model` | string | "GLM-4.7" | - | Model name (only option for Coding Plan) |
| `temperature` | number | 0.0-1.0 | 0.7 | Controls randomness |
| `top_p` | number | 0.0-1.0 | 0.9 | Nucleus sampling |
| `max_tokens` | integer | 1-8192 | 2000 | Maximum tokens in response |

### Recommended Settings for Different Tasks

**Code Generation**:
```json
{
  "temperature": 0.2,
  "top_p": 0.95,
  "max_tokens": 4000
}
```

**Prompt Optimization**:
```json
{
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 2000
}
```

**Documentation**:
```json
{
  "temperature": 0.5,
  "top_p": 0.9,
  "max_tokens": 3000
}
```

## Integration Example

### Complete Backend Implementation (openaiClient.js)

```javascript
class GLMCodingClient {
  constructor(apiKey) {
    this.baseURL = 'https://open.bigmodel.cn/api/coding/paas/v4';
    this.endpoint = '/chat/completions';
    this.apiKey = apiKey;
    this.model = 'GLM-4.7';
  }

  get url() {
    return `${this.baseURL}${this.endpoint}`;
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async optimizePrompt(prompt, style = 'picture-book', context = {}) {
    const systemPrompt = this._buildSystemPrompt(style, context);
    const userPrompt = this._buildUserPrompt(prompt, style, context);

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000
    };

    const response = await axios.post(this.url, body, {
      headers: this.headers,
      timeout: 120000  // 2 minutes for GLM reasoning
    });

    // ⭐ Critical: Handle GLM's response format
    const message = response.data.choices[0].message;
    const result = message.content || message.reasoning_content || '';

    return {
      success: true,
      data: {
        optimized_prompt: result,
        meta: {
          model_used: this.model,
          style: style,
          tokens_used: response.data.usage.total_tokens
        }
      }
    };
  }

  _buildSystemPrompt(style, context) {
    // Style-specific system prompts
    const prompts = {
      'picture-book': `你是专业的动画绘本提示词专家。

任务：将简单的绘本旁白优化成 Sora 2 视频生成提示词。

三层扩展模型：
1. Layer 1 (核心层 30%)：保持旁白的核心动作，不偏离故事主线
2. Layer 2 (丰富层 40%)：添加视觉细节、环境、氛围
3. Layer 3 (动态层 30%)：留出 AI 自然发挥空间

输出格式：
⚠️ 重要：输出必须是单一段落，绝对禁止使用任何标题、分段、项目符号或列表形式。

请直接输出一段连贯的提示词描述，例如：
"卡通绘本风格的视频。一只拟人化的卡通猫咪在阳光明媚的花园里欢快地追逐蝴蝶，跳跃着探索每一处角落。画面色彩明亮饱和，充满童趣，动作夸张且富有弹性，背景细节丰富，光影效果梦幻，适合10秒的视频时长。"

视频时长：${context.target_duration || 10}秒`
    };

    return prompts[style] || `你是视频提示词优化专家，请将简单描述优化成详细的 Sora 2 提示词。`;
  }

  _buildUserPrompt(prompt, style, context) {
    let characterContext = '';
    if (context.characters && context.characters.length > 0) {
      const characterList = context.characters.map(c =>
        `  - @${c.username} (${c.alias || c.username})`
      ).join('\n');
      characterContext = `\n\n可用角色列表（必须使用 @username 格式引用）：\n${characterList}`;
    }

    return `请将以下绘本旁白优化成 Sora 2 视频生成提示词：${characterContext}

旁白原文：${prompt}

要求：
1. 保持核心动作不变
2. 添加丰富的视觉细节
3. 使用绘本/卡通风格
4. 包含摄影指导和动画风格描述
5. 适合${context.target_duration || 10}秒视频时长
6. 如果提供了角色上下文，必须使用 @username 格式引用角色

请直接输出优化后的提示词，不要解释。`;
  }
}
```

## Testing

### Connection Test

```bash
curl -X POST https://open.bigmodel.cn/api/coding/paas/v4/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "GLM-4.7",
    "messages": [
      {"role": "user", "content": "连接测试"}
    ]
  }'
```

### Expected Response

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "",
      "reasoning_content": "连接成功"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "total_tokens": 10
  },
  "model": "GLM-4.7"
}
```

## Performance Benchmarks

Based on production testing (10 optimization requests):

| Metric | Min | Max | Average |
|--------|-----|-----|---------|
| Response Time | 45s | 75s | 60s |
| Tokens Used | 2147 | 2681 | 2339 |
| Success Rate | - | - | 100% |

## Rate Limits

GLM-4.7 Coding Plan rate limits (as of 2026-01):
- **Requests per minute**: 60
- **Tokens per minute**: 300,000

Implement rate limiting to avoid 429 errors:

```javascript
class RateLimiter {
  constructor(requestsPerMinute, tokensPerMinute) {
    this.requests = [];
    this.tokens = 0;
    this.windowStart = Date.now();
    this.requestsPerMinute = requestsPerMinute;
    this.tokensPerMinute = tokensPerMinute;
  }

  async acquireRequest() {
    const now = Date.now();
    const windowElapsed = now - this.windowStart;

    if (windowElapsed >= 60000) {
      this.requests = [];
      this.tokens = 0;
      this.windowStart = now;
    }

    if (this.requests.length >= this.requestsPerMinute) {
      const waitTime = 60000 - windowElapsed;
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
      return this.acquireRequest();
    }

    this.requests.push(now);
  }

  async acquireTokens(tokenCount) {
    if (this.tokens + tokenCount > this.tokensPerMinute) {
      const waitTime = 60000 - (Date.now() - this.windowStart);
      console.log(`Token limit reached, waiting ${waitTime}ms`);
      await new Promise(r => setTimeout(r, waitTime));
      this.tokens = 0;
      this.windowStart = Date.now();
    }
    this.tokens += tokenCount;
  }
}
```

## Troubleshooting Guide

### Issue: Empty Content

**Symptom**: `message.content` returns empty string

**Diagnosis**:
```javascript
console.log('Message keys:', Object.keys(response.data.choices[0].message));
// Should show: ["role", "content", "reasoning_content"]
```

**Solution**:
```javascript
const message = response.data.choices[0].message;
const content = message.reasoning_content || message.content || '';
```

### Issue: Slow Response

**Symptom**: Requests taking > 60 seconds

**Diagnosis**: GLM-4.7 uses reasoning step which takes time

**Solutions**:
1. Increase timeout to 120 seconds
2. Use async/await with progress feedback
3. Consider alternative providers for real-time tasks

### Issue: Malformed Response

**Symptom**: Response parsing fails

**Diagnosis**: Check response structure:
```javascript
console.log('Full response:', JSON.stringify(response.data, null, 2));
```

**Common Issues**:
- Missing `choices` array
- Empty `reasoning_content` and `content`
- Non-JSON response

## API Key Management

### Format

GLM API keys use format: `{id}.{secret}`

**Example**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Storage Strategy

Store per-service keys in localStorage:

```javascript
// Save
const apiKeys = {
  'deepseek': 'sk-...',
  'glm_coding': 'your_glm_api_key_here',
  'ge25': 'sk-...'
};
localStorage.setItem('winjin-openai-keys', JSON.stringify(apiKeys));

// Load
const apiKeys = JSON.parse(localStorage.getItem('winjin-openai-keys') || '{}');
const glmKey = apiKeys['glm_coding'];
```

### Security

⚠️ **Never commit API keys to git**

Use environment variables for production:
```bash
# .env
GLM_CODING_API_KEY=your_key_here
```

```javascript
const apiKey = process.env.GLM_CODING_API_KEY || localStorage.getItem('glm_api_key');
```

## Comparison with OpenAI API

| Feature | OpenAI | GLM-4.7 Coding |
|---------|---------|-----------------|
| **Endpoint** | `/v1/chat/completions` | `/chat/completions` (no /v1) |
| **Response Field** | `content` | `reasoning_content` |
| **Model Parameter** | `gpt-4`, `gpt-3.5-turbo` | `GLM-4.7` (only option) |
| **Streaming** | Supported | Supported |
| **Function Calling** | Supported | Not supported |

## See Also

- [SKILL.md](../SKILL.md) - Main skill documentation
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference) - Standard OpenAI API
- [Zhipu AI Documentation](https://open.bigmodel.cn/usercenter/basicInformation) - Official GLM docs
