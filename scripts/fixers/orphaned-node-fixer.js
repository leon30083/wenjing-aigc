/**
 * 孤立节点引用修复器
 *
 * 功能: 修复文档中引用的不存在节点
 * 策略: 从文档中删除孤立节点的引用
 *
 * 使用: 从 auto-fix.js 调用
 */

const fs = require('fs');
const path = require('path');

// 文档文件路径
const DOCS_DIR = path.join(__dirname, '../../.claude/skills/winjin-dev/references');

/**
 * 修复孤立节点引用
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
    // 从 issue.summary 提取节点名称
    // 格式: "孤立节点引用: NodeName"
    const match = issue.summary.match(/孤立节点引用:\s*(\w+)/);
    if (!match) {
      result.error = '无法解析节点名称';
      return result;
    }

    const nodeName = match[1];
    console.log(`   📝 修复孤立节点引用: ${nodeName}`);

    // 查找包含孤立节点引用的文档文件
    const docsFiles = findDocumentationFiles();

    let totalChanges = 0;
    let fixedFiles = 0;

    docsFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      let fileChanged = false;

      // 查找并删除包含孤立节点引用的行
      const newLines = lines.filter(line => {
        // 检查行是否包含节点引用
        if (line.includes(nodeName)) {
          // 进一步检查是否真的是节点引用
          const patterns = [
            new RegExp(`-\\s*\\[\\[${nodeName}\\]\\]`, 'i'),
            new RegExp(`\\*\\*${nodeName}\\*\\*`, 'i'),
            new RegExp(`\`${nodeName}\``, 'i')
          ];

          const isReference = patterns.some(pattern => pattern.test(line));
          if (isReference) {
            console.log(`   删除: ${line.trim()}`);
            fileChanged = true;
            return false;
          }
        }
        return true;
      });

      if (fileChanged) {
        fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
        totalChanges += lines.length - newLines.length;
        fixedFiles++;
        console.log(`   ✅ 已修复: ${path.relative(process.cwd(), filePath)}`);
      }
    });

    result.success = true;
    result.changes = totalChanges;
    result.fixedFiles = fixedFiles;

    console.log(`   📊 修复完成: ${fixedFiles} 个文件, ${totalChanges} 处变更`);

  } catch (error) {
    result.error = error.message;
    console.error(`   ❌ 修复失败: ${error.message}`);
  }

  return result;
}

/**
 * 查找文档文件
 * @returns {Array<string>} 文件路径数组
 */
function findDocumentationFiles() {
  const files = [];

  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  scanDirectory(DOCS_DIR);
  return files;
}

module.exports = {
  fix,
  findDocumentationFiles
};
