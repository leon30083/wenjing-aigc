#!/usr/bin/env node

/**
 * 提示词测试脚本
 *
 * 用途：自动化测试多个提示词版本的性能和质量
 *
 * 使用方法：
 *   node scripts/test-prompt.js --versions=v1.0,v1.1
 *   node scripts/test-prompt.js --versions=v1.0 --input="测试输入"
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  resultsDir: path.join(__dirname, '../test-results'),
  versions: ['v1.0', 'v1.1', 'v1.2'],
  baseline: 'v1.0',
  testCases: [
    {
      id: 'test-001',
      input: '一只可爱的猫咪在睡觉',
      description: '基础场景测试'
    },
    {
      id: 'test-002',
      input: '@test.user 在海边玩耍',
      description: '角色引用测试'
    },
    {
      id: 'test-003',
      input: '老鹰在山上飞翔，背景是日落',
      description: '复杂场景测试'
    }
  ]
};

/**
 * Token 计数器（简化版）
 */
function estimateTokens(text) {
  // 简单估算：英文 4 字符 ≈ 1 token，中文 1.5 字符 ≈ 1 token
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return Math.ceil(englishChars / 4 + chineseChars / 1.5);
}

/**
 * 模拟 API 调用
 */
async function mockOptimizePrompt(prompt, version) {
  const startTime = Date.now();

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // 模拟优化结果
  const optimized = {
    version,
    original: prompt,
    optimized: `[${version}] 优化后的提示词：${prompt}`,
    tokenCount: estimateTokens(prompt),
    responseTime: Date.now() - startTime,
    quality: 7 + Math.random() * 2 // 7-9 分
  };

  return optimized;
}

/**
 * 运行单个测试
 */
async function runTest(testCase, version) {
  console.log(`\n📝 测试 ${testCase.id} (${version})`);
  console.log(`   输入: ${testCase.input}`);

  try {
    const result = await mockOptimizePrompt(testCase.input, version);

    console.log(`   Token: ${result.tokenCount}`);
    console.log(`   响应时间: ${result.responseTime}ms`);
    console.log(`   质量: ${result.quality.toFixed(1)}/10`);

    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error(`   ❌ 错误: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(versions, testCases) {
  const results = [];

  for (const version of versions) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试版本: ${version}`);
    console.log('='.repeat(50));

    const versionResults = {
      version,
      tests: [],
      summary: {
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: 0,
        avgTokens: 0,
        avgResponseTime: 0,
        avgQuality: 0
      }
    };

    for (const testCase of testCases) {
      const result = await runTest(testCase, version);
      versionResults.tests.push(result);

      if (result.success) {
        versionResults.summary.passedTests++;
      } else {
        versionResults.summary.failedTests++;
      }
    }

    // 计算平均值
    const successfulTests = versionResults.tests.filter(t => t.success);
    if (successfulTests.length > 0) {
      versionResults.summary.avgTokens = successfulTests.reduce((sum, t) => sum + t.tokenCount, 0) / successfulTests.length;
      versionResults.summary.avgResponseTime = successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length;
      versionResults.summary.avgQuality = successfulTests.reduce((sum, t) => sum + t.quality, 0) / successfulTests.length;
    }

    results.push(versionResults);
  }

  return results;
}

/**
 * 生成 Markdown 报告
 */
function generateMarkdownReport(results) {
  let markdown = '# 提示词测试报告\n\n';
  markdown += `**测试时间**: ${new Date().toISOString()}\n`;
  markdown += `**测试版本**: ${results.map(r => r.version).join(', ')}\n`;
  markdown += `**基准版本**: ${CONFIG.baseline}\n\n`;

  // 性能对比表
  markdown += '## 性能对比\n\n';
  markdown += '| 版本 | Token 消耗 | 响应时间 | 优化质量 | 通过率 |\n';
  markdown += '|------|-----------|---------|---------|--------|\n';

  results.forEach(result => {
    const passRate = ((result.summary.passedTests / result.summary.totalTests) * 100).toFixed(0);
    markdown += `| ${result.version} | ${result.summary.avgTokens.toFixed(0)} | ${result.summary.avgResponseTime.toFixed(0)}ms | ${result.summary.avgQuality.toFixed(1)}/10 | ${passRate}% |\n`;
  });

  // 详细分析
  markdown += '\n## 详细分析\n\n';

  results.forEach(result => {
    markdown += `### ${result.version}\n\n`;
    markdown += `**通过率**: ${result.summary.passedTests}/${result.summary.totalTests}\n`;
    markdown += `**平均 Token**: ${result.summary.avgTokens.toFixed(0)}\n`;
    markdown += `**平均响应时间**: ${result.summary.avgResponseTime.toFixed(0)}ms\n`;
    markdown += `**平均质量**: ${result.summary.avgQuality.toFixed(1)}/10\n\n`;

    // 测试详情
    markdown += '#### 测试详情\n\n';
    markdown += '| 测试 ID | 输入 | Token | 响应时间 | 质量 | 状态 |\n';
    markdown += '|---------|------|-------|---------|------|------|\n';

    result.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const input = test.original?.substring(0, 30) || 'N/A';
      const tokens = test.tokenCount || 'N/A';
      const time = test.responseTime || 'N/A';
      const quality = test.quality ? test.quality.toFixed(1) : 'N/A';

      markdown += `| ${test.id || 'N/A'} | ${input}... | ${tokens} | ${time}ms | ${quality} | ${status} |\n`;
    });

    markdown += '\n';
  });

  // 推荐
  markdown += '## 推荐\n\n';

  const bestVersion = results.reduce((best, current) => {
    const bestScore = best.summary.avgQuality;
    const currentScore = current.summary.avgQuality;
    return currentScore > bestScore ? current : best;
  });

  markdown += `**最优版本**: ${bestVersion.version}\n\n`;
  markdown += `**推荐理由**:\n`;
  markdown += `- 平均质量最高: ${bestVersion.summary.avgQuality.toFixed(1)}/10\n`;
  markdown += `- 平均 Token: ${bestVersion.summary.avgTokens.toFixed(0)}\n`;
  markdown += `- 平均响应时间: ${bestVersion.summary.avgResponseTime.toFixed(0)}ms\n`;
  markdown += `- 通过率: ${((bestVersion.summary.passedTests / bestVersion.summary.totalTests) * 100).toFixed(0)}%\n`;

  return markdown;
}

/**
 * 保存结果
 */
function saveResults(results, markdown) {
  // 确保目录存在
  if (!fs.existsSync(CONFIG.resultsDir)) {
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
  }

  // 保存 JSON 数据
  const jsonPath = path.join(CONFIG.resultsDir, 'data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // 保存 Markdown 报告
  const mdPath = path.join(CONFIG.resultsDir, 'summary.md');
  fs.writeFileSync(mdPath, markdown);

  console.log(`\n✅ 结果已保存:`);
  console.log(`   - ${jsonPath}`);
  console.log(`   - ${mdPath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 启动提示词测试...\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  const versionsArg = args.find(arg => arg.startsWith('--versions='));
  const versions = versionsArg ? versionsArg.split('=')[1].split(',') : CONFIG.versions;

  console.log(`测试版本: ${versions.join(', ')}`);

  // 运行测试
  const results = await runAllTests(versions, CONFIG.testCases);

  // 生成报告
  const markdown = generateMarkdownReport(results);

  // 保存结果
  saveResults(results, markdown);

  console.log('\n✅ 测试完成！');
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
}

module.exports = { main, runAllTests, generateMarkdownReport };
