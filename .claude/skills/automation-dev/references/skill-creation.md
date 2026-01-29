# Skill 创建完整指南

## 关于 Skills

Skills 是模块化、自包含的包，通过提供专门的知识、工作流和工具来扩展 Claude 的功能。可以将它们视为特定领域或任务的"入门指南"——将 Claude 从通用代理转变为具有程序性知识的专业代理，而这是任何模型都无法完全具备的。

### Skills 提供什么

1. **专门的工作流** - 特定领域的多步骤程序
2. **工具集成** - 使用特定文件格式或 API 的说明
3. **领域专业知识** - 公司特定的知识、模式、业务逻辑
4. **捆绑资源** - 复杂和重复任务的脚本、参考资料和资产

### Skill 的结构

每个 skill 由必需的 SKILL.md 文件和可选的捆绑资源组成：

```
skill-name/
├── SKILL.md (必需)
│   ├── YAML frontmatter 元数据（必需）
│   │   ├── name: (必需)
│   │   └── description: (必需)
│   └── Markdown 指令（必需）
└── 捆绑资源（可选）
    ├── scripts/          - 可执行代码（Python/Bash/等）
    ├── references/       - 文档（按需加载到上下文中）
    └── assets/           - 输出中使用的文件（模板、图标、字体等）
```

#### SKILL.md (必需)

**元数据质量**: YAML frontmatter 中的 `name` 和 `description` 决定 Claude 何时使用该 skill。具体说明 skill 的功能和何时使用。使用第三人称（例如 "This skill should be used when..." 而非 "Use this skill when..."）。

#### 捆绑资源（可选）

##### Scripts (`scripts/`)

需要确定性可靠性或重复重写的任务的可执行代码（Python/Bash/等）。

- **何时包含**: 当相同代码被重复重写或需要确定性可靠性时
- **示例**: 用于 PDF 旋转任务的 `scripts/rotate_pdf.py`
- **好处**: Token 高效、确定性、可在不加载到上下文的情况下执行
- **注意**: 脚本可能仍需被 Claude 读取以进行修补或环境特定调整

##### References (`references/`)

旨在按需加载到上下文中以通知 Claude 流程和思维的文档和参考资料。

- **何时包含**: Claude 在工作时应参考的文档
- **示例**: `references/finance.md`（财务模式）、`references/mnda.md`（公司 NDA 模板）、`references/policies.md`（公司政策）、`references/api_docs.md`（API 规范）
- **使用场景**: 数据库模式、API 文档、领域知识、公司政策、详细工作流指南
- **好处**: 保持 SKILL.md 精简，仅在 Claude 确定需要时加载
- **最佳实践**: 如果文件很大（>10k 字），在 SKILL.md 中包含 grep 搜索模式
- **避免重复**: 信息应存在于 SKILL.md 或 references 文件中，而非两者都有。首选 references 文件存放详细信息，除非是 skill 的核心内容——这使 SKILL.md 保持精简，同时使信息可发现且不占用上下文窗口。仅在 SKILL.md 中保留基本程序说明和工作流指导；将详细参考资料、模式和示例移至 references 文件。

##### Assets (`assets/`)

不打算加载到上下文中的文件，而是在 Claude 产生的输出中使用的文件。

- **何时包含**: skill 需要在最终输出中使用的文件
- **示例**: `assets/logo.png`（品牌资产）、`assets/slides.pptx`（PowerPoint 模板）、`assets/frontend-template/`（HTML/React 样板）、`assets/font.ttf`（排版）
- **使用场景**: 模板、图片、图标、样板代码、字体、被复制或修改的示例文档
- **好处**: 分离输出资源和文档，使 Claude 能够使用文件而不加载到上下文

##### 隐私和路径引用

**关键**: 打算公开分发的 skills 不得包含用户特定或公司特定的信息：

- **禁止**: 用户目录的绝对路径 (`/home/username/`, `/Users/username/`, `/mnt/c/Users/username/`)
- **禁止**: 个人用户名、公司名称、部门名称、产品名称
- **禁止**: OneDrive 路径、云存储路径或任何环境特定的绝对路径
- **禁止**: 硬编码的 skill 安装路径，如 `~/.claude/skills/` 或 `/Users/username/Workspace/claude-code-skills/`
- **允许**: skill bundle 内的相对路径 (`scripts/example.py`, `references/guide.md`)
- **允许**: 标准占位符 (`~/workspace/project`, `username`, `your-company`)
- **最佳实践**: 使用简单的相对路径引用捆绑脚本，如 `scripts/script_name.py` — Claude 将解析实际位置

##### 版本管理

**关键**: Skills 的 SKILL.md 中不应包含版本历史或版本号：

- **禁止**: SKILL.md 中的版本章节（`## Version`, `## Changelog`, `## Release History`）
- **禁止**: SKILL.md 正文内容中的版本号
- **正确位置**: Skill 版本在 marketplace.json 的 `plugins[].version` 下跟踪
- **理由**: Marketplace 基础架构管理版本控制；SKILL.md 应是专注于功能的无时间限制内容
- **示例**: 与其在 SKILL.md 中记录 v1.0.0 → v1.1.0 的更改，仅更新 marketplace.json 中的版本

### 渐进式披露设计原则

Skills 使用三级加载系统来高效管理上下文：

1. **元数据（name + description）** - 始终在上下文中（~100 字）
2. **SKILL.md 正文** - skill 触发时（<5k 字）
3. **捆绑资源** - 按 Claude 需要（无限*）

*无限，因为脚本可以在不读取到上下文窗口的情况下执行。

## Skill 创建最佳实践

Anthropic 编写了 skill 作者最佳实践，在创建或更新任何 skill 之前应该检索，链接为：https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices.md

## ⚠️ 关键：在源位置编辑 Skills

**永远不要编辑 `~/.claude/plugins/cache/` 中的 skills** —— 那是只读缓存目录。那里的所有更改都是：
- 缓存刷新时丢失
- 不同步到源代码控制
- 浪费精力，需要手动重新合并

**始终验证正在编辑源仓库**:
```bash
# 错误 - 缓存位置（只读副本）
~/.claude/plugins/cache/daymade-skills/my-skill/1.0.0/my-skill/SKILL.md

# 正确 - 源仓库
/path/to/your/claude-code-skills/my-skill/SKILL.md
```

**在任何编辑之前**，确认文件路径不包含 `/cache/` 或 `/plugins/cache/`。

## Skill 创建流程

要创建 skill，按顺序遵循"Skill 创建流程"，仅在有明确原因时跳过步骤。

### Step 1: 通过具体示例理解 Skill

仅当 skill 的使用模式已经清楚理解时跳过此步骤。即使在使用现有 skill 时，此步骤仍然有价值。

要创建有效的 skill，清楚地了解 skill 如何使用的具体示例。这种理解可以来自直接用户示例或生成并经用户反馈验证的示例。

例如，在构建 `image-editor` skill 时，相关问题包括：

- "image-editor skill 应支持什么功能？编辑、旋转，还是其他？"
- "你能给我一些如何使用这个 skill 的示例吗？"
- "我可以想象用户要求诸如'从此图片中去除红眼'或'旋转此图片'之类的内容。还有其他你可以想象的这个 skill 被使用的方式吗？"
- "用户会说什么来触发这个 skill？"

为了避免压倒用户，避免在单条消息中询问太多问题。从最重要的问题开始，并根据需要跟进以提高效果。

在清楚了解 skill 应支持的功能时结束此步骤。

### Step 2: 规划可重用的 Skill 内容

要将具体示例转化为有效的 skill，通过以下方式分析每个示例：

1. 考虑如何从头开始执行示例
2. 确定Claude的适当自由度级别
3. 识别在重复执行这些工作流时会有帮助的脚本、参考资料和资产

**将特异性与任务风险匹配**:
- **高自由度（文本指令）**: 存在多种有效方法；上下文决定最佳路径（例如，代码审查、故障排除、内容分析）
- **中等自由度（带参数的伪代码）**: 首选模式存在可接受的变体（例如，API 集成模式、数据处理工作流）
- **低自由度（精确脚本）**: 操作脆弱，一致性关键，顺序重要（例如，PDF 旋转、数据库迁移、表单验证）

示例：在构建 `pdf-editor` skill 以处理诸如"帮我旋转此 PDF"的查询时，分析显示：

1. 旋转 PDF 需要每次重写相同的代码
2. `scripts/rotate_pdf.py` 脚本将有助于存储在 skill 中

示例：在设计用于处理诸如"为我构建一个待办事项应用"或"构建一个仪表板来跟踪我的步骤"等查询的 `frontend-webapp-builder` skill 时，分析显示：

1. 构建前端 webapp 每次都需要相同的样板 HTML/React
2. 包含样板 HTML/React 项目文件的 `assets/hello-world/` 模板将有助于存储在 skill 中

示例：在构建用于处理诸如"今天有多少用户登录？"等查询的 `big-query` skill 时，分析显示：

1. 查询 BigQuery 每次都需要重新发现表模式和关系
2. 记录表模式的 `references/schema.md` 文档将有助于存储在 skill 中

要建立 skill 的内容，分析每个具体示例以创建要包含的可重用资源列表：scripts、references 和 assets。

### Step 3: 初始化 Skill

此时，实际上是创建 skill。

仅当正在开发的 skill 已经存在，需要迭代或打包时跳过此步骤。在这种情况下，继续下一步。

从 scratch 创建新 skill 时，始终运行 `init_skill.py` 脚本。该脚本方便地生成新的模板 skill 目录，自动包含 skill 所需的一切，使 skill 创建过程更加高效和可靠。

用法：

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

脚本将：

- 在指定路径创建 skill 目录
- 生成带有正确 frontmatter 和 TODO 占位符的 SKILL.md 模板
- 创建示例资源目录：`scripts/`、`references/` 和 `assets/`
- 在每个目录中添加可以自定义或删除的示例文件

初始化后，根据需要自定义或删除生成的 SKILL.md 和示例文件。

### Step 4: 编辑 Skill

编辑（新生成或现有的）skill 时，记住 skill 是为另一个 Claude 实例使用创建的。专注于包含对另一个 Claude 实例有效执行这些任务有益且非显而易见的信息。考虑什么程序性知识、领域特定细节或可重用资产将帮助另一个 Claude 实例更有效地执行这些任务。

#### 从可重用的 Skill 内容开始

要开始实现，从上面识别的可重用资源开始：`scripts/`、`references/` 和 `assets/` 文件。请注意，此步骤可能需要用户输入。例如，在实现 `brand-guidelines` skill 时，用户可能需要提供要存储在 `assets/` 中的品牌资产或模板，或要存储在 `references/` 中的文档。

同时，删除任何不需要的示例文件和目录。初始化脚本在 `scripts/`、`references/` 和 `assets/` 中创建示例文件以演示结构，但大多数 skill 不需要所有这些。

**更新现有 skill 时**：扫描所有现有的参考文件以检查是否需要相应的更新。新功能通常需要更新架构、工作流或其他现有文档以保持一致性。

#### 参考文件命名

文件名必须在不读取内容的情况下自我解释。

**模式**: `<内容类型>_<具体性>.md`

**示例**:
- ❌ `commands.md`, `cli_usage.md`, `reference.md`
- ✅ `script_parameters.md`, `api_endpoints.md`, `database_schema.md`

**测试**: 仅从文件名就能理解文件内容吗？

#### 更新 SKILL.md

**写作风格**: 使用**祈使/不定式形式**编写整个 skill（动词优先指令），而非第二人称。使用客观、指导性语言（例如 "To accomplish X, do Y" 而非 "You should do X" 或 "If you need to do X"）。这为 AI 消费保持一致性和清晰度。

要完成 SKILL.md，回答以下问题：

1. skill 的目的是什么，用几句话说明？
2. 何时应该使用该 skill？
3. 在实践中，Claude 应该如何使用该 skill？所有上面开发的可重用资源内容都应该被引用，以便 Claude 知道如何使用它们。

### Step 5: 安全审查

在打包或分发 skill 之前，运行安全扫描器以检测硬编码的机密和个人信息：

```bash
# 打包前必需
python scripts/security_scan.py <path/to/skill-folder>

# 详细模式包括对路径、电子邮件和代码模式的额外检查
python scripts/security_scan.py <path/to/skill-folder> --verbose
```

**检测覆盖**:
- 通过 gitleaks 检测硬编码机密（API 密钥、密码、令牌）
- 详细模式下的个人信息（用户名、电子邮件、公司名称）
- 详细模式下的不安全代码模式（命令注入风险）

**首次设置**: 如尚未安装 gitleaks，请安装：

```bash
# macOS
brew install gitleaks

# Linux/Windows - 查看脚本输出以获取安装说明
```

**退出码**:
- `0` - 干净（可以安全打包）
- `1` - 高严重性问题
- `2` - 关键问题（分发前必须修复）
- `3` - 未安装 gitleaks
- `4` - 扫描错误

**检测到的机密补救**:

1. 从所有文件中删除硬编码机密
2. 使用环境变量：`os.environ.get("API_KEY")`
3. 如之前已提交到 git，轮换凭据
4. 重新运行扫描以在打包前验证修复

### Step 6: 打包 Skill

skill 准备好后，应将其打包成可分发的 zip 文件，与用户共享。打包过程自动验证 skill 以确保其满足所有要求：

```bash
scripts/package_skill.py <path/to/skill-folder>
```

可选的输出目录规范：

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

打包脚本将：

1. **自动验证** skill，检查：
   - YAML frontmatter 格式和必需字段
   - Skill 命名约定和目录结构
   - 描述完整性和质量
   - **路径引用完整性** - SKILL.md 中提到的所有 `scripts/`、`references/` 和 `assets/` 路径必须存在

2. **打包** skill（如果验证通过），创建一个以 skill 命名的 zip 文件（例如，`my-skill.zip`），包含所有文件并维护正确的目录结构以进行分发。

**常见验证失败**: 如果 SKILL.md 引用 `scripts/my_script.py` 但文件不存在，验证将失败并显示 "Missing referenced files: scripts/my_script.py"。在打包之前确保所有捆绑资源存在。

如果验证失败，脚本将报告错误并在不创建包的情况下退出。修复任何验证错误并再次运行打包命令。

### Step 7: 更新 Marketplace

打包后，更新 marketplace 注册表以包含新的或更新的 skill。

**对于新 skills**，添加条目到 `.claude-plugin/marketplace.json`：

```json
{
  "name": "skill-name",
  "description": "从 SKILL.md frontmatter description 复制",
  "source": "./",
  "strict": false,
  "version": "1.0.0",
  "category": "developer-tools",
  "keywords": ["相关", "关键词"],
  "skills": ["./skill-name"]
}
```

**对于更新的 skills**，按照 semver 增加 `plugins[].version` 中的版本：
- 补丁（1.0.x）：Bug 修复、拼写错误更正
- 次要（1.x.0）：新功能、额外参考
- 主要（x.0.0）：重大更改、重构的工作流

**同时更新** `metadata.version` 和 `metadata.description`（如果整个插件集合发生了显著变化）。

### Step 8: 迭代

测试 skill 后，用户可能请求改进。通常在使用 skill 后立即发生，具有 skill 执行表现的新鲜上下文。

**迭代工作流**:
1. 在实际任务上使用 skill
2. 注意困难或低效之处
3. 识别 SKILL.md 或捆绑资源应如何更新
4. 实现更改并再次测试

**细化过滤器**: 仅添加解决观察到问题的内容。如果最佳实践已覆盖，则不要重复。

---

**最后更新**: 2026-01-23
**来源**: skill-creator skill (344 lines)
