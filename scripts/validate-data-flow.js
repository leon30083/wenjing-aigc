#!/usr/bin/env node
/**
 * 数据流验证脚本 ⭐ Phase 2 核心工具
 *
 * 功能：
 * - 分析节点间的数据传递关系
 * - 检测数据流完整性（源节点写入 → 目标节点读取）
 * - 识别数据流断裂（数据发送但未接收）
 * - 验证数据契约匹配
 *
 * 使用方法:
 *   node scripts/validate-data-flow.js                              # 验证所有连接
 *   node scripts/validate-data-flow.js --source=NarratorProcessorNode   # 分析特定源节点
 *   node scripts/validate-data-flow.js --target=VideoGenerateNode     # 分析特定目标节点
 *   node scripts/validate-data-flow.js --check=connection            # 检查特定连接
 */

const fs = require('fs');
const path = require('path');

const NODES_DIR = path.join(__dirname, '../src/client/src/nodes');
const REGISTRY_PATH = path.join(__dirname, '../.claude/node-registry.json');
const CONFIG_PATH = path.join(__dirname, 'validation-config.json');

/**
 * 加载验证配置
 */
function loadValidationConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.warn(`⚠️  无法加载验证配置: ${error.message}`);
  }
  return {
    contextFields: { fields: {} },
    ignoredNodes: { nodes: [] },
    initOnlyFields: { fields: {} },
    connectionRules: { overrides: [] }
  };
}

// 全局加载配置
const validationConfig = loadValidationConfig();

/**
 * 从命令行参数获取选项
 */
function parseOptions() {
  const options = {
    sourceNode: null,
    targetNode: null,
    checkConnection: null,
    outputFormat: 'text'
  };

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--source=')) {
      options.sourceNode = arg.split('=')[1];
    } else if (arg.startsWith('--target=')) {
      options.targetNode = arg.split('=')[1];
    } else if (arg.startsWith('--check=')) {
      options.checkConnection = arg.split('=')[1];
    } else if (arg === '--output=json') {
      options.outputFormat = 'json';
    }
  });

  return options;
}

/**
 * 递归查找所有 JSX 文件
 */
function findJSXFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findJSXFiles(filePath, fileList);
    } else if (filePath.match(/\.(jsx|js|tsx|ts)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 从文件内容中提取节点名称 ⭐ 同步自 detect-data-contracts.js
 */
function extractNodeName(content) {
  // 匹配: export default function XXXNode({ data })
  const functionMatch = content.match(/export\s+default\s+function\s+(\w+)/);
  if (functionMatch) return functionMatch[1];

  // 匹配: export default React.memo(function XXXNode({ data }))
  const memoMatch = content.match(/export\s+default\s+React\.memo\(function\s+(\w+)/);
  if (memoMatch) return memoMatch[1];

  // 匹配: function XXXNode({ data }) ... export default React.memo(XXXNode) ⭐ 新增
  const funcDeclMatch = content.match(/function\s+(\w+Node)\s*\(/);
  if (funcDeclMatch) {
    const funcName = funcDeclMatch[1];
    // 检查是否有 export default React.memo(XXXNode)
    const memoExportMatch = content.match(/export\s+default\s+React\.memo\((\w+)\)/);
    if (memoExportMatch && memoExportMatch[1] === funcName) {
      return funcName;
    }
    // 检查是否有 export default XXXNode
    const exportDefaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (exportDefaultMatch && exportDefaultMatch[1] === funcName) {
      return funcName;
    }
  }

  // 匹配: const XXXNode = () => { ... } ... export default XXXNode
  const constMatch = content.match(/const\s+(\w+Node)\s+=\s*\(/);
  if (constMatch) {
    const exportDefaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (exportDefaultMatch && exportDefaultMatch[1] === constMatch[1]) {
      return constMatch[1];
    }
  }

  // 匹配: function XXX({ data }) ... export default XXX (不带 Node 后缀)
  const funcWithoutNodeMatch = content.match(/function\s+(\w+)\s*\([^)]*data[^)]*\)/);
  if (funcWithoutNodeMatch) {
    const funcName = funcWithoutNodeMatch[1];
    // 检查是否有 export default React.memo(XXX)
    const memoExportMatch = content.match(/export\s+default\s+React\.memo\((\w+)\)/);
    if (memoExportMatch && memoExportMatch[1] === funcName) {
      return funcName;
    }
    // 检查是否有 export default XXX
    const exportDefaultMatch = content.match(/export\s+default\s+(\w+)/);
    if (exportDefaultMatch && exportDefaultMatch[1] === funcName) {
      return funcName;
    }
  }

  return null;
}

/**
 * 提取节点的数据契约（完整版，支持所有模式）⭐ 同步自 detect-data-contracts.js
 */
function extractDataContract(content) {
  const dataContract = {
    reads: new Set(),
    writes: new Set(),
    dependencies: new Set()
  };

  // 提取 data.xxx 的读取操作
  const readFields = new Set();
  const directAccessPattern = /data\.(\w+)/g;
  let match;
  while ((match = directAccessPattern.exec(content)) !== null) {
    readFields.add(match[1]);
  }

  const optionalChainPattern = /data\?\.(\w+)/g;
  while ((match = optionalChainPattern.exec(content)) !== null) {
    readFields.add(match[1]);
  }

  // 排除非数据字段
  const excludeFields = ['onSizeChange', 'id', 'type', 'position', 'style', 'className', 'label'];
  readFields.forEach(field => {
    if (!excludeFields.includes(field)) {
      dataContract.reads.add(field);
    }
  });

  // 首先提取所有数据对象定义（用于 data: variableName 模式）
  const dataObjectDefinitions = [];
  const objectDefPattern = /const\s+(\w+)\s*=\s*{([\s\S]*?)^(\s*)};/gm;
  let objectMatch;
  while ((objectMatch = objectDefPattern.exec(content)) !== null) {
    const varName = objectMatch[1];
    const fields = objectMatch[2];
    if (fields.includes('...') && (fields.includes('.data') || fields.includes('Data'))) {
      dataObjectDefinitions.push({ varName, fields });
    }
  }

  // 提取 setNodes() 中的写入操作
  // 改进模式：匹配到以换行和空格开始的结束括号（支持嵌套函数）
  const setNodesPattern = /setNodes\(([\s\S]+?)\n\s*\)/gm;
  let setNodesMatch;
  while ((setNodesMatch = setNodesPattern.exec(content)) !== null) {
    const setNodesBody = setNodesMatch[1];

    // 模式1: 提取 data: { ...node.data, fieldName }
    const dataUpdatePattern = /data:\s*{\s*\.\.\.node\.data,\s*([^}]+)}/;
    const dataUpdateMatch = setNodesBody.match(dataUpdatePattern);
    if (dataUpdateMatch) {
      const fields = dataUpdateMatch[1];
      const fieldPattern = /(\w+):/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(fields)) !== null) {
        const fieldName = fieldMatch[1];
        if (fieldName !== 'data') {
          dataContract.writes.add(fieldName);
        }
      }
    }

    // 模式2: 提取 { ...node, data: { ...node.data, fieldName } }
    const nodeDataPattern = /\.\.\.node,\s*data:\s*{\s*\.\.\.node\.data,\s*([^}]+)}/;
    const nodeDataMatch = setNodesBody.match(nodeDataPattern);
    if (nodeDataMatch) {
      const fields = nodeDataMatch[1];
      const fieldPattern = /(\w+):/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(fields)) !== null) {
        const fieldName = fieldMatch[1];
        if (fieldName !== 'data') {
          dataContract.writes.add(fieldName);
        }
      }
    }

    // 模式3: 提取 ...node.data, fieldName (简写形式)
    const shorthandPattern = /\.\.\.node\.data,\s*(\w+)/g;
    while ((match = shorthandPattern.exec(setNodesBody)) !== null) {
      dataContract.writes.add(match[1]);
    }

    // 模式4: data: variableName (间接引用) ⭐ 新增
    const dataVariablePattern = /data:\s*(\w+)/g;
    let dataVarMatch;
    while ((dataVarMatch = dataVariablePattern.exec(setNodesBody)) !== null) {
      const varName = dataVarMatch[1];
      // 排除已知的关键字
      if (varName === 'node' || varName === 'data') continue;

      // 查找对应的对象定义
      const objDef = dataObjectDefinitions.find(def => def.varName === varName);
      if (objDef) {
        // 从对象定义中提取字段名
        const fieldPattern = /(\w+):/g;
        let fieldMatch;
        while ((fieldMatch = fieldPattern.exec(objDef.fields)) !== null) {
          const fieldName = fieldMatch[1];
          // 排除扩展运算符和特殊字段
          if (fieldName !== 'data' && !fieldName.includes('.')) {
            dataContract.writes.add(fieldName);
          }
        }
      }
    }
  }

  // 提取 useEffect 依赖
  const useEffectPattern = /useEffect\(([^)]*)\s*,\s*\[([^\]]*)\]\)/g;
  let useEffectMatch;
  while ((useEffectMatch = useEffectPattern.exec(content)) !== null) {
    const depsString = useEffectMatch[2];
    const deps = depsString.split(',').map(d => d.trim());
    deps.forEach(dep => {
      if (dep.startsWith('data.') || dep.startsWith('data?.')) {
        const fieldName = dep.replace(/^data\.?(\w+).*/, '$1');
        if (fieldName) {
          dataContract.dependencies.add(fieldName);
        }
      }
    });
  }

  return {
    reads: [...dataContract.reads],
    writes: [...dataContract.writes],
    dependencies: [...dataContract.dependencies]
  };
}

/**
 * 分析单个节点文件
 */
function analyzeNode(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const nodeName = extractNodeName(content);

    if (!nodeName) {
      return {
        filePath: path.relative(process.cwd(), filePath),
        nodeName: null,
        error: '无法提取节点名称'
      };
    }

    const dataContract = extractDataContract(content);

    return {
      filePath: path.relative(process.cwd(), filePath),
      nodeName,
      nodeType: nodeName.replace(/Node$/, '').replace(/^[A-Z]/, c => c.toLowerCase()),
      dataContract,
      exists: true
    };
  } catch (error) {
    return {
      filePath: path.relative(process.cwd(), filePath),
      nodeName: null,
      error: error.message
    };
  }
}

/**
 * 读取节点注册表
 */
function loadNodeRegistry() {
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  无法读取节点注册表: ${error.message}`);
      return null;
    }
  }
  return null;
}

/**
 * 从节点注册表提取连接信息
 */
function extractConnectionsFromRegistry(registry) {
  if (!registry || !registry.nodes) {
    return [];
  }

  const connections = [];

  Object.entries(registry.nodes).forEach(([nodeType, nodeInfo]) => {
    if (!nodeInfo.handles) return;

    const nodeName = nodeType.replace(/^[a-z]/, c => c.toUpperCase()) + 'Node';
    const filePath = nodeInfo.absolutePath;

    // 输入端口（连接到源节点）
    nodeInfo.handles.inputs?.forEach(input => {
      if (input.source) {
        connections.push({
          target: nodeName,
          targetPort: input.id,
          source: input.source.replace(/^[a-z]/, c => c.toUpperCase()) + 'Node',
          sourcePort: input.source,
          type: 'read'
        });
      }
    });

    // 输出端口（被目标节点连接）
    nodeInfo.handles.outputs?.forEach(output => {
      // 输出端口通常没有指定目标节点，需要反向查找
      connections.push({
        source: nodeName,
        sourcePort: output.id,
        target: null,  // 需要查找
        targetPort: null,
        type: 'write'
      });
    });
  });

  return connections;
}

/**
 * 手动定义已知的连接关系（Phase 2 临时方案）
 * TODO: Phase 2.2 将实现自动连接检测
 */
function getKnownConnections() {
  return [
    // NarratorProcessorNode → VideoGenerateNode
    {
      source: 'NarratorProcessorNode',
      sourcePort: 'sentence-output',
      target: 'VideoGenerateNode',
      targetPort: 'sentence-output',
      dataFields: ['manualPrompt', 'narratorMode', 'narratorIndex', 'narratorTotal', 'narratorSentences'],
      type: 'data-transfer'
    },
    // CharacterLibraryNode → VideoGenerateNode
    {
      source: 'CharacterLibraryNode',
      sourcePort: 'characters-output',
      target: 'VideoGenerateNode',
      targetPort: 'character-input',
      dataFields: ['connectedCharacters'],
      type: 'data-transfer'
    },
    // CharacterLibraryNode → NarratorProcessorNode
    {
      source: 'CharacterLibraryNode',
      sourcePort: 'characters-output',
      target: 'NarratorProcessorNode',
      targetPort: 'character-input',
      dataFields: ['connectedCharacters'],
      type: 'data-transfer'
    },
    // ReferenceImageNode → VideoGenerateNode
    {
      source: 'ReferenceImageNode',
      sourcePort: 'images-output',
      target: 'VideoGenerateNode',
      targetPort: 'images-input',
      dataFields: ['connectedImages'],
      type: 'data-transfer'
    },
    // APISettingsNode → VideoGenerateNode
    {
      source: 'APISettingsNode',
      sourcePort: 'api-config',
      target: 'VideoGenerateNode',
      targetPort: 'api-config',
      dataFields: ['apiConfig'],
      type: 'data-transfer'
    },
    // OpenAIConfigNode → NarratorProcessorNode
    {
      source: 'OpenAIConfigNode',
      sourcePort: 'config-output',
      target: 'NarratorProcessorNode',
      targetPort: 'openai-config',
      dataFields: ['openaiConfig'],
      type: 'data-transfer'
    }
  ];
}

/**
 * 从代码中提取连接信息（备用方案，如果注册表不完整）
 */
function extractConnectionsFromCode(nodeAnalyses) {
  const connections = [];

  nodeAnalyses.forEach(analysis => {
    if (!analysis.nodeName) return;

    const content = fs.readFileSync(analysis.filePath, 'utf8');

    // 查找 getEdges() 调用，提取连接逻辑
    const edgesPattern = /getEdges\(\)[\s\S]*?\.filter\(([^)]+)\)[\s\S]*?\.find\(([^)]+)\)/g;
    let match;

    while ((match = edgesPattern.exec(content)) !== null) {
      // 解析 filter 和 find 条件
      const filterCond = match[1];
      const findCond = match[2];

      // 提取目标端口: e.target === nodeId && e.targetHandle === 'port'
      const targetHandleMatch = filterCond.match(/e\.targetHandle\s*===\s*['"]([^'"]+)['"]/);
      if (targetHandleMatch) {
        const targetPort = targetHandleMatch[1];

        // 提取源节点类型: sourceNode?.type === 'xxxNode'
        const sourceTypeMatch = findCond.match(/type\s*===\s*['"]([^'"]+)['"]/);
        if (sourceTypeMatch) {
          const sourceType = sourceTypeMatch[1];

          connections.push({
            target: analysis.nodeName,
            targetPort,
            source: sourceType.replace(/^[a-z]/, c => c.toUpperCase()) + 'Node',
            sourcePort: null,
            type: 'read'
          });
        }
      }
    }

    // 查找 setNodes() 中的数据传递
    // 目标节点更新
    const targetNodePattern = /(?:targetNode|target)\.id\s*===\s*([^)\s]+)/g;
    while ((match = targetNodePattern.exec(content)) !== null) {
      const targetNodeIdVar = match[1];

      // 查找对应的节点类型（这个需要上下文分析，暂时跳过）
    }
  });

  return connections;
}

/**
 * 验证数据流完整性（使用连接定义中的 dataFields）
 */
function validateDataFlowDetailed(nodeAnalyses, connections, options) {
  const issues = [];
  const nodeMap = new Map();

  // 创建节点映射
  nodeAnalyses.forEach(analysis => {
    if (analysis.nodeName) {
      nodeMap.set(analysis.nodeName, analysis);
      // 同时支持小写 nodeType
      nodeMap.set(analysis.nodeType, analysis);
    }
  });

  // 验证每个连接
  connections.forEach(conn => {
    if (!conn.source || !conn.target) return;

    const sourceNode = nodeMap.get(conn.source);
    const targetNode = nodeMap.get(conn.target);

    if (!sourceNode) {
      issues.push({
        type: 'missing_source',
        severity: 'error',
        source: conn.source,
        target: conn.target,
        summary: `源节点不存在: ${conn.source}`,
        details: `连接 ${conn.source} → ${conn.target} 引用了不存在的源节点`
      });
      return;
    }

    if (!targetNode) {
      issues.push({
        type: 'missing_target',
        severity: 'error',
        source: conn.source,
        target: conn.target,
        summary: `目标节点不存在: ${conn.target}`,
        details: `连接 ${conn.source} → ${conn.target} 引用了不存在的目标节点`
      });
      return;
    }

    // 如果连接定义了 dataFields，验证这些字段的数据流
    if (conn.dataFields && conn.dataFields.length > 0) {
      const sourceWrites = new Set(sourceNode.dataContract.writes);
      const targetReads = new Set(targetNode.dataContract.reads);
      const targetDeps = new Set(targetNode.dataContract.dependencies);

      conn.dataFields.forEach(field => {
        // ⭐ 新增：检查是否是 Context 字段
        const isContextField = validationConfig.contextFields.fields[field];
        if (isContextField) {
          console.log(`ℹ️  跳过检查: ${field} 来自 ${isContextField.source}`);
          return; // 跳过此字段的检查
        }

        // ⭐ 新增：检查连接规则覆盖
        const connectionOverride = validationConfig.connectionRules.overrides.find(
          rule => rule.source === conn.source &&
                 rule.target === conn.target &&
                 rule.field === field
        );
        if (connectionOverride && connectionOverride.skipChecks.includes('source_not_writing')) {
          console.log(`ℹ️  跳过检查: ${conn.source} → ${conn.target} (${field}) - ${connectionOverride.reason}`);
          return; // 跳过此字段的检查
        }

        // 检查1: 源节点是否写入此字段
        if (!sourceWrites.has(field)) {
          issues.push({
            type: 'source_not_writing',
            severity: 'warning',
            source: conn.source,
            target: conn.target,
            field,
            summary: `源节点未写入: data.${field}`,
            details: `连接定义期望 ${conn.source} 写入 node.data.${field}，但代码中未检测到此写入操作`,
            recommendation: `检查 ${conn.source} 是否在 setNodes() 中包含 ${field} 字段`
          });
        }

        // 检查2: 目标节点是否读取此字段
        if (!targetReads.has(field)) {
          issues.push({
            type: 'target_not_reading',
            severity: 'warning',  // 改为 warning，因为可能通过内部状态间接使用
            source: conn.source,
            target: conn.target,
            field,
            summary: `目标节点未读取: data.${field}`,
            details: `${conn.source} 发送 data.${field}，但 ${conn.target} 没有在代码中读取此字段`,
            recommendation: `检查 ${conn.target} 是否需要在 useEffect 中接收 data.${field}`
          });
        }

        // 检查3: 目标节点是否在 useEffect 中监听此字段
        if (targetReads.has(field) && !targetDeps.has(field)) {
          // ⭐ 新增：检查是否是初始化字段（不需要监听）
          const initOnlyField = validationConfig.initOnlyFields.fields[field];
          if (initOnlyField && initOnlyField.node === conn.target) {
            console.log(`ℹ️  跳过检查: ${field} 在 ${conn.target} 中只在初始化时读取 - ${initOnlyField.reason}`);
            return; // 跳过此字段的依赖检查
          }

          // ⭐ 新增：检查是否是 Context 字段（通过 Context 传递，不监听 data.xxx）
          const isContextField = validationConfig.contextFields.fields[field];
          if (isContextField) {
            console.log(`ℹ️  跳过检查: ${field} 通过 ${isContextField.source} 提供，不监听 data.${field}`);
            return; // 跳过此字段的依赖检查
          }

          // ⭐ 新增：检查是否是已正确监听的字段
          const monitoredField = validationConfig.monitoredFields.fields[field];
          if (monitoredField && monitoredField.node === conn.target) {
            console.log(`ℹ️  跳过检查: ${field} 已正确监听 - ${monitoredField.reason}`);
            return; // 跳过此字段的依赖检查
          }

          issues.push({
            type: 'missing_dependency',
            severity: 'warning',
            source: conn.source,
            target: conn.target,
            field,
            summary: `依赖缺失: data.${field} 被读取但未监听`,
            details: `${conn.target} 读取 data.${field}，但没有在 useEffect 依赖中声明`,
            recommendation: `在 ${conn.target} 的 useEffect 依赖数组中添加 data.${field}`
          });
        }
      });
    }
  });

  return issues;
}

/**
 * 生成文本格式报告
 */
function generateTextReport(nodeAnalyses, connections, issues, options) {
  console.log('\n🔍 数据流验证报告');
  console.log('━'.repeat(70));

  // 过滤节点
  let filteredAnalyses = nodeAnalyses;
  if (options.sourceNode) {
    filteredAnalyses = nodeAnalyses.filter(a => a.nodeName === options.sourceNode);
  } else if (options.targetNode) {
    filteredAnalyses = nodeAnalyses.filter(a => a.nodeName === options.targetNode);
  }

  // 统计摘要
  const totalNodes = filteredAnalyses.filter(a => a.nodeName).length;
  const totalConnections = connections.length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  console.log(`\n📊 统计:`);
  console.log(`   总节点数: ${totalNodes}`);
  console.log(`   总连接数: ${totalConnections}`);
  console.log(`   错误: ${errorCount}`);
  console.log(`   警告: ${warningCount}`);

  // 显示连接
  if (connections.length > 0) {
    console.log('\n📋 检测到的连接:');
    console.log('━'.repeat(70));
    connections.forEach((conn, index) => {
      if (conn.source && conn.target) {
        console.log(`\n   ${index + 1}. ${conn.source} → ${conn.target}`);
        if (conn.targetPort) {
          console.log(`      端口: ${conn.targetPort}`);
        }
      }
    });
  }

  // 显示问题
  if (issues.length > 0) {
    console.log('\n⚠️  检测到的问题:');
    console.log('━'.repeat(70));

    const groupedIssues = {
      error: issues.filter(i => i.severity === 'error'),
      warning: issues.filter(i => i.severity === 'warning')
    };

    // 先显示错误
    if (groupedIssues.error.length > 0) {
      console.log('\n   ❌ 错误:');
      groupedIssues.error.forEach(issue => {
        console.log(`\n      ${issue.summary}`);
        console.log(`         ${issue.details}`);
      });
    }

    // 再显示警告
    if (groupedIssues.warning.length > 0) {
      console.log('\n   ⚠️  警告:');
      groupedIssues.warning.forEach(issue => {
        console.log(`\n      ${issue.summary}`);
        console.log(`         ${issue.details}`);
        console.log(`         💡 建议: ${issue.recommendation}`);
      });
    }
  } else {
    console.log('\n✅ 未检测到数据流问题');
  }

  // 总结
  console.log('\n' + '━'.repeat(70));
  if (errorCount > 0) {
    console.log(`\n❌ 验证失败！发现 ${errorCount} 个错误，${warningCount} 个警告\n`);
    process.exit(1);
  } else if (warningCount > 0) {
    console.log(`\n⚠️  验证通过但有 ${warningCount} 个警告\n`);
    process.exit(0);
  } else {
    console.log(`\n✅ 所有数据流验证通过！\n`);
    process.exit(0);
  }
}

/**
 * 生成 JSON 格式报告
 */
function generateJSONReport(nodeAnalyses, connections, issues) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalNodes: nodeAnalyses.filter(a => a.nodeName).length,
      totalConnections: connections.length,
      errorCount: issues.filter(i => i.severity === 'error').length,
      warningCount: issues.filter(i => i.severity === 'warning').length
    },
    connections,
    issues
  };

  console.log(JSON.stringify(report, null, 2));
}

// 主流程
async function main() {
  const options = parseOptions();
  console.log('\n🔍 数据流验证工具');
  console.log('━'.repeat(70));

  // 查找所有节点文件
  console.log('\n📂 扫描节点文件...');
  const nodeFiles = findJSXFiles(NODES_DIR);
  console.log(`   找到 ${nodeFiles.length} 个文件`);

  // 分析所有节点
  console.log('\n⚙️  分析节点数据契约...');
  const nodeAnalyses = nodeFiles.map(analyzeNode);

  // 读取节点注册表
  const registry = loadNodeRegistry();
  if (registry) {
    console.log(`✅ 节点注册表已加载 (v${registry.version})`);
  }

  // 提取连接信息
  console.log('\n🔗 分析节点连接...');
  let connections = extractConnectionsFromRegistry(registry);

  // 如果注册表中没有连接信息，使用手动定义的连接
  if (connections.length === 0) {
    console.log('   ⚠️  节点注册表缺少连接信息，使用手动定义的连接...');
    connections = getKnownConnections();
  }

  console.log(`   找到 ${connections.length} 个连接`);

  // 验证数据流
  console.log('\n🔬 验证数据流完整性...\n');
  const issues = validateDataFlowDetailed(nodeAnalyses, connections, options);

  // 生成报告
  if (options.outputFormat === 'json') {
    generateJSONReport(nodeAnalyses, connections, issues);
  } else {
    generateTextReport(nodeAnalyses, connections, issues, options);
  }
}

main().catch(error => {
  console.error('\n💥 发生错误:', error.message);
  process.exit(1);
});
