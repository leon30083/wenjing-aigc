# 持续学习系统

> **版本**: v1.0.0
> **更新日期**: 2026-01-18
> **核心理念**: 从错误中学习，持续改进

---

## 目录

- [学习机制](#学习机制)
- [错误模式识别](#错误模式识别)
- [规则自动生成](#规则自动生成)
- [知识图谱更新](#知识图谱更新)
- [效果追踪](#效果追踪)
- [改进报告](#改进报告)

---

## 学习机制

### 学习循环

```
┌─────────────────────────────────────────────────────────┐
│  1. 错误监控                                            │
│     ├─ Git Hook 检测                                    │
│     ├─ 测试失败分析                                     │
│     └─ 用户反馈收集                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  2. 模式识别                                            │
│     ├─ 错误分类                                         │
│     ├─ 根本原因分析                                     │
│     └─ 相似错误聚合                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  3. 规则生成                                            │
│     ├─ 约束规则生成                                     │
│     ├─ 预防措施生成                                     │
│     └─ 测试用例生成                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  4. 效果追踪                                            │
│     ├─ 错误率统计                                       │
│     ├─ 修复时间追踪                                     │
│     └─ 规则有效性评估                                   │
└─────────────────────────────────────────────────────────┘
```

### 自动学习触发条件

| 触发条件 | 动作 | 优先级 |
|---------|------|--------|
| Git commit 失败 | 分析错误，更新规则 | ⭐⭐⭐ |
| 测试失败 | 记录错误模式 | ⭐⭐⭐ |
| 代码审查发现问题 | 记录问题，生成规则 | ⭐⭐ |
| 用户报告错误 | 分析问题，更新文档 | ⭐⭐ |
| 每周总结 | 生成改进报告 | ⭐ |

---

## 错误模式识别

### 错误分类系统

```
错误分类层级:
├── 类型 (Type)
│   ├── API 相关
│   ├── React Flow 相关
│   ├── 角色系统相关
│   ├── 表单/输入相关
│   ├── 存储/持久化相关
│   └── UI/渲染相关
│
├── 严重程度 (Severity)
│   ├── ⭐⭐⭐ 关键 (Critical)
│   ├── ⭐⭐ 高 (High)
│   ├── ⭐ 中 (Medium)
│   └── 低 (Low)
│
└── 频率 (Frequency)
    ├── 持续发生 (Continuous)
    ├── 频繁发生 (Frequent)
    ├── 偶尔发生 (Occasional)
    └── 罕见 (Rare)
```

### 错误分析流程

```javascript
// scripts/analyze-error.js
class ErrorAnalyzer {
  analyze(error) {
    return {
      // 1. 识别类型
      type: this.identifyType(error),

      // 2. 评估严重程度
      severity: this.assessSeverity(error),

      // 3. 检查是否已知错误
      isKnown: this.isKnownError(error),

      // 4. 查找相似错误
      similarErrors: this.findSimilarErrors(error),

      // 5. 识别根本原因
      rootCause: this.identifyRootCause(error),

      // 6. 生成解决方案
      solution: this.generateSolution(error)
    };
  }

  identifyType(error) {
    if (error.message.includes('404')) return 'API';
    if (error.message.includes('undefined')) return 'React Flow';
    // ...
  }

  assessSeverity(error) {
    if (error.includes('API Key')) return '⭐⭐⭐';
    if (error.includes('timeout')) return '⭐⭐';
    // ...
  }

  isKnownError(error) {
    const knownErrors = loadKnownErrors();
    return knownErrors.some(known =>
      error.pattern === known.pattern
    );
  }

  findSimilarErrors(error) {
    const allErrors = loadAllErrors();
    return allErrors.filter(e =>
      similarity(error.message, e.message) > 0.8
    );
  }

  identifyRootCause(error) {
    // 分析调用栈
    // 分析代码上下文
    // 分析相关约束
  }

  generateSolution(error) {
    if (error.type === 'API' && error.message.includes('404')) {
      return {
        fix: '添加 /api/ 前缀',
        constraint: '#29: 禁止硬编码 API 端点',
        example: '✅ /api/video/create\n❌ /video/create'
      };
    }
  }
}
```

### 错误频率统计

```javascript
// scripts/error-frequency.js
class ErrorFrequencyTracker {
  track(error) {
    const key = this.generateKey(error);

    return {
      error: key,
      count: this.incrementCount(key),
      firstSeen: this.getFirstSeen(key),
      lastSeen: new Date(),
      frequency: this.calculateFrequency(key),
      trend: this.getTrend(key)
    };
  }

  calculateFrequency(key) {
    const occurrences = this.getOccurrences(key);
    const days = this.getDaysBetween(occurrences);
    return occurrences.length / days;  // 错误/天
  }

  getTrend(key) {
    const recent = this.getRecentOccurrences(key, 7);  // 最近7天
    const previous = this.getPreviousOccurrences(key, 7, 14);  // 7-14天前

    if (recent.length > previous.length) return 'increasing';
    if (recent.length < previous.length) return 'decreasing';
    return 'stable';
  }
}
```

---

## 规则自动生成

### 约束规则生成

```javascript
// scripts/generate-constraint.js
class ConstraintGenerator {
  generateFromError(error) {
    return {
      // 1. 约束编号
      id: this.getNextConstraintId(),

      // 2. 约束描述
      description: this.generateDescription(error),

      // 3. 错误示例
      wrongExample: this.extractWrongExample(error),

      // 4. 正确示例
      correctExample: this.generateCorrectExample(error),

      // 5. 相关错误
      relatedErrors: this.findRelatedErrors(error),

      // 6. 预防措施
      prevention: this.generatePrevention(error)
    };
  }

  generateDescription(error) {
    const action = error.rootCause.action;
    const consequence = error.rootCause.consequence;
    return `禁止${action}，会导致${consequence}`;
  }

  generateCorrectExample(error) {
    // 基于错误模式生成正确示例
    if (error.message.includes('/api/')) {
      return `fetch('/api/video/create')`;
    }
  }

  generatePrevention(error) {
    return [
      '代码审查检查点',
      'ESLint 规则',
      'Pre-commit Hook',
      '单元测试'
    ];
  }
}
```

### 测试用例生成

```javascript
// scripts/generate-test.js
class TestCaseGenerator {
  generateFromError(error) {
    return {
      describe: `${error.type} - ${error.description}`,
      test: {
        name: `应该防止${error.description}`,
        setup: this.generateSetup(error),
        action: this.generateAction(error),
        assertion: this.generateAssertion(error)
      }
    };
  }

  generateSetup(error) {
    // 生成测试前置条件
    return `
      // 模拟错误场景
      const mockApi = jest.fn(() =>
        Promise.resolve({ success: false })
      );
    `;
  }

  generateAction(error) {
    // 生成触发错误的操作
    return `
      await videoGenerate(prompt);
    `;
  }

  generateAssertion(error) {
    // 生成验证逻辑
    return `
      expect(mockApi).toHaveBeenCalledWith(
        expect.stringContaining('/api/')
      );
    `;
  }
}
```

---

## 知识图谱更新

### 自动更新机制

```javascript
// scripts/update-knowledge-graph.js
class KnowledgeGraphUpdater {
  update(error, analysis) {
    // 1. 创建错误实体
    this.createErrorEntity(error, analysis);

    // 2. 创建约束实体
    if (analysis.newConstraint) {
      this.createConstraintEntity(analysis.newConstraint);
    }

    // 3. 建立关系
    this.createRelations(error, analysis);

    // 4. 更新统计
    this.updateStatistics(error);
  }

  createErrorEntity(error, analysis) {
    await mcp__memory__create_entities({
      entities: [{
        name: `错误${error.id}: ${error.title}`,
        entityType: 'ErrorPattern',
        observations: [
          `类型: ${error.type}`,
          `严重程度: ${error.severity}`,
          `描述: ${error.description}`,
          `根本原因: ${analysis.rootCause}`,
          `解决方案: ${analysis.solution}`,
          `频率: ${analysis.frequency}`
        ]
      }]
    });
  }

  createConstraintEntity(constraint) {
    await mcp__memory__create_entities({
      entities: [{
        name: `约束${constraint.id}: ${constraint.description}`,
        entityType: 'Constraint',
        observations: [
          `描述: ${constraint.description}`,
          `错误示例: ${constraint.wrongExample}`,
          `正确示例: ${constraint.correctExample}`,
          `预防措施: ${constraint.prevention.join(', ')}`
        ]
      }]
    });
  }

  createRelations(error, analysis) {
    await mcp__memory__create_relations({
      relations: [
        {
          from: `错误${error.id}`,
          to: analysis.constraintId,
          relationType: 'prevented_by'
        },
        {
          from: `错误${error.id}`,
          to: error.type,
          relationType: 'belongs_to'
        },
        {
          from: `错误${error.id}`,
          to: error.relatedFile,
          relationType: 'located_in'
        }
      ]
    });
  }

  updateStatistics(error) {
    // 更新错误频率统计
    // 更新类型分布
    // 更新严重程度分布
  }
}
```

---

## 效果追踪

### 追踪指标

```javascript
// scripts/track-metrics.js
class MetricsTracker {
  getMetrics() {
    return {
      // 1. 错误率趋势
      errorRate: this.getErrorRateTrend(),

      // 2. 修复时间
      fixTime: this.getAverageFixTime(),

      // 3. 规则有效性
      ruleEffectiveness: this.getRuleEffectiveness(),

      // 4. 测试覆盖率
      testCoverage: this.getTestCoverage(),

      // 5. 知识图谱规模
      knowledgeGraphSize: this.getKnowledgeGraphSize()
    };
  }

  getErrorRateTrend() {
    // 计算错误率趋势（最近30天）
    const daily = this.getDailyErrorCount(30);
    return {
      current: daily[daily.length - 1],
      average: average(daily),
      trend: this.calculateTrend(daily)
    };
  }

  getAverageFixTime() {
    // 计算平均修复时间
    const errors = this.getFixedErrors();
    const fixTimes = errors.map(e =>
      e.fixedAt - e.createdAt
    );
    return average(fixTimes);
  }

  getRuleEffectiveness() {
    // 计算规则有效性
    const rules = this.getAllRules();
    return rules.map(rule => ({
      rule: rule.id,
      preventedCount: rule.preventedErrors.length,
      effectiveness: rule.preventedErrors.length / rule.totalEncounters
    }));
  }

  getTestCoverage() {
    // 获取测试覆盖率
    return {
      unit: this.getCoverage('unit'),
      integration: this.getCoverage('integration'),
      e2e: this.getCoverage('e2e')
    };
  }

  getKnowledgeGraphSize() {
    // 获取知识图谱规模
    return {
      entities: this.getEntityCount(),
      relations: this.getRelationCount(),
      errorPatterns: this.getErrorPatternCount(),
      constraints: this.getConstraintCount()
    };
  }
}
```

### Dashboard 展示

```javascript
// scripts/dashboard.js
class LearningDashboard {
  generateDashboard() {
    return {
      summary: this.getSummary(),
      trends: this.getTrends(),
      topErrors: this.getTopErrors(),
      recentImprovements: this.getRecentImprovements(),
      recommendations: this.getRecommendations()
    };
  }

  getSummary() {
    return {
      totalErrors: this.getTotalErrors(),
      activeErrors: this.getActiveErrors(),
      resolvedErrors: this.getResolvedErrors(),
      resolutionRate: this.getResolutionRate(),
      avgResolutionTime: this.getAvgResolutionTime()
    };
  }

  getTopErrors() {
    const errors = this.getAllErrors();
    return errors
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({
        id: error.id,
        title: error.title,
        count: error.count,
        severity: error.severity,
        trend: error.trend
      }));
  }

  getRecentImprovements() {
    const improvements = this.getImprovements(7);  // 最近7天
    return improvements.map(imp => ({
      date: imp.date,
      errorsResolved: imp.errorsResolved,
      rulesAdded: imp.rulesAdded,
      testsAdded: imp.testsAdded
    }));
  }

  getRecommendations() {
    const metrics = this.getMetrics();

    const recommendations = [];

    if (metrics.errorRate.trend === 'increasing') {
      recommendations.push({
        priority: 'high',
        action: '审查最近增加的错误',
        reason: '错误率呈上升趋势'
      });
    }

    if (metrics.testCoverage.unit < 70) {
      recommendations.push({
        priority: 'medium',
        action: '增加单元测试覆盖率',
        reason: `单元测试覆盖率仅为 ${metrics.testCoverage.unit}%`
      });
    }

    const lowEffectivenessRules = metrics.ruleEffectiveness
      .filter(r => r.effectiveness < 0.5);

    if (lowEffectivenessRules.length > 0) {
      recommendations.push({
        priority: 'low',
        action: '审查低效规则',
        reason: `${lowEffectivenessRules.length} 个规则有效性低于 50%`
      });
    }

    return recommendations;
  }
}
```

---

## 改进报告

### 周报生成

```javascript
// scripts/generate-weekly-report.js
class WeeklyReportGenerator {
  generateReport() {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();

    return {
      period: { start: weekStart, end: weekEnd },

      overview: this.getOverview(weekStart, weekEnd),

      errors: {
        new: this.getNewErrors(weekStart, weekEnd),
        resolved: this.getResolvedErrors(weekStart, weekEnd),
        top: this.getTopErrors(weekStart, weekEnd)
      },

      constraints: {
        added: this.getAddedConstraints(weekStart, weekEnd),
        effective: this.getMostEffectiveConstraints(weekStart, weekEnd)
      },

      tests: {
        added: this.getAddedTests(weekStart, weekEnd),
        coverage: this.getCoverageChange(weekStart, weekEnd)
      },

      knowledgeGraph: {
        entitiesAdded: this.getEntitiesAdded(weekStart, weekEnd),
        relationsAdded: this.getRelationsAdded(weekStart, weekEnd)
      },

      metrics: this.getMetricsChange(weekStart, weekEnd),

      recommendations: this.generateRecommendations()
    };
  }

  getOverview(weekStart, weekEnd) {
    const newErrors = this.getNewErrors(weekStart, weekEnd);
    const resolvedErrors = this.getResolvedErrors(weekStart, weekEnd);

    return {
      summary: `本周发现 ${newErrors.length} 个新错误，解决 ${resolvedErrors.length} 个错误`,
      netChange: newErrors.length - resolvedErrors.length,
      trend: this.getTrend(weekStart, weekEnd)
    };
  }

  getMostEffectiveConstraints(weekStart, weekEnd) {
    const constraints = this.getAllConstraints();
    return constraints
      .map(c => ({
        id: c.id,
        description: c.description,
        preventedCount: c.preventedErrors.filter(e =>
          isBetween(e.timestamp, weekStart, weekEnd)
        ).length
      }))
      .sort((a, b) => b.preventedCount - a.preventedCount)
      .slice(0, 5);
  }
}
```

### 月报生成

```javascript
// scripts/generate-monthly-report.js
class MonthlyReportGenerator extends WeeklyReportGenerator {
  generateReport() {
    const monthStart = getMonthStart();
    const monthEnd = getMonthEnd();

    return {
      period: { start: monthStart, end: monthEnd },

      overview: this.getOverview(monthStart, monthEnd),

      trends: {
        errorRate: this.getErrorRateTrend(monthStart, monthEnd),
        fixTime: this.getFixTimeTrend(monthStart, monthEnd),
        testCoverage: this.getCoverageTrend(monthStart, monthEnd)
      },

      topErrors: this.getTopErrorsOfMonth(monthStart, monthEnd),

      achievements: this.getAchievements(monthStart, monthEnd),

      challenges: this.getChallenges(monthStart, monthEnd),

      nextMonthGoals: this.generateGoals()
    };
  }

  getAchievements(monthStart, monthEnd) {
    return [
      {
        category: '错误管理',
        achievement: `解决了 ${this.getResolvedErrors(monthStart, monthEnd).length} 个错误`
      },
      {
        category: '规则完善',
        achievement: `新增 ${this.getAddedConstraints(monthStart, monthEnd).length} 条约束规则`
      },
      {
        category: '测试提升',
        achievement: `测试覆盖率达到 ${this.getCurrentCoverage()}%`
      }
    ];
  }

  getChallenges(monthStart, monthEnd) {
    const challenges = [];

    const topErrors = this.getTopErrorsOfMonth(monthStart, monthEnd);
    if (topErrors.length > 0) {
      challenges.push({
        issue: '高频错误',
        detail: topErrors[0].title,
        suggestion: '需要重点关注和解决'
      });
    }

    const lowCoverage = this.getLowCoverageAreas();
    if (lowCoverage.length > 0) {
      challenges.push({
        issue: '测试覆盖不足',
        detail: lowCoverage.join(', '),
        suggestion: '需要增加测试用例'
      });
    }

    return challenges;
  }

  generateGoals() {
    return [
      {
        category: '错误率',
        goal: '降低 20%',
        current: this.getCurrentErrorRate(),
        target: this.getCurrentErrorRate() * 0.8,
        actions: [
          '添加预防规则',
          '增加测试用例',
          '改进代码审查'
        ]
      },
      {
        category: '测试覆盖率',
        goal: '达到 80%',
        current: this.getCurrentCoverage(),
        target: 80,
        actions: [
          '为高频错误添加测试',
          '提高单元测试覆盖率',
          '增加集成测试'
        ]
      }
    ];
  }
}
```

---

## 最佳实践

### 1. 及时记录

```javascript
// ✅ 正确：发现错误立即记录
catch (error) {
  await errorTracker.record(error);
  await knowledgeGraphUpdater.update(error);
  throw error;  // 重新抛出
}

// ❌ 错误：先修复，后补记录
// 可能遗漏重要细节
```

### 2. 定期回顾

```bash
# 每周回顾
npm run learner:review:week

# 每月回顾
npm run learner:review:month

# 生成改进报告
npm run learner:report
```

### 3. 持续改进

```javascript
// 根据学习结果调整开发流程
if (metrics.errorRate.increasing) {
  // 增加代码审查频率
  // 添加更多自动化测试
  // 更新预防规则
}
```

---

## 参考文档

- [MCP 集成](./mcp-integration.md)
- [自动化测试](./auto-testing.md)
- [自动化架构](./automation-architecture.md)
- [错误模式](../04-error-patterns/errors-by-type.md)

---

**最后更新**: 2026-01-18
**维护者**: WinJin AIGC Team
**版本**: v1.0.0
