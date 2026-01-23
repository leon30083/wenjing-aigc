# GLM Coding Skill

GLM-4.7 Coding Plan API 集成和优化技能

## 技能结构

```
glm-coding/
├── SKILL.md                    # 主技能文档
├── references/                 # 参考文档
│   └── glm_integration.md     # GLM API 完整参考
├── scripts/                    # 实用脚本
│   ├── test_glm_connection.py # 连接测试脚本
│   └── benchmark_prompts.py   # 性能基准测试
└── README.md                   # 本文件
```

## 快速开始

### 1. 测试 GLM 连接

```bash
# 设置环境变量
export GLM_CODING_API_KEY="your_api_key_here"

# 运行测试
python scripts/test_glm_connection.py
```

### 2. 运行性能基准测试

```bash
python scripts/benchmark_prompts.py
```

## 核心要点

### ⚠️ API 端点格式（关键差异）

- **Base URL**: `https://open.bigmodel.cn/api/coding/paas/v4`
- **完整端点**: `/chat/completions`（不需要 `/v1` 前缀）

### ⚠️ 响应格式处理

GLM-4.7 返回内容在 `reasoning_content` 字段，不是 `content`：

```javascript
// ✅ 正确：兼容两种格式
const message = response.data.choices[0].message;
const result = message.content || message.reasoning_content || '';
```

### 性能特点

- **响应时间**: 约 60 秒（较慢）
- **Token 消耗**: 约 2339 tokens/请求
- **适用场景**: 批处理任务（不适合实时交互）

## 使用场景

1. **提示词优化** - picture-book 风格测试成功
2. **代码生成和优化** - 编程任务
3. **技术文档编写** - 文档生成

## 已知问题

- ⚠️ 速度较慢，不适合实时场景
- ⚠️ Token 消耗较高
- ⚠️ 优化质量一般（用户反馈）

## 推荐用法

适合后台批处理任务，不适合用户实时交互场景。
