# [Project Name] 故障排查指南

本文档提供 [Project Name] 项目开发中常见问题的诊断和解决方案。

## 🔍 目录

1. [API 调用问题](#api-调用问题)
2. [前端框架问题](#前端框架问题)
3. [平台兼容性问题](#平台兼容性问题)
4. [文档更新问题](#文档更新问题)

---

## API 调用问题

### 问题 1: API 返回 404 Not Found

**症状**:
```javascript
const response = await fetch(`${API_BASE}/resource/${id}`);
// 返回 404
```

**诊断**:
- 检查 API 路径是否缺少前缀
- 检查后端服务器是否正在运行
- 检查端口是否正确

**解决方案**:
```javascript
// ✅ 添加正确的前缀
const response = await fetch(`${API_BASE}/api/resource/${id}`);
```

**相关错误**: SKILL.md - 错误1 - API 端点路径错误

---

### 问题 2: API 返回 429 Rate Limit

**症状**:
- 轮询任务状态时频繁返回 429
- 控制台显示 "Too Many Requests"

**诊断**:
- 检查轮询间隔是否太短
- 检查是否有多处并发请求

**解决方案**:
```javascript
// ✅ 使用合适的轮询间隔
const POLL_INTERVAL = 30000; // 30秒
setInterval(() => checkStatus(taskId), POLL_INTERVAL);
```

**相关错误**: SKILL.md - 错误2 - 轮询间隔过短

---

## 前端框架问题

### 问题 3: 组件状态未更新

**症状**:
- 数据已变化，但界面未刷新
- 控制台显示最新数据，但界面显示旧数据

**诊断**:
- 检查是否使用了不可变更新
- 检查 useEffect 依赖数组

**解决方案**:
```javascript
// ❌ 错误：直接修改状态
state.items.push(newItem);
setState(state);

// ✅ 正确：创建新对象
setState({
  ...state,
  items: [...state.items, newItem]
});
```

**相关错误**: SKILL.md - 错误3 - 状态不可变更新

---

## 平台兼容性问题

### 问题 4: 不同平台返回格式不一致

**症状**:
- 平台 A 返回 `{id}`，平台 B 返回 `{task_id}`
- 字段名称不统一导致错误

**诊断**:
- 检查是否处理了多种响应格式
- 检查是否有统一的适配层

**解决方案**:
```javascript
// ✅ 兼容多种格式
const taskId = result.id || result.task_id;
if (taskId) {
  // 继续处理
}
```

**相关错误**: SKILL.md - 错误4 - 平台差异处理

---

## 文档更新问题

### 问题 5: SKILL.md 与 code.md 不同步

**症状**:
- 错误编号不一致
- SKILL.md 缺少最新错误模式
- 开发时看不到最新的规范

**诊断**:
- 检查是否更新了 SKILL.md
- 检查错误编号是否一致

**解决方案**:
1. 按照 docs.md 的更新流程操作
2. 优先更新 SKILL.md
3. 确保 SKILL.md 和 code.md 的错误编号一致
4. 运行检查清单验证

**相关文档**: [UPDATE.md](UPDATE.md) - Skill 更新指南

---

## 🛠️ 诊断工具

### 浏览器 DevTools

**控制台日志检查**:
```javascript
// 检查 API 调用
console.log('[API Call]', url, params);

// 检查组件状态
console.log('[State]', state);

// 检查事件
console.log('[Event]', event.type, event.detail);
```

**网络请求检查**:
- 打开 Network 标签
- 筛选 Fetch/XHR 请求
- 检查请求 URL 和响应状态

### Git 诊断

```bash
# 检查文件修改状态
git status

# 检查文档是否已提交
git log --oneline -5

# 检查文档差异
git diff .claude/skills/[project]-dev/SKILL.md
git diff .claude/rules/code.md
```

---

## 📞 获取帮助

如果问题未在本文档中解决：

1. 检查 [SKILL.md](../SKILL.md) 中的错误模式
2. 查看 [UPDATE.md](UPDATE.md) 中的更新流程
3. 查看 `.claude/rules/code.md` 中的详细错误示例
4. 查看 `docs/HANDOVER.md` 中的完整记录

---

**最后更新**: YYYY-MM-DD
**维护者**: [Your Name]
