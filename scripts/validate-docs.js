#!/usr/bin/env node

/**
 * Documentation Validator
 *
 * 验证文档中提到的节点、文件路径都存在
 * 检查文档与代码的一致性
 *
 * 用法:
 *   node scripts/validate-docs.js              # 验证所有文档
 *   node scripts/validate-docs.js --fix        # 自动修复可修复的问题
 */

const fs = require('fs');
const path = require('path');

// 配置
const ROOT_DIR = path.join(__dirname, '..');
const RULES_DIR = path.join(ROOT_DIR, '.claude/rules');
const NODES_DIR = path.join(ROOT_DIR, 'src/client/src/nodes');
const REGISTRY_FILE = path.join(ROOT_DIR, '.claude/node-registry.json');

// 问题类型
const ISSUE_TYPES = {
  orphaned_node: {
    severity: 'error',
    message: '孤立的节点引用',
    autoFixable: true,
  },
  missing_file: {
    severity: 'warning',
    message: '文件不存在',
    autoFixable: false,
  },
  broken_link: {
    severity: 'error',
    message: '文档链接断裂',
    autoFixable: false,
  },
  naming_mismatch: {
    severity: 'error',
    message: '命名不一致',
    autoFixable: false,
  },
};

/**
 * 加载节点注册表
 */
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error('❌ 节点注册表不存在，请先运行: npm run registry:build');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
}

/**
 * 查找最接近的匹配节点
 */
function findClosestMatch(target, candidates) {
  const targetLower = target.toLowerCase();
  let closest = null;
  let minDistance = Infinity;

  candidates.forEach((candidate) => {
    const distance = levenshteinDistance(targetLower, candidate.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = candidate;
    }
  });

  return minDistance <= 3 ? closest : null;
}

/**
 * 计算编辑距离
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 验证单个文档文件
 */
function validateDocument(docPath, registry) {
  const issues = [];
  const content = fs.readFileSync(docPath, 'utf-8');
  const lines = content.split('\n');
  const nodeTypes = new Set(Object.keys(registry.nodes));

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 检查孤立节点引用 (NarratorProcessorNode, VideoNode 等)
    const nodeRefMatches = line.match(/\b([A-Z][a-zA-Z]*Node)\b/g) || [];

    nodeRefMatches.forEach((ref) => {
      const nodeType = ref.charAt(0).toLowerCase() + ref.slice(1);

      if (!nodeTypes.has(nodeType)) {
        const suggestion = findClosestMatch(nodeType, nodeTypes);

        issues.push({
          type: 'orphaned_node',
          severity: 'error',
          file: path.relative(ROOT_DIR, docPath),
          line: lineNum,
          reference: ref,
          correctNodeType: suggestion,
          message: `引用了不存在的节点: ${ref}`,
          suggestion: suggestion ? `应该是: ${suggestion} (${ref.replace(/Node$/, 'Node')})` : '无建议',
        });
      }
    });

    // 检查代码块中的文件路径引用
    const pathMatches = line.match(/src\/[a-zA-Z\/_\.-]+\.(?:js|jsx|ts|tsx)/g) || [];
    pathMatches.forEach((filePath) => {
      const fullPath = path.join(ROOT_DIR, filePath);
      if (!fs.existsSync(fullPath)) {
        issues.push({
          type: 'missing_file',
          severity: 'warning',
          file: path.relative(ROOT_DIR, docPath),
          line: lineNum,
          reference: filePath,
          message: `引用的文件不存在: ${filePath}`,
        });
      }
    });

    // 检查文档内部链接
    const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+\.md)\)/g) || [];
    linkMatches.forEach((link) => {
      const match = link.match(/\[([^\]]+)\]\(([^)]+\.md)\)/);
      if (match) {
        const [, label, targetPath] = match;
        const targetFullPath = path.join(path.dirname(docPath), targetPath);

        if (!fs.existsSync(targetFullPath)) {
          issues.push({
            type: 'broken_link',
            severity: 'error',
            file: path.relative(ROOT_DIR, docPath),
            line: lineNum,
            reference: targetPath,
            message: `文档链接断裂: ${targetPath}`,
          });
        }
      }
    });
  });

  return issues;
}

/**
 * 自动修复孤立节点引用
 */
function fixOrphanedNodes(docPath, issues) {
  let content = fs.readFileSync(docPath, 'utf-8');
  let fixedCount = 0;

  issues.forEach((issue) => {
    if (issue.type !== 'orphaned_node' || !issue.correctNodeType) {
      return;
    }

    const wrongRef = issue.reference;
    const correctRef = wrongRef.replace(/Node$/, 'Node'); // 保持大小写

    // 全局替换（简化版，实际应该更精确）
    const regex = new RegExp(`\\b${wrongRef}\\b`, 'g');
    const newContent = content.replace(regex, correctRef);

    if (newContent !== content) {
      content = newContent;
      fixedCount++;
      console.log(`  ✏️  修复: ${wrongRef} → ${correctRef} (行 ${issue.line})`);
    }
  });

  if (fixedCount > 0) {
    fs.writeFileSync(docPath, content, 'utf-8');
    console.log(`  ✅ 已修复 ${fixedCount} 个问题`);
  }

  return fixedCount;
}

/**
 * 验证所有文档
 */
function validateAllDocs(autoFix = false) {
  console.log('🔍 开始验证文档...\n');

  // 加载节点注册表
  const registry = loadRegistry();
  console.log(`✅ 已加载节点注册表 (${registry.summary.total} 个节点)\n`);

  // 查找所有要验证的文档
  const docFiles = fs.readdirSync(RULES_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(RULES_DIR, file));

  console.log(`📋 找到 ${docFiles.length} 个文档文件\n`);

  let totalIssues = 0;
  let errorCount = 0;
  let warningCount = 0;
  const allIssues = [];

  // 验证每个文档
  docFiles.forEach((docPath) => {
    const fileName = path.basename(docPath);
    console.log(`🔍 检查 ${fileName}...`);

    const issues = validateDocument(docPath, registry);

    if (issues.length > 0) {
      console.log(`  ❌ 发现 ${issues.length} 个问题:`);
      issues.forEach((issue) => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️ ';
        console.log(`    ${icon} ${issue.file}:${issue.line}`);
        console.log(`       ${issue.message}`);
        if (issue.suggestion) {
          console.log(`       💡 ${issue.suggestion}`);
        }
      });

      allIssues.push({ docPath, issues });
      totalIssues += issues.length;
      errorCount += issues.filter((i) => i.severity === 'error').length;
      warningCount += issues.filter((i) => i.severity === 'warning').length;
    } else {
      console.log(`  ✅ 无问题`);
    }

    console.log('');
  });

  // 输出摘要
  console.log('📊 验证摘要:');
  console.log(`  总问题数: ${totalIssues}`);
  console.log(`  错误: ${errorCount}`);
  console.log(`  警告: ${warningCount}`);

  // 自动修复
  if (autoFix) {
    console.log('\n🔧 尝试自动修复...\n');
    let totalFixed = 0;

    allIssues.forEach(({ docPath, issues }) => {
      const fixableIssues = issues.filter((i) => ISSUE_TYPES[i.type]?.autoFixable);
      if (fixableIssues.length > 0) {
        console.log(`📝 修复 ${path.basename(docPath)}...`);
        totalFixed += fixOrphanedNodes(docPath, fixableIssues);
      }
    });

    if (totalFixed > 0) {
      console.log(`\n✅ 共修复 ${totalFixed} 个问题`);
    } else {
      console.log('\n⚠️  没有可自动修复的问题');
    }
  }

  // 返回验证结果
  if (errorCount > 0) {
    console.log(`\n❌ 文档验证失败 (发现 ${errorCount} 个错误)`);
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`\n⚠️  文档验证通过 (但有 ${warningCount} 个警告)`);
    process.exit(0);
  } else {
    console.log('\n✅ 文档验证通过');
    process.exit(0);
  }
}

// CLI 入口
const args = process.argv.slice(2);
const autoFix = args.includes('--fix') || args.includes('-f');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log('用法:');
  console.log('  node scripts/validate-docs.js          # 验证所有文档');
  console.log('  node scripts/validate-docs.js --fix    # 自动修复可修复的问题');
  console.log('  npm run validate:docs                  # 验证所有文档');
  console.log('  npm run validate:docs -- --fix         # 自动修复');
  process.exit(0);
}

// 默认执行验证
validateAllDocs(autoFix);
