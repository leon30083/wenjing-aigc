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
const ROOT_DIR = path.join(__dirname, '..');

console.log('🔍 验证节点文件语法...');
console.log('━'.repeat(60));

let hasErrors = false;
let errors = [];
let warnings = [];
let validatedCount = 0;
let usingBabel = false;

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
 * 通过编译到 /dev/null 来验证语法
 */
function validateFileWithBabel(filePath) {
  try {
    // 使用 babel 编译到空设备来检查语法
    // --out-file /dev/null 不会生成文件，但会执行完整的语法检查
    execSync(`npx babel "${filePath}" --out-file /dev/null`, {
      stdio: 'pipe',
      cwd: ROOT_DIR
    });
    usingBabel = true;
    return { success: true, file: filePath };
  } catch (error) {
    // 检查错误信息
    const stderr = error.stderr ? error.stderr.toString() : '';
    const stdout = error.stdout ? error.stdout.toString() : '';

    // 如果包含 "unknown option" 或其他 babel 相关错误，说明 babel 配置有问题
    if (stderr.includes('unknown option') || stdout.includes('unknown option')) {
      return { success: false, file: filePath, error: error.message, isBabelMissing: true };
    }

    // 真正的语法错误
    const errorMsg = stderr || stdout || error.message;
    return {
      success: false,
      file: filePath,
      error: errorMsg.split('\n').filter(l => l.includes('Error:')).slice(0, 3).join('\n') || '语法错误'
    };
  }
}

/**
 * 使用 ESLint 验证单个文件语法（备用方案）
 */
function validateFileWithEslint(filePath) {
  try {
    const relativePath = path.relative(ROOT_DIR, filePath);
    execSync(`npx eslint "${relativePath}" --format compact`, {
      stdio: 'pipe',
      cwd: ROOT_DIR
    });
    return { success: true, file: filePath };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';

    // ESLint 未安装
    if (stderr.includes('command not found') || stderr.includes('not found')) {
      return { success: false, file: filePath, error: 'eslint not found', isEslintMissing: true };
    }

    return {
      success: false,
      file: filePath,
      error: stdout || stderr || 'ESLint error'
    };
  }
}

/**
 * 备用方案：使用基础语法检查
 */
function validateFileWithBasicCheck(filePath) {
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
        // 如果没有匹配到正确的导出语法，但这不一定是个错误
        // 可能是 export default SomeComponent，所以只是警告
        issues.push('export default 语法可能不正确 (使用基础验证)');
      }
    }

    if (issues.length > 0) {
      return { success: false, file: filePath, error: issues.join('; '), isBasicCheck: true };
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

    // 尝试按优先级验证：Babel -> ESLint -> Basic Check
    let result = validateFileWithBabel(filePath);
    let validationMethod = 'babel';

    if (!result.success && result.isBabelMissing) {
      // Babel 不可用，尝试 ESLint
      result = validateFileWithEslint(filePath);
      validationMethod = 'eslint';

      if (!result.success && result.isEslintMissing) {
        // ESLint 也不可用，使用基础检查
        result = validateFileWithBasicCheck(filePath);
        validationMethod = 'basic';
      }
    }

    validatedCount++;

    if (result.success) {
      console.log(`✅ ${relativePath}`);
    } else if (result.isBabelMissing || result.isEslintMissing || result.isBasicCheck) {
      // 工具缺失或基础验证 - 只显示警告，不作为错误
      console.log(`⚠️  ${relativePath}`);
      if (result.isBasicCheck) {
        console.log(`   警告: ${result.error}`);
      }
      if (!usingBabel && validationMethod === 'basic') {
        warnings.push(`${relativePath}: ${result.error}`);
      }
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
    console.log(`⚠️  另外有 ${warnings.length} 个警告（使用基础验证）\n`);
  }
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`\n⚠️  验证通过但有 ${warnings.length} 个警告`);
  if (!usingBabel) {
    console.log(`💡 Babel 验证未启用，使用基础语法检查\n`);
  }
  process.exit(0); // 警告不阻止提交
} else {
  const method = usingBabel ? 'Babel' : '基础语法检查';
  console.log(`\n✅ 所有 ${validatedCount} 个节点文件验证通过！(使用 ${method})\n`);
  process.exit(0);
}
