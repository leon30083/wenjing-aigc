#!/usr/bin/env node
/**
 * 验证指标收集器
 *
 * 功能：
 * - 收集每次验证的结果
 * - 存储到 JSON 文件
 * - 计算错误趋势
 * - 生成质量报告
 *
 * 使用方法:
 *   node scripts/metrics/metrics-collector.js --trend    # 查看趋势报告
 *   node scripts/metrics/metrics-collector.js --clear    # 清空指标
 *   node scripts/metrics/metrics-collector.js --cleanup  # 清理过期数据
 */

const metricsStorage = require('./metrics-storage');

/**
 * 从验证输出中提取指标
 * @param {string} output - 验证脚本输出
 * @param {string} type - 验证类型
 * @returns {Object} 提取的指标
 */
function extractMetrics(output, type) {
  const metrics = {
    type,
    timestamp: new Date().toISOString(),
    summary: {
      total: 0,
      errors: 0,
      warnings: 0
    },
    details: []
  };

  // 提取错误数量
  const errorMatches = output.match(/错误:\s*(\d+)/g);
  if (errorMatches) {
    errorMatches.forEach(match => {
      const count = parseInt(match.match(/\d+/)[0]);
      metrics.summary.errors += count;
    });
  }

  // 提取警告数量
  const warningMatches = output.match(/警告:\s*(\d+)/g);
  if (warningMatches) {
    warningMatches.forEach(match => {
      const count = parseInt(match.match(/\d+/)[0]);
      metrics.summary.warnings += count;
    });
  }

  // 提取节点数量（如果有）
  const nodeMatch = output.match(/节点数量:\s*(\d+)/);
  if (nodeMatch) {
    metrics.summary.total = parseInt(nodeMatch[1]);
  }

  // 提取文件数量（如果有）
  const fileMatch = output.match(/找到\s*(\d+)\s*个节点文件/);
  if (fileMatch) {
    metrics.summary.total = Math.max(metrics.summary.total, parseInt(fileMatch[1]));
  }

  return metrics;
}

/**
 * 生成趋势报告
 */
function generateTrendReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📈 验证指标趋势报告');
  console.log('='.repeat(70));

  const metrics = metricsStorage.getMetrics();
  const byType = metricsStorage.getMetricsByType();
  const byDate = metricsStorage.getMetricsByDate();
  const trends = metricsStorage.getTrends();
  const history = metricsStorage.getHistory(10);

  console.log(`\n📊 总体统计:`);
  console.log(`   总运行次数: ${metrics.totalRuns}`);
  console.log(`   数据收集时间: ${metrics.createdAt} - ${metrics.lastUpdated}`);

  // 按类型统计
  console.log(`\n📋 按类型统计:`);
  const types = Object.keys(byType);
  if (types.length === 0) {
    console.log('   暂无数据');
  } else {
    types.forEach(type => {
      const stats = byType[type];
      console.log(`\n   ${type}:`);
      console.log(`     运行次数: ${stats.total}`);
      console.log(`     错误数: ${stats.errors}`);
      console.log(`     警告数: ${stats.warnings}`);
      if (stats.total > 0) {
        console.log(`     平均错误/次: ${(stats.errors / stats.total).toFixed(2)}`);
        console.log(`     平均警告/次: ${(stats.warnings / stats.total).toFixed(2)}`);
      }
      console.log(`     最后运行: ${stats.lastRun ? new Date(stats.lastRun).toLocaleString('zh-CN') : 'N/A'}`);
    });
  }

  // 按日期统计（最近 7 天）
  console.log(`\n📅 最近 7 天统计:`);
  const dates = Object.keys(byDate).sort().slice(-7);
  if (dates.length === 0) {
    console.log('   暂无数据');
  } else {
    dates.forEach(date => {
      const stats = byDate[date];
      console.log(`\n   ${date}:`);
      console.log(`     运行次数: ${stats.total}`);
      console.log(`     错误数: ${stats.errors}`);
      console.log(`     警告数: ${stats.warnings}`);
    });
  }

  // 趋势分析
  console.log(`\n📈 趋势分析:`);
  if (history.length >= 2) {
    const trendMap = {
      improving: '✅ 改善中',
      worsening: '⚠️ 需要关注',
      stable: '➡️ 稳定'
    };
    console.log(`   趋势: ${trendMap[trends.trend] || trends.trend}`);
    console.log(`   改善次数: ${trends.improving}`);
    console.log(`   恶化次数: ${trends.worsening}`);
    console.log(`   稳定次数: ${trends.stable}`);
  } else {
    console.log('   数据不足，无法分析趋势');
  }

  // 最近 10 次运行
  if (history.length > 0) {
    console.log(`\n📜 最近 ${history.length} 次运行:`);
    console.log('-'.repeat(70));
    history.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleString('zh-CN');
      console.log(`   ${index + 1}. [${entry.type}] ${time}`);
      console.log(`      总数: ${entry.summary.total}, 错误: ${entry.summary.errors}, 警告: ${entry.summary.warnings}`);
    });
  }

  console.log('='.repeat(70));
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('\n用法:');
  console.log('  node scripts/metrics/metrics-collector.js --trend    # 查看趋势报告');
  console.log('  node scripts/metrics/metrics-collector.js --clear    # 清空所有指标');
  console.log('  node scripts/metrics/metrics-collector.js --cleanup  # 清理过期数据（30天前）');
  console.log('  node scripts/metrics/metrics-collector.js --export   # 导出指标为 JSON');
  console.log('');
  console.log('在验证脚本中使用:');
  console.log('  const metricsStorage = require("./scripts/metrics/metrics-storage");');
  console.log('  metricsStorage.recordValidation({');
  console.log('    type: "validate:registry",');
  console.log('    totalNodes: 16,');
  console.log('    errorCount: 0,');
  console.log('    warningCount: 0');
  console.log('  });');
  console.log('');
}

// CLI 入口
const args = process.argv.slice(2);

if (args.includes('--trend')) {
  generateTrendReport();
} else if (args.includes('--clear')) {
  if (metricsStorage.clear()) {
    console.log('✅ 指标已清空');
  } else {
    console.error('❌ 清空指标失败');
    process.exit(1);
  }
} else if (args.includes('--cleanup')) {
  if (metricsStorage.cleanup()) {
    console.log('✅ 已清理过期数据（30天前）');
  } else {
    console.error('❌ 清理失败');
    process.exit(1);
  }
} else if (args.includes('--export')) {
  const metrics = metricsStorage.getMetrics();
  console.log(JSON.stringify(metrics, null, 2));
} else if (args.includes('--help') || args.includes('-h')) {
  showUsage();
} else {
  console.log('验证指标收集器 v1.0.0');
  console.log('');
  console.log('使用 --help 查看使用说明');
  console.log('');
}

// 导出函数供其他模块使用
module.exports = {
  extractMetrics,
  generateTrendReport,
  showUsage
};

