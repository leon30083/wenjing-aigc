# settings.json

```json
{
  "sandbox": {
    "allowedCommands": [
      "npm*",
      "bun*",
      "git status",
      "git diff",
      "git log --oneline -10",
      "ls -la",
      "cat",
      "grep",
      "find",
      "python test_[prompt.py](http://prompt.py)"
    ],
    "allowedPaths": [
      "src/**",
      "tests/**",
      ".claude/**",
      "package.json",
      "tsconfig.json"
    ],
    "allowMcpServers": ["mcp__server__*"]
  },
  "hooks": {
    "PreToolUse": "echo '[Hook] 即将执行工具...'",
    "PostToolUse": "! git status --short",
    "PermissionRequest": {
      "autoApprove": [
        "npm install",
        "bun install",
        "bun test"
      ]
    }
  },
  "statusline": {
    "enabled": true,
    "components": [
      "git-branch",
      "model",
      "token-usage",
      "context-percentage"
    ]
  }
}
```

## 配置说明

### Sandbox权限

- **allowedCommands**: 允许Claude自动执行的命令，使用通配符`*`支持整个命令系列
- **allowedPaths**: 允许访问的文件路径，保护敏感文件
- **allowMcpServers**: 允许整个MCP服务器接入

### Hooks生命周期

- **PreToolUse**: 工具执行前运行的脚本
- **PostToolUse**: 工具执行后自动检查git状态
- **PermissionRequest**: 自动批准指定命令，避免频繁询问

### Statusline状态栏

显示：Git分支、当前模型、Token使用量、上下文窗口占用百分比