#!/usr/bin/env node
/**
 * WinJin 自动修复工具 ⭐ Phase 3 核心
 *
 * 功能：
 * - 扫描可自动修复的问题
 * - 应用修复策略
 * - 生成修复报告
 * - 支持干运行模式（dry-run）
 *
 * 使用方法:
 *   node scripts/auto-fix.js --scan                # 扫描可修复的问题
 *   node scripts/auto-fix.js --fix                 # 应用所有修复
 *   node scripts/auto-fix.js --fix=orphaned_node   # 修复特定错误
 *   node scripts/auto-fix.js --dry-run             # 干运行（不实际修改）
 *   node scripts/auto-fix.js --backup              # 修复前备份
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置文件路径
const FIX_STRATEGIES_PATH = path.join(__dirname, 'fix-strategies.json');
const FIXERS_DIR = path.join(__dirname, 'fixers');

// 加载修复策略
let fixStrategies;
try {
  fixStrategies = JSON.parse(fs.readFileSync(FIX_STRATEGIES_PATH, 'utf8'));
} catch (error) {
  console.error(`❌ 无法加载修复策略配置: ${error.message}`);
  process.exit(1);
}

/**
 * 运行所有验证脚本
 */
function runAllValidations() {
  const results = [];

  try {
    // 运行节点注册表验证
    console.log('🔍 运行节点注册表验证...');
    try {
      execSync('node scripts/validate-registry.js', { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      results.push({
        type: 'registry',
        errorId: 'registry-error',
        file: null,
        line: null,
        severity: 'error',
        summary: '节点注册表验证失败',
        details: error.stdout || error.stderr
      });
    }

    // 运行节点语法验证
    console.log('🔍 运行节点语法验证...');
    try {
      const output = execSync('node scripts/validate-nodes.js', { encoding: 'utf8', stdio: 'pipe' });
      // 解析输出中的错误
      const lines = output.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('错误:') || line.includes('Error')) {
          results.push({
            type: 'syntax',
            errorId: `syntax-${index}`,
            file: null,
            line: null,
            severity: 'error',
            summary: line.trim(),
            details: output
          });
        }
      });
    } catch (error) {
      results.push({
        type: 'syntax',
        errorId: 'syntax-error',
        file: null,
        line: null,
        severity: 'error',
        summary: '节点语法验证失败',
        details: error.stdout || error.stderr
      });
    }

    // 运行文档验证
    console.log('🔍 运行文档验证...');
    try {
      const output = execSync('node scripts/validate-docs.js', { encoding: 'utf8', stdio: 'pipe' });
      // 解析孤立节点引用
      const orphanMatch = output.match(/孤立节点引用:\s*(.+)/);
      if (orphanMatch) {
        const orphanNodes = orphanMatch[1].split(',').map(n => n.trim());
        orphanNodes.forEach(node => {
          results.push({
            type: 'orphaned_node',
            errorId: `orphaned-${node}`,
            file: null,
            line: null,
            severity: 'warning',
            summary: `孤立节点引用: ${node}`,
            details: `文档中引用了不存在的节点: ${node}`
          });
        });
      }
    } catch (error) {
      // 文档验证失败可能是可以修复的问题
      const output = error.stdout || error.stderr || '';
      if (output.includes('孤立节点')) {
        const orphanMatch = output.match(/孤立节点引用:\s*(.+)/);
        if (orphanMatch) {
          const orphanNodes = orphanMatch[1].split(',').map(n => n.trim());
          orphanNodes.forEach(node => {
            results.push({
              type: 'orphaned_node',
              errorId: `orphaned-${node}`,
              file: null,
              line: null,
              severity: 'warning',
              summary: `孤立节点引用: ${node}`,
              details: `文档中引用了不存在的节点: ${node}`
            });
          });
        }
      }
    }

    // 运行数据流验证
    console.log('🔍 运行数据流验证...');
    try {
      const output = execSync('node scripts/validate-data-flow.js', { encoding: 'utf8', stdio: 'pipe' });
      // 解析数据流问题
      const lines = output.split('\n');
      let currentIssue = null;
      lines.forEach((line, index) => {
        if (line.includes('警告:') || line.includes('错误:')) {
          if (currentIssue) {
            results.push(currentIssue);
          }
          currentIssue = {
            type: line.includes('依赖缺失') ? 'missing_dependency' : 'source_not_writing',
            errorId: `dataflow-${index}`,
            file: null,
            line: null,
            severity: line.includes('警告') ? 'warning' : 'error',
            summary: line.trim(),
            details: ''
          };
        } else if (currentIssue) {
          currentIssue.details += line + '\n';
        }
      });
      if (currentIssue) {
        results.push(currentIssue);
      }
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const lines = output.split('\n');
      let currentIssue = null;
      lines.forEach((line, index) => {
        if (line.includes('警告:') || line.includes('错误:')) {
          if (currentIssue) {
            results.push(currentIssue);
          }
          currentIssue = {
            type: line.includes('依赖缺失') ? 'missing_dependency' : 'source_not_writing',
            errorId: `dataflow-${index}`,
            file: null,
            line: null,
            severity: line.includes('警告') ? 'warning' : 'error',
            summary: line.trim(),
            details: ''
          };
        } else if (currentIssue) {
          currentIssue.details += line + '\n';
        }
      });
      if (currentIssue) {
        results.push(currentIssue);
      }
    }

  } catch (error) {
    console.error(`❌ 运行验证时出错: ${error.message}`);
  }

  return results;
}

/**
 * 扫描可修复的问题
 */
function scanFixableIssues() {
  console.log('🔍 扫描可修复的问题...\n');

  const issues = [];
  const validationResults = runAllValidations();

  // 筛选可修复的问题
  validationResults.forEach(result => {
    const strategy = fixStrategies.strategies[result.type];
    if (strategy && strategy.autoFixable) {
      issues.push({
        id: result.errorId || `${result.type}-${Date.now()}`,
        type: result.type,
        file: result.file,
        line: result.line,
        severity: result.severity,
        summary: result.summary,
        details: result.details,
        strategy: strategy,
        confidence: strategy.confidence || 50
      });
    }
  });

  return issues;
}

/**
 * 备份文件
 */
function backupFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  const backupPath = filePath + '.bak';
  try {
    fs.copyFileSync(filePath, backupPath);
    return true;
  } catch (error) {
    console.error(`   ❌ 备份失败: ${error.message}`);
    return false;
  }
}

/**
 * 应用修复
 */
function applyFixes(issues, options = {}) {
  const results = {
    total: issues.length,
    fixed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  console.log(`\n🔧 开始修复 ${issues.length} 个问题...\n`);

  issues.forEach((issue, index) => {
    console.log(`[${index + 1}/${issues.length}] ${issue.summary}`);
    console.log(`   类型: ${issue.type}`);
    console.log(`   策略: ${issue.strategy.name}`);
    console.log(`   置信度: ${issue.confidence}%`);

    // 干运行模式
    if (options.dryRun) {
      console.log(`   [DRY RUN] 将应用修复`);
      results.details.push({ ...issue, status: 'dry-run' });
      results.fixed++;
      console.log('');
      return;
    }

    // 需要用户确认
    if (issue.strategy.requiresUserConfirmation && !options.force) {
      console.log(`   ⚠️  此修复需要用户确认`);
      console.log(`   原因: ${issue.strategy.reason || '可能影响其他功能'}`);
      results.details.push({ ...issue, status: 'skipped', reason: 'requires confirmation' });
      results.skipped++;
      console.log(`   ⏭️  已跳过（使用 --force 强制应用）\n`);
      return;
    }

    // 备份
    if (options.backup && issue.file) {
      const backupSuccess = backupFile(issue.file);
      if (backupSuccess) {
        console.log(`   💾 已备份: ${issue.file}.bak`);
      }
    }

    // 应用修复
    try {
      const fixerPath = path.join(FIXERS_DIR, issue.strategy.fixer);
      if (!fs.existsSync(fixerPath)) {
        console.log(`   ❌ 修复器不存在: ${fixerPath}`);
        results.failed++;
        results.details.push({ ...issue, status: 'failed', error: 'Fixer not found' });
        console.log('');
        return;
      }

      const fixer = require(fixerPath);
      const fixResult = fixer.fix(issue);

      if (fixResult.success) {
        results.fixed++;
        results.details.push({ ...issue, status: 'fixed', changes: fixResult.changes });
        console.log(`   ✅ 修复成功 (${fixResult.changes || 0} 处变更)`);
      } else {
        results.failed++;
        results.details.push({ ...issue, status: 'failed', error: fixResult.error });
        console.log(`   ❌ 修复失败: ${fixResult.error || 'Unknown error'}`);
      }
    } catch (error) {
      results.failed++;
      results.details.push({ ...issue, status: 'failed', error: error.message });
      console.log(`   ❌ 修复失败: ${error.message}`);
    }

    console.log('');
  });

  return results;
}

/**
 * 生成修复报告
 */
function generateFixReport(results, options = {}) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 修复报告');
  console.log('='.repeat(70));
  console.log(`总计:     ${results.total}`);
  console.log(`✅ 已修复: ${results.fixed}`);
  console.log(`❌ 失败:   ${results.failed}`);
  console.log(`⏭️  跳过:   ${results.skipped}`);
  console.log('='.repeat(70));

  // JSON 输出
  if (options.outputFormat === 'json') {
    console.log('\n' + JSON.stringify(results, null, 2));
  }

  // 保存到文件
  if (options.outputFile) {
    try {
      fs.writeFileSync(options.outputFile, JSON.stringify(results, null, 2), 'utf8');
      console.log(`\n💾 报告已保存: ${options.outputFile}`);
    } catch (error) {
      console.error(`\n❌ 保存报告失败: ${error.message}`);
    }
  }

  // 详细信息
  if (options.verbose && results.details.length > 0) {
    console.log('\n详细修复结果:');
    console.log('-'.repeat(70));
    results.details.forEach((detail, index) => {
      console.log(`${index + 1}. ${detail.summary} - ${detail.status}`);
      if (detail.error) {
        console.log(`   错误: ${detail.error}`);
      }
      if (detail.reason) {
        console.log(`   原因: ${detail.reason}`);
      }
    });
    console.log('-'.repeat(70));
  }
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('\n用法:');
  console.log('  node scripts/auto-fix.js --scan                    # 扫描可修复的问题');
  console.log('  node scripts/auto-fix.js --fix                     # 应用所有修复');
  console.log('  node scripts/auto-fix.js --fix=<strategy>          # 修复特定错误类型');
  console.log('  node scripts/auto-fix.js --fix --dry-run          # 干运行（不实际修改）');
  console.log('  node scripts/auto-fix.js --fix --backup            # 修复前备份');
  console.log('  node scripts/auto-fix.js --fix --force             # 强制应用（跳过确认）');
  console.log('  node scripts/auto-fix.js --fix --output=json       # JSON 格式输出');
  console.log('  node scripts/auto-fix.js --fix --output=report.json # 保存报告到文件');
  console.log('  node scripts/auto-fix.js --fix --verbose           # 显示详细信息');
  console.log('\n修复策略:');
  Object.entries(fixStrategies.strategies).forEach(([key, strategy]) => {
    const fixable = strategy.autoFixable ? '✅ 可修复' : '❌ 不可修复';
    const risk = strategy.risk ? ` [${strategy.risk.toUpperCase()}]` : '';
    console.log(`  - ${strategy.name}${risk}: ${fixable}`);
  });
  console.log('');
}

// CLI 入口
const args = process.argv.slice(2);
const options = {
  scan: args.includes('--scan'),
  fix: args.includes('--fix'),
  fixType: args.find(a => a.startsWith('--fix='))?.split('=')[1],
  dryRun: args.includes('--dry-run'),
  backup: args.includes('--backup'),
  force: args.includes('--force'),
  verbose: args.includes('--verbose'),
  outputFormat: args.includes('--output=json') ? 'json' : 'text',
  outputFile: args.find(a => a.startsWith('--output='))?.split('=')[1] || null
};

async function main() {
  console.log('🔧 WinJin 自动修复工具 v1.0.0');
  console.log('='.repeat(70));

  if (options.scan) {
    const issues = scanFixableIssues();
    console.log(`\n找到 ${issues.length} 个可修复的问题\n`);

    if (issues.length === 0) {
      console.log('✅ 没有发现可修复的问题');
    } else {
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.id}`);
        console.log(`   ${issue.summary}`);
        console.log(`   修复策略: ${issue.strategy.name}`);
        console.log(`   置信度: ${issue.confidence}%`);
        if (issue.strategy.requiresUserConfirmation) {
          console.log(`   ⚠️  需要用户确认: ${issue.strategy.reason || '可能影响其他功能'}`);
        }
        console.log('');
      });
    }
  } else if (options.fix || options.fixType) {
    const issuesToFix = options.fixType
      ? scanFixableIssues().filter(i => i.type === options.fixType)
      : scanFixableIssues();

    if (issuesToFix.length === 0) {
      console.log('\n✅ 没有需要修复的问题');
      return;
    }

    const results = applyFixes(issuesToFix, {
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force
    });

    generateFixReport(results, options);

    if (results.failed > 0) {
      process.exit(1);
    }
  } else {
    showUsage();
  }
}

main().catch(error => {
  console.error('❌ 错误:', error.message);
  console.error(error.stack);
  process.exit(1);
});
