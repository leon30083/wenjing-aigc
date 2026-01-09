#!/usr/bin/env node
/**
 * 节点注册表验证脚本
 *
 * 验证 node-registry.json 的完整性和一致性
 *
 * 使用方法:
 *   node scripts/validate-registry.js
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../.claude/node-registry.json');

console.log('🔍 验证节点注册表...');
console.log('━'.repeat(60));

let hasErrors = false;
let errors = [];

try {
  // 检查文件是否存在
  if (!fs.existsSync(REGISTRY_PATH)) {
    errors.push('❌ 节点注册表文件不存在: .claude/node-registry.json');
    hasErrors = true;
  } else {
    console.log('✅ 节点注册表文件存在');
  }

  // 读取并解析 JSON
  let registry;
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    registry = JSON.parse(content);
    console.log('✅ JSON 格式正确');
  } catch (error) {
    errors.push(`❌ JSON 解析失败: ${error.message}`);
    hasErrors = true;
    throw error; // 退出，无法继续验证
  }

  // 验证结构
  if (!registry.version) {
    errors.push('❌ 缺少 version 字段');
    hasErrors = true;
  } else {
    console.log(`✅ 版本: ${registry.version}`);
  }

  if (!registry.nodes) {
    errors.push('❌ 缺少 nodes 字段');
    hasErrors = true;
  } else {
    const nodeCount = Object.keys(registry.nodes).length;
    console.log(`✅ 节点数量: ${nodeCount}`);
  }

  if (!registry.summary) {
    errors.push('❌ 缺少 summary 字段');
    hasErrors = true;
  } else {
    console.log(`✅ 总计节点: ${registry.summary.total || 0}`);
  }

  // 验证必需字段
  const nodeTypes = Object.keys(registry.nodes || {});
  const requiredFields = ['nodeType', 'fileName', 'filePath', 'absolutePath', 'exists'];
  const recommendedFields = ['componentName', 'handles'];

  nodeTypes.forEach(nodeType => {
    const node = registry.nodes[nodeType];

    // 检查必需字段
    requiredFields.forEach(field => {
      if (!(field in node)) {
        errors.push(`❌ 节点 ${nodeType} 缺少必需字段: ${field}`);
        hasErrors = true;
      }
    });

    // 检查文件是否存在
    if (node.absolutePath) {
      if (!fs.existsSync(node.absolutePath)) {
        errors.push(`⚠️  节点 ${nodeType} 文件不存在: ${node.fileName}`);
        // 不设为错误，因为可能是新添加的节点
      }
    }

    // 检查推荐字段
    const missingRecommended = recommendedFields.filter(f => !(f in node));
    if (missingRecommended.length > 0) {
      console.log(`⚠️  节点 ${nodeType} 缺少推荐字段: ${missingRecommended.join(', ')}`);
    }
  });

  // 检查节点类型命名规范
  const invalidNames = nodeTypes.filter(name => {
    // 应该是 camelCase
    return !/^[a-z][a-zA-Z0-9]*Node$/.test(name);
  });

  if (invalidNames.length > 0) {
    errors.push(`❌ 节点类型命名不符合规范 (camelCase + 'Node' 后缀): ${invalidNames.join(', ')}`);
    hasErrors = true;
  } else {
    console.log('✅ 节点类型命名符合规范');
  }

} catch (error) {
  console.error('\n💥 验证过程发生错误:', error.message);
  hasErrors = true;
}

// 输出结果
console.log('━'.repeat(60));

if (hasErrors) {
  console.log('\n❌ 验证失败！\n');
  errors.forEach(error => console.log(error));
  console.log('\n💡 请修复上述问题后重试');
  process.exit(1);
} else {
  console.log('\n✅ 节点注册表验证通过！\n');
  process.exit(0);
}
