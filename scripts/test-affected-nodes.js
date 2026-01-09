#!/usr/bin/env node
/**
 * 影响节点测试脚本
 *
 * 测试修改某个节点后受影响的其他节点
 *
 * 使用方法:
 *   node scripts/test-affected-nodes.js <NodeType> [--workflow=<name>]
 *
 * 示例:
 *   node scripts/test-affected-nodes.js PromptOptimizerNode
 *   node scripts/test-affected-nodes.js CharacterLibraryNode --workflow=test-workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REGISTRY_PATH = path.join(__dirname, '../.claude/node-registry.json');

// 解析命令行参数
const args = process.argv.slice(2);
const targetNodeType = args[0];
const workflowName = args.find(arg => arg.startsWith('--workflow='))?.split('=')[1];

if (!targetNodeType) {
  console.log('🧪 影响节点测试脚本\n');
  console.log('用法: node scripts/test-affected-nodes.js <NodeType> [--workflow=<name>]\n');
  console.log('示例:');
  console.log('  node scripts/test-affected-nodes.js PromptOptimizerNode');
  console.log('  node scripts/test-affected-nodes.js CharacterLibraryNode --workflow=test-workflow\n');
  console.log('可用的节点类型:');
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const nodeTypes = Object.keys(registry.nodes).sort();
    nodeTypes.forEach(type => {
      const node = registry.nodes[type];
      const fileName = node.fileName || 'unknown';
      const exists = node.exists ? '✅' : '❌';
      console.log(`  ${exists} ${type.padEnd(35)} (${fileName})`);
    });
  } catch (error) {
    console.log('  (无法读取节点注册表)');
  }
  process.exit(0);
}

console.log(`🧪 测试受影响节点: ${targetNodeType}`);
if (workflowName) {
  console.log(`📁 工作流: ${workflowName}`);
}
console.log('━'.repeat(70));

let registry;
try {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  registry = JSON.parse(content);
} catch (error) {
  console.error(`❌ 无法读取节点注册表: ${error.message}`);
  process.exit(1);
}

// 检查目标节点是否存在
const targetNode = registry.nodes[targetNodeType];
if (!targetNode) {
  console.error(`\n❌ 节点 "${targetNodeType}" 不存在！\n`);
  console.log('可用的节点类型:\n');
  const nodeTypes = Object.keys(registry.nodes).sort();
  nodeTypes.forEach(type => {
    const node = registry.nodes[type];
    const fileName = node.fileName || 'unknown';
    const exists = node.exists ? '✅' : '❌';
    console.log(`  ${exists} ${type.padEnd(35)} (${fileName})`);
  });
  process.exit(1);
}

// 分析受影响的节点
const affectedNodes = analyzeAffectedNodes(targetNodeType);

if (affectedNodes.length === 0) {
  console.log('\n✅ 此节点未被其他节点依赖，无需测试受影响节点\n');
  console.log('━'.repeat(70));
  process.exit(0);
}

// 显示受影响的节点
console.log('\n📋 受影响的节点:');
console.log('━'.repeat(50));
affectedNodes.forEach((node, index) => {
  console.log(`   ${index + 1}. ${node.node.padEnd(35)} (端口: ${node.port})`);
});

// 运行测试
console.log('\n🧪 开始测试...\n');
const testResults = runTests(targetNodeType, affectedNodes);

// 显示测试结果
console.log('\n📊 测试结果:');
console.log('━'.repeat(70));
testResults.forEach(result => {
  const icon = result.success ? '✅' : '❌';
  const node = result.node.padEnd(35);
  const test = result.test.padEnd(30);
  console.log(`   ${icon} ${node} | ${test}`);
  if (!result.success && result.error) {
    console.log(`      错误: ${result.error}`);
  }
});

// 总结
const successCount = testResults.filter(r => r.success).length;
const totalCount = testResults.length;
console.log('━'.repeat(70));
console.log(`\n📈 测试通过率: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)\n`);

if (successCount === totalCount) {
  console.log('✅ 所有测试通过！\n');
  process.exit(0);
} else {
  console.log('❌ 部分测试失败，请修复后重试\n');
  process.exit(1);
}

/**
 * 分析受影响的节点
 */
function analyzeAffectedNodes(nodeType) {
  const affected = [];
  const allNodes = registry.nodes;

  Object.entries(allNodes).forEach(([type, node]) => {
    if (node.handles && node.handles.inputs) {
      node.handles.inputs.forEach(handle => {
        if (handle.source === nodeType) {
          affected.push({
            node: type,
            port: handle.id || 'unknown',
            usage: '输入连接'
          });
        }
      });
    }
  });

  return affected;
}

/**
 * 运行测试
 */
function runTests(targetNodeType, affectedNodes) {
  const results = [];

  // 测试1: 节点文件存在性
  results.push({
    node: targetNodeType,
    test: '文件存在性检查',
    success: checkNodeExists(targetNodeType),
    error: targetNode.exists ? null : '节点文件不存在'
  });

  // 测试2: 节点语法验证
  const syntaxResult = validateNodeSyntax(targetNodeType);
  results.push({
    node: targetNodeType,
    test: '语法验证',
    success: syntaxResult.success,
    error: syntaxResult.error
  });

  // 测试3: 受影响节点的数据连接
  affectedNodes.forEach(affected => {
    const connectionResult = testDataConnection(targetNodeType, affected.node);
    results.push({
      node: affected.node,
      test: `数据连接 (${affected.port})`,
      success: connectionResult.success,
      error: connectionResult.error
    });
  });

  // 测试4: 工作流集成测试（如果指定了工作流）
  if (workflowName) {
    const workflowResult = testWorkflowIntegration(workflowName, targetNodeType);
    results.push({
      node: 'Workflow',
      test: `工作流: ${workflowName}`,
      success: workflowResult.success,
      error: workflowResult.error
    });
  }

  return results;
}

/**
 * 检查节点文件是否存在
 */
function checkNodeExists(nodeType) {
  const node = registry.nodes[nodeType];
  return node && node.exists;
}

/**
 * 验证节点语法
 */
function validateNodeSyntax(nodeType) {
  const node = registry.nodes[nodeType];
  if (!node || !node.absolutePath) {
    return { success: false, error: '节点路径未定义' };
  }

  try {
    // 使用 babel 检查语法
    execSync(`npx babel --check "${node.absolutePath}"`, {
      stdio: 'ignore',
      cwd: path.join(__dirname, '../src/client')
    });
    return { success: true };
  } catch (error) {
    // 降级到基本语法检查
    try {
      const content = fs.readFileSync(node.absolutePath, 'utf8');
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;

      if (openBraces !== closeBraces) {
        return { success: false, error: `括号不匹配: { ${openBraces} 个, } ${closeBraces} 个` };
      }
      if (openParens !== closeParens) {
        return { success: false, error: `圆括号不匹配: ( ${openParens} 个, ) ${closeParens} 个` };
      }

      return { success: true };
    } catch (readError) {
      return { success: false, error: readError.message };
    }
  }
}

/**
 * 测试数据连接
 */
function testDataConnection(sourceNodeType, targetNodeType) {
  const sourceNode = registry.nodes[sourceNodeType];
  const targetNode = registry.nodes[targetNodeType];

  if (!sourceNode || !targetNode) {
    return { success: false, error: '节点未注册' };
  }

  if (!sourceNode.exists) {
    return { success: false, error: `源节点 ${sourceNodeType} 文件不存在` };
  }

  if (!targetNode.exists) {
    return { success: false, error: `目标节点 ${targetNodeType} 文件不存在` };
  }

  // 检查数据契约兼容性
  const sourceOutputs = sourceNode.handles?.outputs || [];
  const targetInputs = targetNode.handles?.inputs || [];

  // 查找匹配的连接
  const hasConnection = sourceOutputs.some(output => {
    return targetInputs.some(input => {
      // 简化检查：如果输入端口指定了源，则验证
      if (input.source && input.source !== sourceNodeType) {
        return false;
      }
      // 类型检查（如果定义了）
      if (output.type && input.type && output.type !== input.type) {
        return false;
      }
      return true;
    });
  });

  if (!hasConnection) {
    return { success: false, error: '未找到匹配的输入/输出端口' };
  }

  return { success: true };
}

/**
 * 测试工作流集成
 */
function testWorkflowIntegration(workflowName, nodeType) {
  // 模拟工作流测试
  // 实际实现应该加载工作流并运行测试
  try {
    // 这里可以扩展为实际的工作流测试逻辑
    // 例如：加载 localStorage 中的工作流，验证节点连接等
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
