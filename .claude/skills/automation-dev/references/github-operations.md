# GitHub Operations 完整指南

## Pull Requests

### PR 创建模式

**NOJIRA 前缀**（绕过 JIRA 强制检查）:
```bash
gh pr create --title "NOJIRA: Your PR title" --body "PR description"
```

**标准格式**（带 JIRA 票号）:
```bash
gh pr create --title "GR-1234: Descriptive title" --body "PR description"
```

**从文件读取 PR 描述**:
```bash
gh pr create --title "NOJIRA: Title" --body-file pr_description.md
```

**指定目标分支**:
```bash
gh pr create --base main --head feature-branch
```

### PR 查看

**列出 PR**:
```bash
# 列出所有开放的 PR
gh pr list --state open

# 按作者过滤
gh pr list --author username

# 搜索特定关键词
gh pr list --search "bug"
```

**查看 PR 详情**:
```bash
# 查看 PR #123
gh pr view 123

# 在浏览器中打开
gh pr view 123 --web
```

**检查 PR 状态**:
```bash
# 检查 CI 状态
gh pr checks 123

# 查看评论
gh pr view 123 --comments
```

### PR 管理

**合并 PR**:
```bash
# Squash 合并
gh pr merge 123 --squash

# Merge 合并
gh pr merge 123 --merge

# Rebase 合并
gh pr merge 123 --rebase
```

**审查 PR**:
```bash
# 批准 PR
gh pr review 123 --approve

# 请求更改
gh pr review 123 --request-changes

# 添加评论
gh pr review 123 --body "LGTM"
```

**评论操作**:
```bash
# 添加一般评论
gh pr comment 123 --body "This looks good!"

# 添加行评论（需要知道文件路径和行号）
gh api repos/{owner}/{repo}/pulls/123/comments \
  -f body="Nit: rename this variable" \
  -F path=path/to/file.py \
  -F line=42 \
  -F side=RIGHT
```

## Issues

### Issue 创建

**基本创建**:
```bash
gh issue create --title "Bug: Issue title" --body "Issue description"
```

**带标签和指派人**:
```bash
gh issue create \
  --title "Feature: Add new feature" \
  --body "Description..." \
  --label enhancement \
  --assignee username
```

**从模板创建**:
```bash
# 使用 .github/ISSUE_TEMPLATE/ 中的模板
gh issue create --template "bug_report.md"
```

### Issue 管理

**列出 Issues**:
```bash
# 列出所有开放的 issues
gh issue list --state open

# 按标签过滤
gh issue list --label bug

# 按里程碑过滤
gh issue list --milestone "v1.0"
```

**编辑 Issue**:
```bash
# 添加标签
gh issue edit 456 --add-label "priority-high"

# 移除标签
gh issue edit 456 --remove-label "priority-low"

# 关闭 issue
gh issue close 456

# 重新打开 issue
gh issue reopen 456
```

### Issue 转换为 PR

```bash
# 从 issue 创建分支
gh issue develop 456

# 创建 PR 并关联 issue
gh pr create \
  --title "NOJIRA: Fix issue #456" \
  --body "Closes #456"
```

## Repositories

### 仓库操作

**查看仓库**:
```bash
# 在浏览器中打开
gh repo view --web

# 查看仓库详情
gh repo view
```

**克隆仓库**:
```bash
gh repo clone owner/repo
```

**创建仓库**:
```bash
# 公开仓库
gh repo create my-new-repo --public

# 私有仓库
gh repo create my-new-repo --private

# 带描述
gh repo create my-new-repo --description "My repo description"
```

**仓库设置**:
```bash
# 设置默认仓库
gh repo set-default owner/repo

# 查看设置
gh repo view owner/repo --json settings
```

## Workflows

### Workflow 管理

**列出 Workflows**:
```bash
gh workflow list
```

**运行 Workflow**:
```bash
# 手动运行 workflow
gh workflow run workflow-name.yml

# 带参数运行
gh workflow run workflow-name.yml -f input.json
```

**监控运行**:
```bash
# 查看运行状态
gh run view run-id

# 实时监控日志
gh run watch run-id

# 下载运行产物
gh run download run-id
```

**列出运行**:
```bash
# 列出最近运行
gh run list

# 按工作流过滤
gh run list --workflow workflow-name.yml

# 按状态过滤
gh run list --status failure
```

## GitHub API

### REST API 调用

**基本格式**:
```bash
gh api <endpoint>
```

**常用示例**:
```bash
# 获取 PR 详情
gh api repos/{owner}/{repo}/pulls/123

# 添加评论
gh api repos/{owner}/{repo}/issues/123/comments \
  -f body="Comment text"

# 列出 workflow runs
gh api repos/{owner}/{repo}/actions/runs

# 更新仓库设置
gh api repos/{owner}/{repo} \
  -X PATCH \
  -f description="New description"
```

**处理 JSON 输出**:
```bash
# JSON 输出
gh pr list --json number,title,state

# 使用 jq 处理
gh pr list --json number,title | jq '.[] | select(.title | contains("bug"))'

# 模板输出
gh pr list --template '{{range .}}{{.number}}: {{.title}}{{"\n"}}{{end}}'
```

### GraphQL 查询

```bash
# 执行 GraphQL 查询
gh api graphql \
  -f query='
  query {
    repository(owner: "owner", name: "repo") {
      pullRequests(first: 10) {
        nodes {
          title
          state
          author {
            login
          }
        }
      }
    }
  }
  '
```

## 认证和配置

### 登录

**GitHub.com**:
```bash
gh auth login
```

**GitHub Enterprise**:
```bash
gh auth login --hostname github.enterprise.com
```

### 检查认证状态

```bash
gh auth status
```

### 配置设置

```bash
# 设置默认编辑器
gh config set editor vim

# 设置 Git 协议
gh config set git_protocol ssh

# 列出所有配置
gh config list
```

## 输出格式

### JSON 输出

```bash
# 基本输出
gh pr list --json number,title,state

# 选择特定字段
gh pr list --json number,title,author

# 格式化输出
gh pr list --json number,title | jq '.[] | {number: .number, title: .title}'
```

### 模板输出

```bash
# 自定义模板
gh pr list --template '{{range .}}{{.number}}: {{.title}}{{"\n"}}{{end}}'

# 带条件
gh pr list --template '{{range .}}{{if .isDraft}}DRAFT: {{end}}{{.number}}: {{.title}}{{"\n"}}{{end}}'
```

## 常见场景

### 场景1: 批量操作 PR

```bash
# 列出所有开放的 PR
gh pr list --state open --json number,title | \
  jq -r '.[] | .number' | \
  while read pr_number; do
    echo "Processing PR #$pr_number"
    # 执行操作
  done
```

### 场景2: 搜索相关 Issues

```bash
# 搜索关键词
gh issue list --search "memory leak"

# 按多个标签过滤
gh issue list --label bug,priority-high
```

### 场景3: 创建 Release

```bash
gh release create v1.0.0 \
  --title "Version 1.0.0" \
  --notes "Release notes here"
```

---

**最后更新**: 2026-01-23
**来源**: github-ops skill (211 lines)
