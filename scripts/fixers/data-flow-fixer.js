/**
 * 数据流断裂修复器（半自动）
 *
 * 功能: 修复节点间的数据传递问题
 * 策略: 分析数据流断裂原因，提供修复建议，需要人工确认
 *
 * 使用: 从 auto-fix.js 调用（提供修复建议）
 */

const fs = require('fs');
const path = require('path');

// 节点目录
const NODES_DIR = path.join(__dirname, '../../src/client/src/nodes');

/**
 * 修复数据流断裂（提供修复建议）
 * @param {Object} issue - 问题对象
 * @returns {Object} 修复结果
 */
function fix(issue) {
  const result = {
    success: false,
    changes: 0,
    error: null,
    suggestions: []
  };

  try {
    // 从 issue.details 提取源节点和目标节点信息
    // 格式示例: "源节点: TextNode 未写入 manualPrompt，目标节点: VideoGenerateNode 读取 data.manualPrompt"
    const details = issue.details || '';

    const sourceMatch = details.match(/源节点:\s*(\w+)/);
    const targetMatch = details.match(/目标节点:\s*(\w+)/);
    const fieldMatch = details.match(/字段:\s*(\w+)/);

    if (!sourceMatch || !targetMatch || !fieldMatch) {
      result.error = '无法解析数据流信息';
      return result;
    }

    const sourceNode = sourceMatch[1];
    const targetNode = targetMatch[1];
    const field = fieldMatch[1];

    console.log(`   📊 数据流断裂分析:`);
    console.log(`   源节点: ${sourceNode}`);
    console.log(`   目标节点: ${targetNode}`);
    console.log(`   断裂字段: ${field}`);

    // 生成修复建议
    const suggestions = generateSuggestions(sourceNode, targetNode, field);
    result.suggestions = suggestions;

    console.log(`\n   💡 修复建议:`);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.description}`);
      console.log(`      位置: ${suggestion.location}`);
      console.log(`      操作: ${suggestion.action}`);
    });

    console.log(`\n   ⚠️  此修复需要人工干预，请根据建议手动修改代码`);

    // 标记为需要手动修复
    result.error = 'REQUIRES_MANUAL_FIX';
    result.requiresManualFix = true;

  } catch (error) {
    result.error = error.message;
    console.error(`   ❌ 分析失败: ${error.message}`);
  }

  return result;
}

/**
 * 生成修复建议
 * @param {string} sourceNode - 源节点名称
 * @param {string} targetNode - 目标节点名称
 * @param {string} field - 断裂的字段名
 * @returns {Array} 修复建议列表
 */
function generateSuggestions(sourceNode, targetNode, field) {
  const suggestions = [];

  // 建议1: 在源节点的 setNodes() 中添加字段
  suggestions.push({
    description: `在 ${sourceNode} 的 setNodes() 调用中添加 ${field} 字段`,
    location: `src/client/src/nodes/.../${sourceNode}.jsx`,
    action: `添加: data: { ...node.data, ${field}: ${field} }`,
    code: `setNodes((nds) =>
  nds.map((node) =>
    node.id === nodeId
      ? { ...node, data: { ...node.data, ${field}: ${field} } }
      : node
  )
);`
  });

  // 建议2: 检查目标节点的 useEffect 是否监听了该字段
  suggestions.push({
    description: `确保 ${targetNode} 的 useEffect 依赖数组包含 data.${field}`,
    location: `src/client/src/nodes/.../${targetNode}.jsx`,
    action: `添加依赖: [data.${field}]`,
    code: `useEffect(() => {
  // 使用 data.${field} 的逻辑
}, [data.${field}]);`
  });

  // 建议3: 检查节点连接是否正确
  suggestions.push({
    description: `验证 ${sourceNode} 和 ${targetNode} 之间的连接`,
    location: 'React Flow 画布',
    action: '检查 Handle ID 和连线',
    code: `// 确认源节点的输出 Handle ID
<Handle type="source" id="output" />

// 确认目标节点的输入 Handle ID
<Handle type="target" id="input" />

// 确认连线存在
edges.find(e => e.source === sourceId && e.target === targetId)`
  });

  // 建议4: 检查 App.jsx 中的数据传递逻辑
  suggestions.push({
    description: '检查 App.jsx 中的 edges useEffect 是否正确传递数据',
    location: 'src/client/src/App.jsx',
    action: '验证数据传递逻辑',
    code: `useEffect(() => {
  setNodes((nds) =>
    nds.map((node) => {
      // 确保正确传递 ${field}
      if (node.id === targetNodeId) {
        return {
          ...node,
          data: { ...node.data, ${field}: sourceNode.data.${field} }
        };
      }
      return node;
    })
  );
}, [edges]);`
  });

  return suggestions;
}

/**
 * 扫描数据流断裂问题
 * @returns {Array} 问题列表
 */
function scan() {
  const issues = [];

  // 这个扫描器会复用 validate-data-flow.js 的逻辑
  // 这里只是提供一个接口，实际扫描应该由 validate-data-flow.js 完成

  return issues;
}

/**
 * 深度分析数据流
 * @param {string} sourceNodeName - 源节点名称
 * @param {string} targetNodeName - 目标节点名称
 * @returns {Object} 分析结果
 */
function analyzeDataFlow(sourceNodeName, targetNodeName) {
  const result = {
    sourceWrites: [],
    targetReads: [],
    mismatches: []
  };

  try {
    const sourcePath = findNodeFile(sourceNodeName);
    const targetPath = findNodeFile(targetNodeName);

    if (!sourcePath || !targetPath) {
      result.error = '找不到节点文件';
      return result;
    }

    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    const targetContent = fs.readFileSync(targetPath, 'utf8');

    // 分析源节点写入的字段
    const sourceSetNodesMatches = sourceContent.matchAll(/setNodes\(([\s\S]+?)\)/g);
    for (const match of sourceSetNodesMatches) {
      const dataMatch = match[1].match(/data:\s*\{([^}]+)\}/);
      if (dataMatch) {
        const fields = dataMatch[1].split(',').map(f => f.trim().split(':')[0].trim());
        result.sourceWrites.push(...fields);
      }
    }

    // 分析目标节点读取的字段
    const targetDataMatches = targetContent.matchAll(/data\.(\w+)/g);
    for (const match of targetDataMatches) {
      result.targetReads.push(match[1]);
    }

    // 找出不匹配的字段
    result.mismatches = result.targetReads.filter(field => !result.sourceWrites.includes(field));

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * 查找节点文件
 * @param {string} nodeName - 节点名称
 * @returns {string|null} 文件路径
 */
function findNodeFile(nodeName) {
  let foundPath = null;

  function searchDirectory(dir) {
    if (foundPath) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDirectory(fullPath);
        } else if (entry.isFile() && entry.name === `${nodeName}.jsx`) {
          foundPath = fullPath;
          return;
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  searchDirectory(NODES_DIR);
  return foundPath;
}

module.exports = {
  fix,
  scan,
  analyzeDataFlow,
  generateSuggestions,
  findNodeFile
};
