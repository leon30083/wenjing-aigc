#!/usr/bin/env node
/**
 * 节点影响分析器
 *
 * 分析修改某个节点可能影响的其他节点
 * 基于节点注册表中的依赖关系
 *
 * 使用方法:
 *   node scripts/analyze-node-impact.js <NodeType>
 *
 * 示例:
 *   node scripts/analyze-node-impact.js PromptOptimizerNode
 *   node scripts/analyze-node-impact.js CharacterLibraryNode
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../.claude/node-registry.json');

// 从命令行获取节点类型
const targetNodeType = process.argv[2];

if (!targetNodeType) {
  console.log('📊 节点影响分析器\n');
  console.log('用法: node scripts/analyze-node-impact.js <NodeType>\n');
  console.log('示例:');
  console.log('  node scripts/analyze-node-impact.js PromptOptimizerNode');
  console.log('  node scripts/analyze-node-impact.js CharacterLibraryNode');
  console.log('  node scripts/analyze-node-impact.js OpenAIConfigNode\n');
  console.log('可用的节点类型:');
  listAvailableNodes();
  process.exit(0);
}

console.log(`📊 节点影响分析: ${targetNodeType}`);
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
  listAvailableNodes();
  process.exit(1);
}

// 分析依赖关系
const analysis = analyzeDependencies(targetNodeType);

// 输出分析结果
printAnalysis(analysis);

/**
 * 列出所有可用节点
 */
function listAvailableNodes() {
  const nodeTypes = Object.keys(registry.nodes).sort();
  nodeTypes.forEach(type => {
    const node = registry.nodes[type];
    const fileName = node.fileName || 'unknown';
    const exists = node.exists ? '✅' : '❌';
    console.log(`  ${exists} ${type.padEnd(35)} (${fileName})`);
  });
}

/**
 * 分析节点的依赖关系
 */
function analyzeDependencies(nodeType) {
  const result = {
    target: nodeType,
    directDeps: [],       // 直接依赖（使用的节点）
    dependents: [],       // 被依赖（被使用的节点）
    dataContracts: [],    // 数据契约
    risks: [],           // 风险评估
    recommendations: []   // 建议测试
  };

  const allNodes = registry.nodes;

  // 分析直接依赖
  Object.entries(allNodes).forEach(([type, node]) => {
    // 检查 handles 来推断依赖关系
    if (node.handles && node.handles.inputs) {
      node.handles.inputs.forEach(handle => {
        // 如果输入端口类型匹配目标节点
        if (handle.source === nodeType) {
          result.dependents.push({
            node: type,
            port: handle.id || 'unknown',
            usage: '输入连接'
          });
        }
      });
    }
  });

  // 分析数据契约（基于节点类型推断）
  result.dataContracts = inferDataContracts(nodeType);

  // 风险评估
  result.risks = assessRisks(nodeType, result.dependents, allNodes);

  // 推荐测试
  result.recommendations = generateRecommendations(nodeType, result);

  return result;
}

/**
 * 推断数据契约
 */
function inferDataContracts(nodeType) {
  const contracts = [];

  // 基于节点类型推断已知的数据契约
  const knownContracts = {
    promptOptimizerNode: [
      { field: 'context.characters', type: 'Array<{username, alias, profilePictureUrl}>', critical: true },
      { field: 'simplePrompt', type: 'string', critical: true },
      { field: 'optimizedPrompt', type: 'string', critical: true }
    ],
    characterLibraryNode: [
      { field: 'connectedCharacters', type: 'Array<Character>', critical: true },
      { field: 'selectedCharacters', type: 'Set<string>', critical: false }
    ],
    openAIConfigNode: [
      { field: 'base_url', type: 'string', critical: true },
      { field: 'api_key', type: 'string', critical: true },
      { field: 'model', type: 'string', critical: true }
    ],
    videoGenerateNode: [
      { field: 'apiConfig', type: 'ApiConfig', critical: true },
      { field: 'connectedCharacters', type: 'Array<Character>', critical: true },
      { field: 'manualPrompt', type: 'string', critical: true }
    ],
    narratorProcessorNode: [
      { field: 'connectedCharacters', type: 'Array<Character>', critical: true },
      { field: 'optimizedSentences', type: 'Array<Sentence>', critical: true },
      { field: 'openaiConfig', type: 'OpenAIConfig', critical: true }
    ]
  };

  return knownContracts[nodeType] || [];
}

/**
 * 风险评估
 */
function assessRisks(nodeType, dependents, allNodes) {
  const risks = [];

  // 高风险：被多个节点依赖
  if (dependents.length > 3) {
    risks.push({
      level: 'HIGH',
      message: `被 ${dependents.length} 个节点依赖，修改可能导致连锁反应`
    });
  }

  // 中风险：被关键节点依赖
  const criticalNodes = ['videoGenerateNode', 'storyboardNode', 'juxinStoryboardNode', 'zhenzhenStoryboardNode'];
  dependents.forEach(dep => {
    if (criticalNodes.includes(dep.node)) {
      risks.push({
        level: 'MEDIUM',
        message: `被关键节点依赖: ${dep.node}`
      });
    }
  });

  // 低风险：节点文件不存在
  if (!targetNode.exists) {
    risks.push({
      level: 'LOW',
      message: '节点文件不存在，可能是新节点或已删除'
    });
  }

  return risks;
}

/**
 * 生成测试建议
 */
function generateRecommendations(nodeType, analysis) {
  const recommendations = [];

  // 1. 总是测试节点本身
  recommendations.push({
    priority: 'HIGH',
    command: `npm run test:node --name=${nodeType}`,
    description: '测试节点本身的功能'
  });

  // 2. 测试被影响的节点
  if (analysis.dependents.length > 0) {
    const dependentNodes = analysis.dependents.map(d => d.node).join(', ');
    recommendations.push({
      priority: 'HIGH',
      command: `npm run test:affected --from=${nodeType}`,
      description: `测试受影响的节点: ${dependentNodes}`
    });
  }

  // 3. 测试工作流集成
  recommendations.push({
    priority: 'MEDIUM',
    command: 'npm run test:workflow',
    description: '测试完整工作流（如果有保存的工作流）'
  });

  // 4. 验证节点注册表
  recommendations.push({
    priority: 'LOW',
    command: 'npm run validate:registry',
    description: '验证节点注册表更新'
  });

  return recommendations;
}

/**
 * 打印分析结果
 */
function printAnalysis(analysis) {
  // 基本信息
  console.log(`\n📁 文件: ${analysis.target.fileName || 'N/A'}`);
  console.log(`📂 路径: ${analysis.target.filePath || 'N/A'}`);
  console.log(`✅ 存在: ${analysis.target.exists ? '是' : '否'}`);

  // 被依赖的节点
  if (analysis.dependents.length > 0) {
    console.log('\n⚠️  修改此节点可能影响的节点:');
    console.log('━'.repeat(50));
    analysis.dependents.forEach(dep => {
      console.log(`   → ${dep.node.padEnd(35)} (端口: ${dep.port})`);
    });
  } else {
    console.log('\n✅ 此节点未被其他节点直接依赖');
  }

  // 数据契约
  if (analysis.dataContracts.length > 0) {
    console.log('\n📋 数据契约:');
    console.log('━'.repeat(50));
    analysis.dataContracts.forEach(contract => {
      const critical = contract.critical ? '⭐' : '  ';
      console.log(`   ${critical} ${contract.field.padEnd(25)} ${contract.type}`);
    });
  }

  // 风险评估
  if (analysis.risks.length > 0) {
    console.log('\n⚡ 风险评估:');
    console.log('━'.repeat(50));
    analysis.risks.forEach(risk => {
      const icon = risk.level === 'HIGH' ? '🔴' : risk.level === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`   ${icon} [${risk.level}] ${risk.message}`);
    });
  } else {
    console.log('\n✅ 未检测到明显风险');
  }

  // 测试建议
  console.log('\n📝 测试建议:');
  console.log('━'.repeat(50));
  analysis.recommendations.forEach(rec => {
    const icon = rec.priority === 'HIGH' ? '⭐⭐' : rec.priority === 'MEDIUM' ? '⭐' : '  ';
    console.log(`   ${icon} ${rec.description}`);
    console.log(`      $ ${rec.command}`);
  });

  console.log('\n' + '━'.repeat(70));
}
