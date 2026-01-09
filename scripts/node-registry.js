#!/usr/bin/env node

/**
 * Node Registry Builder
 *
 * 自动发现所有 React Flow 节点，生成节点注册表 JSON
 *
 * 用法:
 *   node scripts/node-registry.js --build     # 构建注册表
 *   node scripts/node-registry.js --check     # 检查节点一致性
 *   node scripts/node-registry.js --list      # 列出所有节点
 */

const fs = require('fs');
const path = require('path');

// 配置
const NODES_DIR = path.join(__dirname, '../src/client/src/nodes');
const REGISTRY_FILE = path.join(__dirname, '../.claude/node-registry.json');
const RULES_DIR = path.join(__dirname, '../.claude/rules');

// 节点类型分类
const NODE_CATEGORIES = {
  input: '输入节点',
  process: '处理节点',
  output: '输出节点',
};

/**
 * 递归查找所有节点文件
 */
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 从文件名提取节点类型标识符
 * 例如: VideoGenerateNode.jsx -> videoGenerateNode
 */
function extractNodeType(fileName) {
  const baseName = path.basename(fileName, path.extname(fileName));
  // 首字母小写
  return baseName.charAt(0).toLowerCase() + baseName.slice(1);
}

/**
 * 从文件内容提取节点元数据
 */
function extractNodeMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const nodeType = extractNodeType(fileName);
  const relativePath = path.relative(__dirname, filePath);

  // 提取分类 (input/process/output)
  const categoryMatch = filePath.match(/nodes\/(input|process|output)\//);
  const category = categoryMatch ? categoryMatch[1] : null;

  // 提取 Handle 定义
  const targetHandles = [];
  const sourceHandles = [];

  // 匹配 type="target" 的 Handle
  const targetHandleRegex = /type\s*=\s*['"](target|source)['"]\s+id\s*=\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = targetHandleRegex.exec(content)) !== null) {
    if (match[1] === 'target') {
      targetHandles.push(match[2]);
    } else {
      sourceHandles.push(match[3]);
    }
  }

  // 提取默认导出的组件名
  const exportMatch = content.match(/export\s+default\s+(\w+)/);
  const componentName = exportMatch ? exportMatch[1] : null;

  // 提取节点标签
  const labelMatch = content.match(/label\s*[:=]\s*['"]([^'"]+)['"]/);
  const label = labelMatch ? labelMatch[1] : null;

  return {
    nodeType,
    fileName,
    filePath: relativePath.replace(/^..\//, ''), // 移除开头的 ../
    absolutePath: path.resolve(filePath),
    category,
    componentName,
    label,
    handles: {
      inputs: targetHandles,
      outputs: sourceHandles,
    },
    exists: true,
  };
}

/**
 * 检查文档中的节点引用
 */
function checkDocumentationReferences(registry) {
  const issues = [];
  const nodeTypes = new Set(Object.keys(registry.nodes));

  // 要检查的文档文件
  const docFiles = [
    path.join(RULES_DIR, 'error-patterns.md'),
    path.join(RULES_DIR, 'code.md'),
    path.join(RULES_DIR, 'base.md'),
    path.join(RULES_DIR, 'reactflow.md'),
  ];

  docFiles.forEach((docPath) => {
    if (!fs.existsSync(docPath)) return;

    const content = fs.readFileSync(docPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // 查找可能的节点引用 (Node.jsx, nodeType 等)
      const nodeRefMatches = line.match(/\b([A-Z][a-zA-Z]*Node)\b/g) || [];

      nodeRefMatches.forEach((ref) => {
        // 转换为 nodeType 格式 (首字母小写)
        const nodeType = ref.charAt(0).toLowerCase() + ref.slice(1);

        if (!nodeTypes.has(nodeType)) {
          issues.push({
            type: 'orphaned_node',
            file: path.relative(__dirname, docPath),
            line: index + 1,
            reference: ref,
            suggestion: findClosestMatch(nodeType, nodeTypes),
          });
        }
      });
    });
  });

  return issues;
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
 * 构建节点注册表
 */
function buildRegistry() {
  console.log('🔍 开始扫描节点...\n');

  // 查找所有节点文件
  const nodeFiles = findNodeFiles(NODES_DIR);
  console.log(`📁 找到 ${nodeFiles.length} 个节点文件\n`);

  // 提取元数据
  const registry = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    nodes: {},
    summary: {
      byCategory: {},
      total: 0,
    },
  };

  nodeFiles.forEach((filePath) => {
    try {
      const metadata = extractNodeMetadata(filePath);
      registry.nodes[metadata.nodeType] = metadata;
      registry.summary.total++;

      // 按分类统计
      if (metadata.category) {
        registry.summary.byCategory[metadata.category] =
          (registry.summary.byCategory[metadata.category] || 0) + 1;
      }

      console.log(`  ✓ ${metadata.nodeType} (${metadata.category || '未知'})`);
    } catch (error) {
      console.error(`  ❌ 处理失败: ${filePath}`, error.message);
    }
  });

  // 保存注册表
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  console.log(`\n💾 注册表已保存: ${REGISTRY_FILE}\n`);

  // 检查文档引用
  console.log('🔍 检查文档中的节点引用...\n');
  const docIssues = checkDocumentationReferences(registry);

  if (docIssues.length > 0) {
    console.log(`⚠️  发现 ${docIssues.length} 个问题:\n`);
    docIssues.forEach((issue) => {
      console.log(`  ❌ ${issue.file}:${issue.line}`);
      console.log(`     引用了不存在的节点: ${issue.reference}`);
      if (issue.suggestion) {
        console.log(`     建议: ${issue.suggestion}`);
      }
      console.log('');
    });
  } else {
    console.log('✅ 所有文档引用都有效\n');
  }

  // 输出摘要
  console.log('📊 节点统计:');
  console.log(`  总计: ${registry.summary.total} 个节点`);
  Object.entries(registry.summary.byCategory).forEach(([category, count]) => {
    console.log(`  ${NODE_CATEGORIES[category] || category}: ${count} 个`);
  });

  return { registry, docIssues };
}

/**
 * 列出所有节点
 */
function listNodes() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error('❌ 节点注册表不存在，请先运行 --build');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  console.log('📋 节点列表:\n');

  Object.entries(registry.nodes).forEach(([nodeType, metadata]) => {
    console.log(`${nodeType}`);
    console.log(`  文件: ${metadata.filePath}`);
    console.log(`  分类: ${metadata.category || '未知'}`);
    if (metadata.handles.inputs.length > 0) {
      console.log(`  输入: ${metadata.handles.inputs.join(', ')}`);
    }
    if (metadata.handles.outputs.length > 0) {
      console.log(`  输出: ${metadata.handles.outputs.join(', ')}`);
    }
    console.log('');
  });
}

/**
 * 检查节点一致性
 */
function checkNodes() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error('❌ 节点注册表不存在，请先运行 --build');
    process.exit(1);
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const docIssues = checkDocumentationReferences(registry);

  if (docIssues.length > 0) {
    console.log(`❌ 发现 ${docIssues.length} 个问题:\n`);
    docIssues.forEach((issue) => {
      console.log(`  ${issue.file}:${issue.line}`);
      console.log(`    引用了不存在的节点: ${issue.reference}`);
      if (issue.suggestion) {
        console.log(`    建议: ${issue.suggestion}`);
      }
    });
    process.exit(1);
  } else {
    console.log('✅ 所有检查通过');
    process.exit(0);
  }
}

// CLI 入口
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('用法:');
  console.log('  node scripts/node-registry.js --build   # 构建注册表');
  console.log('  node scripts/node-registry.js --check   # 检查一致性');
  console.log('  node scripts/node-registry.js --list    # 列出所有节点');
  process.exit(1);
}

switch (args[0]) {
  case '--build':
    buildRegistry();
    break;
  case '--check':
    checkNodes();
    break;
  case '--list':
    listNodes();
    break;
  default:
    console.error(`❌ 未知选项: ${args[0]}`);
    process.exit(1);
}
