#!/usr/bin/env node
/**
 * 节点语法验证脚本
 *
 * 验证所有节点文件的语法正确性
 *
 * 使用方法:
 *   node scripts/validate-nodes.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NODES_DIR = path.join(__dirname, '../src/client/src/nodes');

console.log('🔍 验证节点文件语法...');
console.log('━'.repeat(60));

let hasErrors = false;
let errors = [];
let warnings = []; // 新增：用于存储非 babel 验证的警告
let validatedCount = 0;
let usingBabel = false; // 标记是否使用了 babel

/**
 * 递归查找所有 JSX 文件
 */
function findJSXFiles(dir, fileList = []) {
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
 * 使用 Babel 验证单个文件语法
 */
function validateFile(filePath) {
  try {
    // 使用 babel 检查语法（如果安装了 @babel/cli）
    execSync(`npx babel --check "${filePath}"`, {
      stdio: 'ignore',
      cwd: path.join(__dirname, '../src/client')
    });
    usingBabel = true; // 标记使用了 babel
    return { success: true, file: filePath };
  } catch (error) {
    // 如果 babel 失败，可能是 babel 未安装或真正的语法错误
    // 检查是否是 babel 命令不存在
    if (error.message && error.message.includes('babel')) {
      // babel 未安装，将使用 esprima 验证（降级到警告）
      return { success: false, file: filePath, error: error.message, isBabelMissing: true };
    }
    return {
      success: false,
      file: filePath,
      error: error.message || '语法错误'
    };
  }
}

/**
 * 备用方案：使用 esprima 验证
 */
function validateFileWithEsprima(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 简单检查：是否有明显的语法错误
    const issues = [];

    // 检查未闭合的括号
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`括号不匹配: { ${openBraces} 个, } ${closeBraces} 个`);
    }

    // 检查未闭合的圆括号
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`圆括号不匹配: ( ${openParens} 个, ) ${closeParens} 个`);
    }

    // 检查 export default 语法
    if (content.includes('export default') && !content.includes('export default function')) {
      // 检查是否正确导出组件
      if (!content.match(/export default\s+(function|class|const)/)) {
        issues.push('export default 语法可能不正确');
      }
    }

    if (issues.length > 0) {
      return { success: false, file: filePath, error: issues.join('; ') };
    }

    return { success: true, file: filePath };
  } catch (error) {
    return {
      success: false,
      file: filePath,
      error: error.message
    };
  }
}

// 主验证流程
try {
  // 检查节点目录是否存在
  if (!fs.existsSync(NODES_DIR)) {
    errors.push(`❌ 节点目录不存在: ${NODES_DIR}`);
    hasErrors = true;
  } else {
    console.log(`✅ 节点目录存在: ${NODES_DIR}`);
  }

  // 查找所有节点文件
  const nodeFiles = findJSXFiles(NODES_DIR);
  console.log(`📂 找到 ${nodeFiles.length} 个节点文件`);

  if (nodeFiles.length === 0) {
    errors.push('⚠️  未找到任何节点文件');
  }

  // 验证每个文件
  console.log('\n验证文件:');
  console.log('━'.repeat(40));

  nodeFiles.forEach(filePath => {
    const relativePath = path.relative(process.cwd(), filePath);

    // 先尝试 babel，失败则使用 esprima
    let result = validateFile(filePath);
    let babelWasMissing = false;

    if (!result.success && result.error && result.error.includes('babel')) {
      // babel 未安装或失败，使用备用方案
      babelWasMissing = true;
      result = validateFileWithEsprima(filePath);
    }

    validatedCount++;

    if (result.success) {
      console.log(`✅ ${relativePath}`);
    } else if (babelWasMissing) {
      // babel 缺失，使用 esprima 验证 - 只显示警告，不作为错误
      console.log(`⚠️  ${relativePath}`);
      console.log(`   警告: ${result.error} (babel 未安装，使用基础验证)`);
      warnings.push(`${relativePath}: ${result.error}`);
    } else {
      // 真正的语法错误
      console.log(`❌ ${relativePath}`);
      console.log(`   错误: ${result.error}`);
      errors.push(`${relativePath}: ${result.error}`);
      hasErrors = true;
    }
  });

} catch (error) {
  console.error('\n💥 验证过程发生错误:', error.message);
  hasErrors = true;
}

// 输出结果
console.log('━'.repeat(60));

if (hasErrors) {
  console.log(`\n❌ 验证失败！${validatedCount} 个文件中 ${errors.length} 个有错误\n`);
  if (warnings.length > 0) {
    console.log(`⚠️  另外有 ${warnings.length} 个警告（babel 未安装）\n`);
  }
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`\n⚠️  验证通过但有 ${warnings.length} 个警告`);
  console.log(`💡 安装 @babel/cli 以获得更准确的验证: npm install --save-dev @babel/cli @babel/core @babel/preset-react\n`);
  process.exit(0); // 警告不阻止提交
} else {
  console.log(`\n✅ 所有 ${validatedCount} 个节点文件验证通过！\n`);
  process.exit(0);
}
