# Claude Code自动化配置包

## 3️⃣ .claude/rules/prompt-optimizer.md

[[prompt-optimizer.md](http://prompt-optimizer.md)](prompt-optimizer%20md%20a216361f4c5d47239c8fe82897708545.md) - 提示词优化模块的自动化规则

**文件位置**：`wenjing-aigc/.claude/rules/prompt-optimizer.md`

## 1️⃣ CLAUDE.md

[[CLAUDE.md](http://CLAUDE.md)](CLAUDE%20md%20835de799297a4c53aa5bf4b9140f19b1.md) - 项目DNA，每次启动自动加载到上下文

**文件位置**：`wenjing-aigc/CLAUDE.md`

# Claude Code 自动化配置包

适用于 **wenjing-aigc** 项目的完整配置方案。复制文件内容到项目根目录，即可实现自动化开发流程。

---

## 📦 配置文件清单

- **CLAUDE.md** - 项目记忆文件（自动加载）
- **.claude/settings.json** - Sandbox权限 + Hooks配置
- **.claude/rules/** - 模块化开发规则
- **.claude/skills/** - 可复用的工作流技能

---

## 2️⃣ .claude/settings.json

[settings.json](settings%20json%207ecb0aa323d44147a2988b426a4f2ec0.md) - Sandbox权限边界 + 生命周期Hooks

**文件位置**：`wenjing-aigc/.claude/settings.json`

## 4️⃣ .claude/skills/prompt-tester/

提示词自动化测试工作流，包含两个文件：

- [prompt-tester [instructions.md](http://instructions.md)](prompt-tester%20instructions%20md%2096f8c549218d493e8468d3cf9daf9856.md) - 技能说明文档
- [[test-script.sh](http://test-script.sh)](test-script%20sh%203c5e782eb0414730a4c30b2f32509526.md) - 测试执行脚本

**文件位置**：`wenjing-aigc/.claude/skills/prompt-tester/`

---

## 🚀 快速部署指南

### 步骤1：复制文件

```bash
# 在项目根目录执行
cd ~/wenjing-aigc

# 创建.claude目录
mkdir -p .claude/rules .claude/skills/prompt-tester/examples

# [复制CLAUDE.md](http://复制CLAUDE.md)（从上面第1️⃣部分）
# 复制settings.json（从上面第2️⃣部分）
# [复制prompt-optimizer.md](http://复制prompt-optimizer.md)（从上面第3️⃣部分）
# 复制prompt-tester技能文件（从上面第4️⃣部分）
```

### 步骤2：启动Claude Code

```bash
cd ~/wenjing-aigc
claude
```

### 步骤3：验证配置

```bash
# [验证CLAUDE.md](http://验证CLAUDE.md)加载
/context
# 👀 查看"内存文件"部分，[应该能看到CLAUDE.md](http://应该能看到CLAUDE.md)

# 验证Sandbox权限
/sandbox
# 👀 应该显示允许的命令列表

# 验证Skills
/skills
# 👀 应该看到prompt-tester技能
```

### 步骤4：测试自动化

```bash
# 修改一个提示词文件
编辑 src/features/prompt-optimizer/prompts.ts

# Claude会自动应用rules规则，执行：
# - Token计数检查
# - 格式验证
# - 生成测试建议
```

---

## 💡 使用技巧

### 场景1：开发新功能

```bash
# 进入Plan Mode
Shift+Tab (按两次)

# 描述需求
> 添加提示词版本对比功能

# Claude会先分析架构，等你确认后再动手
```

### 场景2：调试Bug

```bash
# 使用Ultrathink深度分析
> ultrathink: 为什么提示词优化后Token反而增加了？

# 立即执行相关命令
! bun run analyze:tokens
```

### 场景3：提示词A/B测试

```bash
# 调用测试技能
/skills prompt-tester --versions v2.0,v2.1

# 自动并行测试，生成对比报告
```

---

## ⚠️ 注意事项

1. **首次使用建议用Sandbox模式**，避免误操作
2. **定期运行 `/context`** 检查上下文消耗
3. **提示词修改务必通过测试** 再合并到main分支
4. **遇到权限询问**，确认安全后可加入settings.json自动批准

---

## 🔄 配置更新

修改配置文件后：

```bash
# 重启Claude Code会话
claude --continue

# 或手动重新加载
/config reload
```

---

## 📚 扩展资源

- **官方文档**: [claude.ai/docs](http://claude.ai/docs)
- **31招技巧**: 查看本工作页的子页面
- **问题排查**: 使用 `/export` 导出对话日志分析

[[CLAUDE.md](http://CLAUDE.md)](CLAUDE%20md%20835de799297a4c53aa5bf4b9140f19b1.md)

[settings.json](settings%20json%207ecb0aa323d44147a2988b426a4f2ec0.md)

[[prompt-optimizer.md](http://prompt-optimizer.md)](prompt-optimizer%20md%20a216361f4c5d47239c8fe82897708545.md)

[prompt-tester [instructions.md](http://instructions.md)](prompt-tester%20instructions%20md%2096f8c549218d493e8468d3cf9daf9856.md)

[[test-script.sh](http://test-script.sh)](test-script%20sh%203c5e782eb0414730a4c30b2f32509526.md)

[📖 使用指南](%F0%9F%93%96%20%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97%203b37163e5aa14c0c8040fc17cc66f585.md)