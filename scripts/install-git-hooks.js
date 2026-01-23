#!/usr/bin/env node
/**
 * Git Hooks 安装脚本
 *
 * 功能:
 * - 从 .git-hooks/ 目录安装 Git hooks 到 .git/hooks/
 * - 跨平台支持（自动选择 Bash 或 PowerShell）
 * - 设置正确的执行权限
 *
 * 使用方式:
 * - node scripts/install-git-hooks.js          # 安装 hooks
 * - node scripts/install-git-hooks.js --check  # 检查 hooks 状态
 * - node scripts/install-git-hooks.js --uninstall # 卸载 hooks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==================== 配置 ====================

const GIT_HOOKS_SOURCE_DIR = '.git-hooks';
const GIT_HOOKS_TARGET_DIR = '.git/hooks';
const HOOKS_TO_INSTALL = [
  'post-merge',
  'post-checkout',
];

// ==================== 核心函数 ====================

/**
 * 检测当前平台
 */
function getPlatform() {
  return process.platform;
}

/**
 * 获取 Hook 文件扩展名
 */
function getHookExtension(platform) {
  return platform === 'win32' ? '.ps1' : '';
}

/**
 * 检查 Git 仓库
 */
function checkGitRepository() {
  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    console.error('❌ 错误: 当前目录不是 Git 仓库');
    console.error('   请在项目根目录运行此脚本');
    return false;
  }
  return true;
}

/**
 * 检查源 Hook 文件是否存在
 */
function checkSourceHooks(platform) {
  const ext = getHookExtension(platform);
  const missingHooks = [];

  for (const hook of HOOKS_TO_INSTALL) {
    const sourceFile = path.join(GIT_HOOKS_SOURCE_DIR, hook + ext);
    if (!fs.existsSync(sourceFile)) {
      missingHooks.push(hook + ext);
    }
  }

  if (missingHooks.length > 0) {
    console.error('❌ 错误: 缺少以下 Hook 模板文件:');
    missingHooks.forEach(hook => console.error(`   - ${hook}`));
    return false;
  }

  return true;
}

/**
 * 安装单个 Hook
 */
function installHook(hookName, platform) {
  const ext = getHookExtension(platform);
  const sourceFile = path.join(GIT_HOOKS_SOURCE_DIR, hookName + ext);
  const targetFile = path.join(GIT_HOOKS_TARGET_DIR, hookName);

  try {
    if (platform === 'win32') {
      // Windows: 创建包装脚本调用 PowerShell
      const wrapperContent = `#!/bin/sh
# Git hook wrapper for Windows
# This wrapper calls the PowerShell script

powershell -ExecutionPolicy Bypass -File "${process.cwd().replace(/\\/g, '/')}/.git-hooks/${hookName}.ps1" "$@"
`;
      fs.writeFileSync(targetFile, wrapperContent, { mode: 0o755 });
    } else {
      // Unix: 直接复制 Bash 脚本
      fs.copyFileSync(sourceFile, targetFile);
      // 设置执行权限
      fs.chmodSync(targetFile, 0o755);
    }

    return { success: true, hook: hookName };
  } catch (error) {
    return { success: false, hook: hookName, error: error.message };
  }
}

/**
 * 安装所有 Hooks
 */
function installHooks(platform) {
  console.log('');
  console.log('📦 安装 Git Hooks');
  console.log('==================');
  console.log('');
  console.log(`📌 平台: ${platform === 'win32' ? 'Windows (PowerShell)' : 'Unix (Bash)'}`);
  console.log(`📁 源目录: ${GIT_HOOKS_SOURCE_DIR}/`);
  console.log(`📁 目标目录: ${GIT_HOOKS_TARGET_DIR}/`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const hookName of HOOKS_TO_INSTALL) {
    const result = installHook(hookName, platform);

    if (result.success) {
      console.log(`  ✅ ${result.hook}`);
      successCount++;
    } else {
      console.log(`  ❌ ${result.hook}: ${result.error}`);
      failCount++;
    }
  }

  console.log('');
  console.log(`📊 安装结果: ${successCount} 成功, ${failCount} 失败`);
  console.log('');

  return failCount === 0;
}

/**
 * 检查 Hooks 状态
 */
function checkHooks(platform) {
  console.log('');
  console.log('🔍 检查 Git Hooks 状态');
  console.log('======================');
  console.log('');

  let installedCount = 0;
  let missingCount = 0;

  for (const hookName of HOOKS_TO_INSTALL) {
    const targetFile = path.join(GIT_HOOKS_TARGET_DIR, hookName);

    if (fs.existsSync(targetFile)) {
      console.log(`  ✅ ${hookName} (已安装)`);
      installedCount++;
    } else {
      console.log(`  ❌ ${hookName} (未安装)`);
      missingCount++;
    }
  }

  console.log('');
  console.log(`📊 状态: ${installedCount} 已安装, ${missingCount} 未安装`);
  console.log('');

  if (missingCount > 0) {
    console.log('💡 提示: 运行 "npm run sync:hooks" 安装缺失的 hooks');
    console.log('');
  }

  return missingCount === 0;
}

/**
 * 卸载 Hooks
 */
function uninstallHooks() {
  console.log('');
  console.log('🗑️  卸载 Git Hooks');
  console.log('==================');
  console.log('');

  let successCount = 0;
  let missingCount = 0;

  for (const hookName of HOOKS_TO_INSTALL) {
    const targetFile = path.join(GIT_HOOKS_TARGET_DIR, hookName);

    if (fs.existsSync(targetFile)) {
      try {
        fs.unlinkSync(targetFile);
        console.log(`  ✅ ${hookName} (已删除)`);
        successCount++;
      } catch (error) {
        console.log(`  ❌ ${hookName}: ${error.message}`);
      }
    } else {
      console.log(`  ⚠️  ${hookName} (不存在)`);
      missingCount++;
    }
  }

  console.log('');
  console.log(`📊 卸载结果: ${successCount} 成功, ${missingCount} 不存在`);
  console.log('');
}

// ==================== 主函数 ====================

function main() {
  const args = process.argv.slice(2);
  const isCheck = args.includes('--check');
  const isUninstall = args.includes('--uninstall');

  // 检查 Git 仓库
  if (!checkGitRepository()) {
    return 1;
  }

  // 获取平台
  const platform = getPlatform();

  // 检查模式
  if (isCheck) {
    const allInstalled = checkHooks(platform);
    return allInstalled ? 0 : 1;
  }

  // 卸载模式
  if (isUninstall) {
    uninstallHooks();
    console.log('✅ Hooks 卸载完成');
    return 0;
  }

  // 安装模式
  if (!checkSourceHooks(platform)) {
    return 1;
  }

  const success = installHooks(platform);

  if (success) {
    console.log('✅ Git Hooks 安装完成！');
    console.log('');
    console.log('📌 Hooks 功能:');
    console.log('   - post-merge:  git pull/merge 后检查配置');
    console.log('   - post-checkout: git checkout/分支切换后检查配置');
    console.log('');
    console.log('💡 提示: Git hooks 会在对应操作后自动运行');
    console.log('         如果检测到配置变化，会提示运行 npm install');
    console.log('');
    return 0;
  } else {
    console.log('❌ Git Hooks 安装失败');
    console.log('');
    return 1;
  }
}

// ==================== 运行 ====================

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}

module.exports = { installHooks, checkHooks, uninstallHooks };
