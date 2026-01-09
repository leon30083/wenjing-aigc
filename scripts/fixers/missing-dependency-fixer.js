/**
 * useEffect 依赖缺失修复器
 *
 * 功能: 自动添加缺失的 useEffect 依赖
 * 策略: 从 issue.details 中提取缺失的依赖，添加到 useEffect 依赖数组
 *
 * 使用: 从 auto-fix.js 调用
 */

const fs = require('fs');
const path = require('path');

// 节点目录
const NODES_DIR = path.join(__dirname, '../../src/client/src/nodes');

/**
 * 修复缺失的 useEffect 依赖
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
    // 从 issue.details 提取文件路径和缺失的依赖
    // 格式示例: "src/client/src/nodes/process/VideoGenerateNode.jsx 缺失依赖: data.prompt"
    const details = issue.details || '';
    const fileMatch = details.match(/([\/\w]+\.(js|jsx))/);
    const depMatch = details.match(/缺失依赖:\s*([\w.,\s]+)/);

    if (!fileMatch || !depMatch) {
      result.error = '无法解析文件路径或缺失依赖';
      return result;
    }

    const filePath = path.join(process.cwd(), fileMatch[1]);
    const missingDeps = depMatch[1].split(',').map(d => d.trim()).filter(d => d);

    if (!fs.existsSync(filePath)) {
      result.error = `文件不存在: ${filePath}`;
      return result;
    }

    console.log(`   📝 修复缺失依赖: ${missingDeps.join(', ')}`);
    console.log(`   文件: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let changes = 0;
    let modifiedContent = content;

    // 查找所有 useEffect 并检查依赖数组
    const useEffectRegex = /useEffect\(\(\)\s*=>\s*{[\s\S]*?},\s*\[\s*([^\]]*)\s*\]\)/g;
    let match;

    while ((match = useEffectRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const currentDeps = match[1].split(',').map(d => d.trim()).filter(d => d);
      const useEffectStart = match.index;

      // 检查 useEffect 内部是否使用了缺失的依赖
      const useEffectBody = fullMatch.match(/useEffect\(\(\)\s*=>\s*{([\s\S]*?)},/)[1];

      let needsUpdate = false;
      const newDeps = [...currentDeps];

      missingDeps.forEach(dep => {
        // 检查依赖是否在 useEffect 中被使用
        const depUsagePattern = new RegExp(`\\b${dep.replace('.', '\\.')}\\b`);
        if (depUsagePattern.test(useEffectBody) && !currentDeps.includes(dep)) {
          newDeps.push(dep);
          needsUpdate = true;
          console.log(`   添加依赖: ${dep}`);
        }
      });

      if (needsUpdate) {
        // 更新依赖数组
        const newUseEffect = fullMatch.replace(
          /},\s*\[\s*([^\]]*)\s*\]\)$/,
          `}, [${newDeps.join(', ')}])`
        );

        // 替换原 useEffect
        modifiedContent = modifiedContent.substring(0, useEffectStart) +
                        newUseEffect +
                        modifiedContent.substring(useEffectStart + fullMatch.length);

        changes++;
        // 更新正则表达式的 lastIndex，因为字符串已修改
        useEffectRegex.lastIndex = 0;
        break; // 只修复第一个匹配
      }
    }

    if (changes > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      result.success = true;
      result.changes = changes;
      console.log(`   ✅ 已修复: ${path.relative(process.cwd(), filePath)} (${changes} 处变更)`);
    } else {
      result.error = '未找到需要修复的 useEffect';
    }

  } catch (error) {
    result.error = error.message;
    console.error(`   ❌ 修复失败: ${error.message}`);
  }

  return result;
}

/**
 * 扫描节点文件中的 useEffect 依赖问题
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
 * 扫描单个文件的 useEffect 依赖问题
 * @param {string} filePath - 文件路径
 * @returns {Array} 问题列表
 */
function scanFile(filePath) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');

  // 查找所有 useEffect
  const useEffectRegex = /useEffect\(\(\)\s*=>\s*{[\s\S]*?},\s*\[\s*([^\]]*)\s*\]\)/g;
  let match;

  while ((match = useEffectRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const currentDeps = match[1].split(',').map(d => d.trim()).filter(d => d);
    const useEffectBody = fullMatch.match(/useEffect\(\(\)\s*=>\s*{([\s\S]*?)},/)[1];

    // 查找使用的 data.xxx 字段
    const dataUsagePattern = /data\.(\w+)/g;
    let dataMatch;

    while ((dataMatch = dataUsagePattern.exec(useEffectBody)) !== null) {
      const usedField = dataMatch[1];
      const depName = `data.${usedField}`;

      if (!currentDeps.includes(depName) && !currentDeps.includes('data')) {
        issues.push({
          type: 'missing_dependency',
          file: filePath,
          line: content.substring(0, match.index).split('\n').length,
          summary: `useEffect 缺失依赖: ${depName}`,
          details: `${filePath} 缺失依赖: ${depName}`
        });
      }
    }
  }

  return issues;
}

module.exports = {
  fix,
  scan,
  scanFile
};
