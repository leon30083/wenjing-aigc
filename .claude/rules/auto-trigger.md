# 自动化触发规则

> **版本**: v1.0.0
> **创建日期**: 2026-01-18
> **目的**: 在合适的时机自动调用自动化测试系统

---

## 核心原则

**关键原则**: 当用户执行关键操作时，AI 应该**自动**启动相应的自动化监控/测试，而不是等待用户明确要求。

---

## 自动触发场景

### 1. 批量任务提交 ⭐ 高优先级

**触发条件**: 用户提交批量视频生成任务

**自动执行**:
```javascript
// 检测到批量任务提交
if (action === 'batch_submit' || nodeType === 'BatchVideoGenerateNode') {
  // ✅ 立即启动自动监控
  autoMonitor.batchTask(batchId, {
    pollInterval: 10000,        // 10 秒轮询
    maxDuration: 300000,        // 5 分钟超时
    onProgress: (status) => {
      console.log(`[自动监控] 进度: ${status.completed}/${status.total}`);
    },
    onComplete: (result) => {
      // ✅ 自动生成测试报告
      generateTestReport({
        type: 'batch-video-generation',
        batchId: batchId,
        result: result,
        timestamp: new Date().toISOString()
      });
    },
    onError: (error) => {
      // ✅ 自动错误分析
      analyzeError(error, {
        suggestFix: true,
        runRelatedTests: true
      });
    }
  });
}
```

**监控内容**:
- 批量任务状态（每 10 秒）
- 各子任务进度
- HTTP 错误检测
- 视频生成完成状态

**输出**:
- 控制台实时进度日志
- 完成后自动生成测试报告
- 错误时自动分析和修复建议

---

### 2. 代码修改后

**触发条件**: 检测到代码文件修改

**自动执行**:
```javascript
// 文件变化监控
watch('src/client/src/nodes/**/*.jsx', (filePath) => {
  if (filePath.includes('NarratorNode.jsx')) {
    // ✅ 自动运行节点测试
    runTest('node-infinite-loop', {
      detect: ['useEffect', 'useCallback'],
      checkDependencies: true,
      verifyStability: true
    });
  }

  if (filePath.includes('BatchVideoGenerateNode.jsx')) {
    // ✅ 自动验证 API 参数
    runTest('api-params-validation', {
      platforms: ['juxin', 'zhenzhen'],
      verifyParameters: true
    });
  }
});
```

---

### 3. 错误检测

**触发条件**: 控制台出现错误

**自动执行**:
```javascript
// 全局错误监听
window.addEventListener('error', (event) => {
  autoDiagnose(event.error, {
    categorize: true,           // 自动分类错误
    searchKnowledgeBase: true,   // 搜索错误模式库
    suggestFix: true,            // 建议修复方案
    runTests: 'related'          // 运行相关测试
  });
});

// React 错误监听
window.addEventListener('unhandledrejection', (event) => {
  // Promise rejection
  autoDiagnose(event.reason, {
    type: 'promise',
    checkAsyncCode: true
  });
});
```

---

### 4. 用户指令识别

**触发条件**: 用户消息包含特定关键词

**自动执行**:
```javascript
// 关键词 → 自动化操作
const TRIGGER_WORDS = {
  '监控|观察|跟踪': 'startAutoMonitoring',
  '测试|验证|检查': 'runAutomatedTest',
  '提交|生成|创建': 'monitorAndReport',
  '错误|问题|失败': 'analyzeError',
  '跳|闪烁|抖动': 'detectRenderLoop'
};

function detectUserIntent(message) {
  for (const [pattern, action] of Object.entries(TRIGGER_WORDS)) {
    if (new RegExp(pattern).test(message)) {
      console.log(`[自动触发] 检测到意图: ${action}`);
      return action;
    }
  }
}
```

---

### 5. 工作流加载

**触发条件**: 工作流加载完成

**自动执行**:
```javascript
// 工作流加载后自动验证
workflow.on('loaded', (workflow) => {
  // ✅ 自动验证工作流
  validateWorkflow(workflow, {
    checkNodes: true,
    checkEdges: true,
    checkDataFlow: true,
    reportIssues: true
  });
});
```

---

## 自动化测试报告

### 报告生成规则

**触发时机**:
1. 批量任务完成（成功或失败）
2. 测试执行完成
3. 错误分析完成

**报告模板**:
```markdown
# {测试类型} 测试报告

> **时间**: {timestamp}
> **任务 ID**: {batchId}
> **平台**: {platform}

## 测试概述

- **节点配置**: ✅ 通过
- **API 调用**: ✅ 成功
- **任务提交**: ✅ 成功
- **结果验证**: ⏳ 等待中

## 详细进度

| 时间 | 事件 | 状态 |
|------|------|------|
| 14:30:25 | 提交批量任务 | ✅ |
| 14:30:26 | 任务 1 已提交 | ✅ |
| 14:30:27 | 任务 2 已提交 | ✅ |
| 14:30:28 | 任务 3 已提交 | ✅ |

## 错误日志

{如果有错误}

## 测试结论

{总结和建议}
```

**保存路径**:
```
tests/reports/
├── batch-video-2025-01-18-143025.md
├── node-stability-2025-01-18-142000.md
└── api-validation-2025-01-18-141500.md
```

---

## 实施检查清单

在开发过程中，当遇到以下情况时，**必须**自动触发相应的自动化：

- [ ] 用户提交批量任务 → 自动监控 + 报告
- [ ] 修改节点代码 → 自动测试 + 验证
- [ ] 检测到控制台错误 → 自动分析 + 建议
- [ ] 用户说"监控" → 自动启动监控脚本
- [ ] 工作流加载 → 自动验证连接
- [ ] API 调用失败 → 自动检查参数

---

## 示例：完整的自动化流程

### 场景：用户提交批量视频任务

```javascript
// 1. 用户点击"生成"按钮
onClick: async () => {
  // 2. 提交任务
  const result = await api.submitBatch(batchData);

  // 3. ✅ 自动触发（无需用户要求）
  if (result.success) {
    // 自动监控
    autoMonitor.start(result.batchId);

    // 自动记录
    logger.info('批量任务已提交', {
      batchId: result.batchId,
      taskCount: result.jobs.length,
      platform: result.platform
    });

    // 自动通知
    notification.success(`批量任务已提交：${result.jobs.length} 个视频`);
  }
}

// 4. 后台自动轮询（每 10 秒）
setInterval(async () => {
  const status = await api.getBatchStatus(batchId);
  console.log(`[自动监控] ${status.completed}/${status.total} 完成`);

  // 5. ✅ 完成时自动生成报告
  if (status.isComplete) {
    generateReport(status);
  }
}, 10000);
```

---

## 关键要点

1. **主动而非被动**: AI 应该主动识别何时需要自动化，而不是等待用户要求
2. **关键操作必监控**: 批量任务、视频生成等关键操作必须自动监控
3. **错误即时响应**: 检测到错误立即自动分析
4. **自动生成报告**: 测试/监控完成后自动生成可追溯的报告
5. **用户友好提示**: 自动化运行时给用户清晰的反馈

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
