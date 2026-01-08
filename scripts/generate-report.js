#!/usr/bin/env node

/**
 * 报告生成脚本
 *
 * 用途：读取测试结果并生成可视化报告
 *
 * 使用方法：
 *   node scripts/generate-report.js
 *   node scripts/generate-report.js --format=html
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  resultsDir: path.join(__dirname, '../test-results'),
  outputDir: path.join(__dirname, '../test-results'),
  format: 'html'
};

/**
 * 读取测试结果
 */
function readResults() {
  const jsonPath = path.join(CONFIG.resultsDir, 'data.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error('测试结果不存在，请先运行测试');
  }

  const data = fs.readFileSync(jsonPath, 'utf8');
  return JSON.parse(data);
}

/**
 * 生成 HTML 报告
 */
function generateHTMLReport(results) {
  let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>提示词测试报告</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
        }

        .content {
            padding: 30px;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #667eea;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .metric {
            display: inline-block;
            padding: 8px 16px;
            margin: 5px;
            background: #e3f2fd;
            border-radius: 20px;
            font-size: 0.9em;
            color: #1976d2;
        }

        .metric.success {
            background: #e8f5e9;
            color: #388e3c;
        }

        .metric.warning {
            background: #fff3e0;
            color: #f57c00;
        }

        .metric.error {
            background: #ffebee;
            color: #d32f2f;
        }

        .version-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }

        .version-card h3 {
            color: #667eea;
            margin-bottom: 15px;
        }

        .test-item {
            padding: 10px;
            margin: 5px 0;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #ddd;
        }

        .test-item.pass {
            border-left-color: #4caf50;
        }

        .test-item.fail {
            border-left-color: #f44336;
        }

        .recommendation {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .recommendation h3 {
            margin-bottom: 10px;
        }

        .footer {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 0.9em;
        }

        .chart {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .bar {
            height: 30px;
            margin: 10px 0;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }

        .bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 提示词测试报告</h1>
            <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>

        <div class="content">
`;

  // 性能对比表
  html += `
            <div class="section">
                <h2>📊 性能对比</h2>
                <table>
                    <thead>
                        <tr>
                            <th>版本</th>
                            <th>平均 Token</th>
                            <th>平均响应时间</th>
                            <th>平均质量</th>
                            <th>通过率</th>
                        </tr>
                    </thead>
                    <tbody>
`;

  results.forEach(result => {
    const passRate = ((result.summary.passedTests / result.summary.totalTests) * 100).toFixed(0);
    const passRateClass = passRate >= 80 ? 'success' : passRate >= 60 ? 'warning' : 'error';

    html += `
                        <tr>
                            <td><strong>${result.version}</strong></td>
                            <td>${result.summary.avgTokens.toFixed(0)}</td>
                            <td>${result.summary.avgResponseTime.toFixed(0)}ms</td>
                            <td>${result.summary.avgQuality.toFixed(1)}/10</td>
                            <td><span class="metric ${passRateClass}">${passRate}%</span></td>
                        </tr>
    `;
  });

  html += `
                    </tbody>
                </table>
            </div>
`;

  // 版本详情
  html += `
            <div class="section">
                <h2>📝 版本详情</h2>
`;

  results.forEach(result => {
    html += `
                <div class="version-card">
                    <h3>${result.version}</h3>
                    <p><strong>通过率:</strong> ${result.summary.passedTests}/${result.summary.totalTests}</p>
                    <p><strong>平均 Token:</strong> ${result.summary.avgTokens.toFixed(0)}</p>
                    <p><strong>平均响应时间:</strong> ${result.summary.avgResponseTime.toFixed(0)}ms</p>
                    <p><strong>平均质量:</strong> ${result.summary.avgQuality.toFixed(1)}/10</p>
`;

    // 测试详情
    html += `
                    <div style="margin-top: 15px;">
                        <strong>测试结果:</strong>
`;

    result.tests.forEach(test => {
      const statusClass = test.success ? 'pass' : 'fail';
      const statusText = test.success ? '✅ 通过' : '❌ 失败';
      const input = test.original?.substring(0, 50) || 'N/A';

      html += `
                        <div class="test-item ${statusClass}">
                            <strong>${test.id || 'N/A'}</strong> - ${statusText}<br>
                            <small>输入: ${input}...</small>
                        </div>
    `;
    });

    html += `
                    </div>
                </div>
    `;
  });

  html += `
            </div>
`;

  // 推荐
  const bestVersion = results.reduce((best, current) => {
    const bestScore = best.summary.avgQuality;
    const currentScore = current.summary.avgQuality;
    return currentScore > bestScore ? current : best;
  });

  html += `
            <div class="section">
                <div class="recommendation">
                    <h3>⭐ 推荐</h3>
                    <p><strong>最优版本: ${bestVersion.version}</strong></p>
                    <p>平均质量: ${bestVersion.summary.avgQuality.toFixed(1)}/10</p>
                    <p>平均 Token: ${bestVersion.summary.avgTokens.toFixed(0)}</p>
                    <p>平均响应时间: ${bestVersion.summary.avgResponseTime.toFixed(0)}ms</p>
                    <p>通过率: ${((bestVersion.summary.passedTests / bestVersion.summary.totalTests) * 100).toFixed(0)}%</p>
                </div>
            </div>
`;

  html += `
        </div>

        <div class="footer">
            <p>WinJin AIGC - 自动化测试系统</p>
            <p>版本 v1.0.0 | 生成时间 ${new Date().toLocaleString('zh-CN')}</p>
        </div>
    </div>
</body>
</html>
`;

  return html;
}

/**
 * 保存报告
 */
function saveReport(html, format) {
  // 确保目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 保存报告
  const ext = format === 'html' ? 'html' : 'txt';
  const reportPath = path.join(CONFIG.outputDir, `report.${ext}`);

  fs.writeFileSync(reportPath, html);

  console.log(`\n✅ 报告已生成: ${reportPath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('📊 生成测试报告...\n');

  // 解析命令行参数
  const args = process.argv.slice(2);
  const formatArg = args.find(arg => arg.startsWith('--format='));
  const format = formatArg ? formatArg.split('=')[1] : CONFIG.format;

  // 读取测试结果
  const results = readResults();

  // 生成报告
  const html = generateHTMLReport(results);

  // 保存报告
  saveReport(html, format);

  console.log('\n✅ 报告生成完成！');
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 错误:', error);
    process.exit(1);
  });
}

module.exports = { main, generateHTMLReport };
