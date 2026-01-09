#!/usr/bin/env node
/**
 * 数据契约检测脚本 ⭐ Phase 2 核心工具
 *
 * 功能：
 * - 扫描所有节点文件，自动提取数据契约
 * - 检测 node.data 的读取和写入操作
 * - 分析 useEffect 依赖关系
 * - 生成节点间数据流报告
 *
 * 使用方法:
 *   node scripts/detect-data-contracts.js                    # 分析所有节点
 *   node scripts/detect-data-contracts.js --node=videoGenerateNode  # 分析单个节点
 *   node scripts/detect-data-contracts.js --output=json       # 输出 JSON 格式
 *   node scripts/detect-data-contracts.js --compare=HEAD~1    # 对比 Git 提交
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NODES_DIR = path.join(__dirname, '../src/client/src/nodes');
const OUTPUT_FORMAT = process.argv.includes('--output=json') ? 'json' : 'text';
const COMPARE_COMMIT = process.argv.find(arg => arg.startsWith('--compare='))?.split('=')[1];

/**
 * 从命令行参数获取目标节点
 */
const getTargetNode = () => {
  const nodeArg = process.argv.find(arg => arg.startsWith('--node='));
  return nodeArg ? nodeArg.split('=')[1] : null;
};

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
 * 从文件内容中提取节点名称
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
 * 从文件内容中提取数据契约
 */
function extractDataContract(content) {
  const dataContract = {
    reads: [],      // 从 data 读取的字段
    writes: [],     // 写入到 node.data 的字段
    dependencies: [], // useEffect 依赖的 data 字段
    internalState: [], // 内部 useState (可能同步到 data)
    dataInitializers: [] // 从 data 初始化的 useState
  };

  // 提取所有 useState 的初始化
  const useStatePattern = /useState\(([^)]+)\)/g;
  let useStateMatch;
  while ((useStateMatch = useStatePattern.exec(content)) !== null) {
    const initializer = useStateMatch[1].trim();

    // 检查是否从 data 初始化: useState(data.xxx) 或 useState(data?.xxx)
    const dataInitMatch = initializer.match(/^data(\?\.|\.)(\w+)/);
    if (dataInitMatch) {
      const fieldName = dataInitMatch[2];
      if (fieldName && !dataContract.dataInitializers.includes(fieldName)) {
        dataContract.dataInitializers.push(fieldName);
        // 同时添加到 reads（从 data 读取）
        if (!dataContract.reads.includes(fieldName)) {
          dataContract.reads.push(fieldName);
        }
      }
    }
  }

  // 提取内部 useState 的字段名
  const internalStatePattern = /const\s+\[\s*(\w+)\s*,/g;
  let internalMatch;
  const skipVars = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useNodeId', 'getNodes', 'getEdges', 'setNodes'];
  while ((internalMatch = internalStatePattern.exec(content)) !== null) {
    const varName = internalMatch[1];
    if (!skipVars.includes(varName) && !dataContract.internalState.includes(varName)) {
      dataContract.internalState.push(varName);
    }
  }

  // 提取所有 data.xxx 的读取操作（包括可选链）
  const readFields = new Set();

  // 模式1: data.field
  const directAccessPattern = /data\.(\w+)/g;
  let match;
  while ((match = directAccessPattern.exec(content)) !== null) {
    readFields.add(match[1]);
  }

  // 模式2: data?.field
  const optionalChainPattern = /data\?\.(\w+)/g;
  while ((match = optionalChainPattern.exec(content)) !== null) {
    readFields.add(match[1]);
  }

  // 模式3: variable.data.field (排除 currentNode.data, sourceNode.data 等)
  const objectDataPattern = /([a-zA-Z]\w*)\.data\.(\w+)/g;
  while ((match = objectDataPattern.exec(content)) !== null) {
    const objectName = match[1];
    const fieldName = match[2];
    // 只保留 data.xxx 和 props.xxx
    if (objectName === 'data' || objectName === 'props') {
      readFields.add(fieldName);
    }
  }

  dataContract.reads = [...readFields].filter(field =>
    // 排除 JS 内置方法和常见的非数据字段
    !['onSizeChange', 'id', 'type', 'position', 'style', 'className'].includes(field)
  );

  // 提取 setNodes() 中的写入操作
  // 改进模式：匹配到以换行和空格开始的结束括号（支持嵌套函数）
  const setNodesPattern = /setNodes\(([\s\S]+?)\n\s*\)/gm;
  let setNodesMatch;
  const writeFields = new Set();

  // 首先提取所有数据对象定义（用于 data: variableName 模式）
  const dataObjectDefinitions = [];
  // 改进的模式：匹配 const X = { 到对应的 }，支持多行
  const objectDefPattern = /const\s+(\w+)\s*=\s*{([\s\S]*?)^(\s*)};/gm;
  let objectMatch;
  while ((objectMatch = objectDefPattern.exec(content)) !== null) {
    const varName = objectMatch[1];
    const fields = objectMatch[2];
    // 检查是否包含 ...xxx.data 的扩展
    if (fields.includes('...') && (fields.includes('.data') || fields.includes('Data'))) {
      dataObjectDefinitions.push({ varName, fields });
    }
  }

  while ((setNodesMatch = setNodesPattern.exec(content)) !== null) {
    const setNodesBody = setNodesMatch[1];

    // 模式1: 提取 data: { ...node.data, fieldName }
    const dataUpdatePattern = /data:\s*{\s*\.\.\.node\.data,\s*([^}]+)}/;
    const dataUpdateMatch = setNodesBody.match(dataUpdatePattern);
    if (dataUpdateMatch) {
      const fields = dataUpdateMatch[1];
      // 提取所有字段名
      const fieldPattern = /(\w+):/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(fields)) !== null) {
        const fieldName = fieldMatch[1];
        if (fieldName !== 'data') {
          writeFields.add(fieldName);
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
          writeFields.add(fieldName);
        }
      }
    }

    // 模式3: 提取 ...node.data, fieldName (简写形式)
    const shorthandPattern = /\.\.\.node\.data,\s*(\w+)/g;
    while ((match = shorthandPattern.exec(setNodesBody)) !== null) {
      writeFields.add(match[1]);
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
            writeFields.add(fieldName);
          }
        }
      }
    }
  }
  dataContract.writes = [...writeFields];

  // 提取 useEffect 中的 data 依赖
  const useEffectPattern = /useEffect\(([^)]*)\s*,\s*\[([^\]]*)\]\)/g;
  let useEffectMatch;
  while ((useEffectMatch = useEffectPattern.exec(content)) !== null) {
    const depsString = useEffectMatch[2];
    // 分割依赖项
    const deps = depsString.split(',').map(d => d.trim());
    deps.forEach(dep => {
      if (dep.startsWith('data.') || dep.startsWith('data?.')) {
        const fieldName = dep.replace(/^data\.?(\w+).*/, '$1');
        if (fieldName && !dataContract.dependencies.includes(fieldName)) {
          dataContract.dependencies.push(fieldName);
        }
      }
    });
  }

  return dataContract;
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
        filePath,
        nodeName: null,
        error: '无法提取节点名称'
      };
    }

    const dataContract = extractDataContract(content);

    return {
      filePath: path.relative(process.cwd(), filePath),
      nodeName,
      nodeType: nodeName.replace(/Node$/, '').replace(/^[A-Z]/, c => c.toLowerCase()), // 转换为 nodeType
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
 * 读取节点注册表（如果存在）
 */
function loadNodeRegistry() {
  const registryPath = path.join(__dirname, '../.claude/node-registry.json');
  if (fs.existsSync(registryPath)) {
    try {
      const content = fs.readFileSync(registryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  无法读取节点注册表: ${error.message}`);
      return null;
    }
  }
  return null;
}

/**
 * 分析节点间连接关系
 */
function analyzeConnections(nodeAnalyses, registry) {
  const connections = [];

  nodeAnalyses.forEach(analysis => {
    if (!analysis.nodeName) return;

    // 检查 setNodes() 调用，查找数据传递目标
    const content = fs.readFileSync(analysis.filePath, 'utf8');

    // 查找: node.id === nodeId ? { ...node, data: { ...targetNode.data, ... } }
    // 或: nds.map((node) => node.id === targetNodeId ? { ...node, data: { ... } })
    const targetNodePattern = /node\.id\s*===\s*targetNode\.id|nds\.map\(\s*\([^)]*\)\s*=>\s*node\.id\s*===\s*([^)]+)\)/g;

    // 这里简化处理，实际应该从 node-registry.json 读取 handles 信息
  });

  return connections;
}

/**
 * 生成文本格式报告
 */
function generateTextReport(nodeAnalyses, registry) {
  console.log('\n📊 数据契约检测报告');
  console.log('━'.repeat(70));

  let totalNodes = 0;
  let totalReads = 0;
  let totalWrites = 0;

  nodeAnalyses.forEach(analysis => {
    if (!analysis.nodeName || analysis.error) {
      console.log(`\n⚠️  ${path.basename(analysis.filePath)}: ${analysis.error || '未知错误'}`);
      return;
    }

    totalNodes++;
    const { nodeName, dataContract } = analysis;

    console.log(`\n📦 ${nodeName}`);
    console.log('   ' + '━'.repeat(60));

    // 读取字段
    if (dataContract.reads.length > 0) {
      console.log('\n   📥 从 data 读取的字段:');
      dataContract.reads.forEach(field => {
        const isTracked = dataContract.dependencies.includes(field);
        const status = isTracked ? '✅' : '⚠️ ';
        const note = isTracked ? '' : ' (未在 useEffect 依赖中)';
        console.log(`      ${status} data.${field}${note}`);
      });
      totalReads += dataContract.reads.length;
    } else {
      console.log('\n   📥 从 data 读取的字段: (无)');
    }

    // 写入字段
    if (dataContract.writes.length > 0) {
      console.log('\n   📤 写入到 node.data 的字段:');
      dataContract.writes.forEach(field => {
        const isRead = dataContract.reads.includes(field);
        const status = isRead ? '✅' : '⚠️ ';
        const note = isRead ? '' : ' (未读取，可能是输出)';
        console.log(`      ${status} node.data.${field}${note}`);
      });
      totalWrites += dataContract.writes.length;
    } else {
      console.log('\n   📤 写入到 node.data 的字段: (无)');
    }

    // useEffect 依赖
    if (dataContract.dependencies.length > 0) {
      console.log('\n   🔁 useEffect 监听的字段:');
      dataContract.dependencies.forEach(field => {
        const isRead = dataContract.reads.includes(field);
        const status = isRead ? '✅' : '⚠️ ';
        const note = isRead ? '' : ' (未在 reads 中)';
        console.log(`      ${status} data.${field}${note}`);
      });
    }

    // 从 data 初始化的 useState
    if (dataContract.dataInitializers.length > 0) {
      console.log('\n   🔄 从 data 初始化的内部状态:');
      dataContract.dataInitializers.forEach(field => {
        console.log(`      useState(data.${field} || defaultValue)`);
      });
    }
  });

  // 总结
  console.log('\n' + '━'.repeat(70));
  console.log('\n📈 统计摘要:');
  console.log(`   总节点数: ${totalNodes}`);
  console.log(`   总读取字段: ${totalReads}`);
  console.log(`   总写入字段: ${totalWrites}`);
  console.log(`   平均读取/节点: ${(totalReads / totalNodes).toFixed(1)}`);
  console.log(`   平均写入/节点: ${(totalWrites / totalNodes).toFixed(1)}`);

  // 检测潜在问题
  const issues = detectIssues(nodeAnalyses);
  if (issues.length > 0) {
    console.log('\n⚠️  检测到潜在问题:');
    issues.forEach(issue => {
      console.log(`\n   ❌ ${issue.summary}`);
      console.log(`      节点: ${issue.node}`);
      console.log(`      详情: ${issue.details}`);
      console.log(`      建议: ${issue.recommendation}`);
    });
  } else {
    console.log('\n✅ 未检测到明显问题');
  }

  console.log('\n' + '━'.repeat(70) + '\n');
}

/**
 * 检测潜在问题
 */
function detectIssues(nodeAnalyses) {
  const issues = [];

  nodeAnalyses.forEach(analysis => {
    if (!analysis.nodeName) return;

    const { nodeName, dataContract } = analysis;

    // 检测1: 读取但未在 useEffect 依赖中的字段
    dataContract.reads.forEach(field => {
      if (!dataContract.dependencies.includes(field) && !dataContract.dataInitializers.includes(field)) {
        issues.push({
          type: 'missing_dependency',
          severity: 'warning',
          node: nodeName,
          summary: `字段 data.${field} 被读取但未在 useEffect 依赖中`,
          details: `字段 data.${field} 在代码中被读取，但没有在任何 useEffect 的依赖数组中声明。这可能导致状态更新时无法响应。`,
          recommendation: `检查是否需要在 useEffect 依赖数组中添加 data.${field}`
        });
      }
    });

    // 检测2: 写入但未读取的字段（输出端口）
    dataContract.writes.forEach(field => {
      if (!dataContract.reads.includes(field)) {
        // 这是正常的输出字段，不是问题
        // 但可以标记为输出
      }
    });

    // 检测3: 从 data 初始化但未同步回 data 的字段
    dataContract.dataInitializers.forEach(field => {
      if (!dataContract.writes.includes(field) && !dataContract.dependencies.includes(field)) {
        issues.push({
          type: 'one_way_sync',
          severity: 'warning',
          node: nodeName,
          summary: `字段 data.${field} 从 data 初始化但未同步回 data`,
          details: `内部状态从 data.${field} 初始化，但代码中没有看到将状态同步回 node.data 的逻辑。这会导致工作流保存时丢失此字段。`,
          recommendation: `添加 useEffect 将内部状态同步到 node.data，或在 setNodes() 中包含此字段`
        });
      }
    });
  });

  return issues;
}

/**
 * 生成 JSON 格式报告
 */
function generateJSONReport(nodeAnalyses) {
  const report = {
    timestamp: new Date().toISOString(),
    totalNodes: nodeAnalyses.filter(a => a.nodeName).length,
    nodes: nodeAnalyses.map(analysis => ({
      nodeName: analysis.nodeName,
      filePath: analysis.filePath,
      dataContract: analysis.dataContract,
      issues: detectIssues([analysis])
    }))
  };

  console.log(JSON.stringify(report, null, 2));
}

/**
 * 对比 Git 提交
 */
function compareWithCommit(commit) {
  try {
    const gitCmd = `git diff ${commit} HEAD -- "src/client/src/nodes/**/*.jsx"`;
    const diff = execSync(gitCmd, { encoding: 'utf8' });

    console.log('\n🔍 Git 提交对比: ' + commit);
    console.log('━'.repeat(70));
    console.log('\n⚠️  此功能需要完整的 AST 解析支持（Phase 2.2）');
    console.log('   当前版本: 仅显示文件列表\n');

    // 提取修改的文件
    const filePattern = /^\+\+\+ b\/(.*\.jsx)/gm;
    let fileMatch;
    const changedFiles = [];
    while ((fileMatch = filePattern.exec(diff)) !== null) {
      changedFiles.push(fileMatch[1]);
    }

    if (changedFiles.length > 0) {
      console.log('📝 修改的节点文件:');
      changedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }

  } catch (error) {
    console.error(`❌ Git 对比失败: ${error.message}`);
  }
}

// 主流程
async function main() {
  const targetNode = getTargetNode();
  console.log('\n🔍 数据契约检测工具');
  console.log('━'.repeat(70));

  // 如果需要对比 Git 提交
  if (COMPARE_COMMIT) {
    compareWithCommit(COMPARE_COMMIT);
    return;
  }

  // 查找所有节点文件
  console.log('\n📂 扫描节点文件...');
  const nodeFiles = findJSXFiles(NODES_DIR);
  console.log(`   找到 ${nodeFiles.length} 个文件`);

  // 如果指定了目标节点，过滤文件
  let targetFiles = nodeFiles;
  if (targetNode) {
    targetFiles = nodeFiles.filter(file => {
      const content = fs.readFileSync(file, 'utf8');
      const nodeName = extractNodeName(content);
      return nodeName && nodeName.toLowerCase() === targetNode.toLowerCase();
    });

    if (targetFiles.length === 0) {
      console.error(`\n❌ 未找到节点: ${targetNode}`);
      console.log('   可用的节点:');
      nodeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const nodeName = extractNodeName(content);
        if (nodeName) {
          console.log(`   - ${nodeName}`);
        }
      });
      process.exit(1);
    }
  }

  // 读取节点注册表
  const registry = loadNodeRegistry();
  if (registry) {
    console.log(`✅ 节点注册表已加载 (v${registry.version})`);
  }

  // 分析所有节点
  console.log('\n⚙️  分析数据契约...\n');
  const nodeAnalyses = targetFiles.map(analyzeNode);

  // 生成报告
  if (OUTPUT_FORMAT === 'json') {
    generateJSONReport(nodeAnalyses);
  } else {
    generateTextReport(nodeAnalyses, registry);
  }

  // 如果有问题，退出码为 1
  const issues = detectIssues(nodeAnalyses);
  const hasErrors = issues.some(i => i.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}

main().catch(error => {
  console.error('\n💥 发生错误:', error.message);
  process.exit(1);
});
