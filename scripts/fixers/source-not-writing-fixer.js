/**
 * 源节点未写入修复器
 *
 * 功能: 在源节点的 setNodes() 调用中添加缺失的字段
 * 策略: 从 issue.details 提取缺失的字段，在 setNodes() 的 data 对象中添加
 *
 * 使用: 从 auto-fix.js 调用
 */

const fs = require('fs');
const path = require('path');

// 节点目录
const NODES_DIR = path.join(__dirname, '../../src/client/src/nodes');

/**
 * 修复源节点未写入的问题
 * @param {Object} issue - 问题对象
 * @returns {Object} 修复结果
 */
function fix(issue) {
  const result = {
    success: false,
    changes: 0,
    error: null
  };

  try {
    // 从 issue.details 提取文件路径和缺失的字段
    // 格式示例: "src/client/src/nodes/input/TextNode.jsx 未写入字段: manualPrompt"
    const details = issue.details || '';
    const fileMatch = details.match(/([\/\w]+\.(js|jsx))/);
    const fieldMatch = details.match(/未写入字段:\s*([\w.,\s]+)/);

    if (!fileMatch || !fieldMatch) {
      result.error = '无法解析文件路径或缺失字段';
      return result;
    }

    const filePath = path.join(process.cwd(), fileMatch[1]);
    const missingFields = fieldMatch[1].split(',').map(f => f.trim()).filter(f => f);

    if (!fs.existsSync(filePath)) {
      result.error = `文件不存在: ${filePath}`;
      return result;
    }

    console.log(`   📝 修复未写入字段: ${missingFields.join(', ')}`);
    console.log(`   文件: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf8');

    // 查找 setNodes() 调用
    const setNodesRegex = /setNodes\(([\s\S]+?)\)/g;
    let match;
    let modified = false;
    let newContent = content;
    let offset = 0;

    while ((match = setNodesRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const matchStart = match.index + offset;

      // 检查是否包含 data 对象
      if (!fullMatch.includes('data:')) {
        continue;
      }

      // 提取 data 对象
      const dataMatch = fullMatch.match(/data:\s*\{([^}]+)\}/);
      if (!dataMatch) {
        continue;
      }

      const dataContent = dataMatch[1];
      const existingFields = dataContent.split(',').map(f => f.trim().split(':')[0].trim());

      // 检查哪些字段缺失
      const fieldsToAdd = missingFields.filter(f => !existingFields.includes(f));

      if (fieldsToAdd.length === 0) {
        continue;
      }

      // 构建新的 data 对象
      const newDataContent = dataContent + ', ' + fieldsToAdd.map(f => {
        // 根据字段名推断初始值
        if (f === 'manualPrompt' || f === 'prompt' || f === 'text') {
          return `${f}: ''`;
        } else if (f === 'selectedCharacters' || f === 'connectedCharacters') {
          return `${f}: []`;
        } else if (f === 'taskId' || f === 'platform') {
          return `${f}: null`;
        } else {
          return `${f}: undefined`;
        }
      }).join(', ');

      const newSetNodes = fullMatch.replace(
        /data:\s*\{([^}]+)\}/,
        `data: { ${newDataContent} }`
      );

      // 替换原 setNodes
      newContent = newContent.substring(0, matchStart) +
                   newSetNodes +
                   newContent.substring(matchStart + fullMatch.length);

      modified = true;
      offset += newSetNodes.length - fullMatch.length;

      console.log(`   添加字段: ${fieldsToAdd.join(', ')}`);

      // 只修复第一个匹配
      break;
    }

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      result.success = true;
      result.changes = 1;
      console.log(`   ✅ 已修复: ${path.relative(process.cwd(), filePath)}`);
    } else {
      result.error = '未找到需要修复的 setNodes() 调用';
    }

  } catch (error) {
    result.error = error.message;
    console.error(`   ❌ 修复失败: ${error.message}`);
  }

  return result;
}

/**
 * 扫描节点文件中的源节点未写入问题
 * @returns {Array} 问题列表
 */
function scan() {
  const issues = [];

  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
          const fileIssues = scanFile(fullPath);
          issues.push(...fileIssues);
        }
      });
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  scanDirectory(NODES_DIR);
  return issues;
}

/**
 * 扫描单个文件的源节点未写入问题
 * @param {string} filePath - 文件路径
 * @returns {Array} 问题列表
 */
function scanFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');

  // 检查是否是源节点（有输出端点）
  const hasOutputHandle = /Handle\s+type\s*=\s*["']source["']/.test(content);
  if (!hasOutputHandle) {
    return issues;
  }

  // 查找 setNodes() 调用
  const setNodesRegex = /setNodes\(([\s\S]+?)\)/g;
  let match;

  while ((match = setNodesRegex.exec(content)) !== null) {
    const fullMatch = match[0];

    // 检查是否包含 data 对象
    if (!fullMatch.includes('data:')) {
      continue;
    }

    // 提取 data 对象
    const dataMatch = fullMatch.match(/data:\s*\{([^}]+)\}/);
    if (!dataMatch) {
      continue;
    }

    const dataContent = dataMatch[1];
    const existingFields = dataContent.split(',').map(f => f.trim().split(':')[0].trim());

    // 检查常见的输出字段是否缺失
    const commonOutputFields = [
      'manualPrompt',
      'selectedCharacters',
      'connectedCharacters',
      'prompt',
      'text',
      'taskId'
    ];

    commonOutputFields.forEach(field => {
      // 检查文件中是否使用了该字段但没有写入
      const fieldUsagePattern = new RegExp(`\\b${field}\\b`);
      if (fieldUsagePattern.test(content) && !existingFields.includes(field)) {
        issues.push({
          type: 'source_not_writing',
          file: filePath,
          line: content.substring(0, match.index).split('\n').length,
          summary: `setNodes() 未写入字段: ${field}`,
          details: `${filePath} 未写入字段: ${field}`
        });
      }
    });
  }

  return issues;
}

module.exports = {
  fix,
  scan,
  scanFile
};
