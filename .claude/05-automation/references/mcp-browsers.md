# Chrome DevTools MCP 完整指南

## 核心工具列表

### 页面操作
- `list_pages()` - 列出所有打开的页面
- `new_page(url)` - 创建新页面
- `navigate_page({type, url})` - 导航到URL
- `close_page(pageId)` - 关闭页面
- `select_page(pageId)` - 选择页面

### 元素交互
- `take_snapshot()` - 获取页面快照（返回可交互元素）
- `click(uid)` - 点击元素
- `fill(uid, value)` - 填写表单
- `fill_form([{uid, value}, ...])` - 批量填写表单
- `press_key(key)` - 按键（如Enter, Tab）
- `hover(uid)` - 悬停
- `drag({from_uid, to_uid})` - 拖拽

### 信息获取
- `take_screenshot()` - 截图
- `evaluate_script(function)` - 执行JavaScript
- `list_console_messages()` - 查看控制台日志
- `list_network_requests()` - 监听网络请求
- `get_network_request(reqid)` - 获取请求详情

### 高级功能
- `performance_start_trace()` - 开始性能追踪
- `performance_stop_trace()` - 停止性能追踪
- `performance_analyze_insight()` - 分析性能洞察
- `emulate({networkConditions, cpuThrottling, geolocation})` - 模拟网络/CPU/位置
- `resize_page({width, height})` - 调整页面大小

## 使用场景

### 自动化测试流程

```bash
# 1. 列出页面
list_pages()

# 2. 导航到测试页面
navigate_page({type: "url", url: "http://localhost:5173/"})

# 3. 获取页面快照
take_snapshot()

# 4. 点击按钮
click(uid)

# 5. 填写表单
fill(uid, value)

# 6. 截图验证
take_screenshot()

# 7. 检查控制台错误
list_console_messages()

# 8. 检查API请求
list_network_requests()
```

### 性能分析流程

```bash
# 1. 开始性能追踪
performance_start_trace({reload: true})

# 2. 等待页面加载完成

# 3. 停止性能追踪
performance_stop_trace()

# 4. 分析性能洞察
performance_analyze_insight({insightSetId, insightName})
```

## 最佳实践

1. **快照优先**: 总是先用 `take_snapshot()` 了解页面结构
2. **错误检查**: 每次操作后检查 `list_console_messages()` 是否有错误
3. **网络验证**: API调用后使用 `list_network_requests()` 验证请求参数
4. **截图保存**: 重要步骤使用 `take_screenshot()` 保存现场

## 常见问题

### Q: 如何查找元素的 uid？

A: 使用 `take_snapshot()` 获取页面快照，快照会返回所有可交互元素的 uid。

### Q: 如何处理弹窗？

A: 使用 `handle_dialog({action: "accept"})` 接受或 `dismiss` 拒绝弹窗。

### Q: 如何等待元素加载？

A: 使用 `wait_for({text: "xxx"})` 等待特定文本出现。

---

**最后更新**: 2026-01-23
**相关**: [05-automation/README.md](../README.md)
