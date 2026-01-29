#!/usr/bin/env node
/**
 * Claude Code 配置自动同步检查脚本
 *
 * 功能:
 * - 检查 .claude/settings.local.json 是否存在
 * - 检查 .claude/.synced 同步标记
 * - 自动从模板创建配置文件
 * - 创建/更新同步标记
 *
 * 使用方式:
 * - node scripts/check-claude-sync.js           # 自动同步（默认）
 * - node scripts/check-claude-sync.js --check   # 只检查，不同步
 * - node scripts/check-claude-sync.js --verify  # 验证模式
 * - node scripts/check-claude-sync.js --git-hook # Git hook 模式
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ==================== 配置 ====================

const SETTINGS_PATH = '.claude/settings.local.json';
const SETTINGS_EXAMPLE = '.claude/settings.local.json.example';
const SYNC_MARKER = '.claude/.synced';
const SYNC_EXPIRY_DAYS = 7; // 同步标记过期天数

// ==================== 核心函数 ====================

/**
 * 检查本地配置文件
 */
function checkLocalConfig() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    return { exists: false, needsSync: true, reason: '本地配置不存在' };
  }

  try {
    // 验证 JSON 格式
    const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    JSON.parse(content);
    return { exists: true, needsSync: false, reason: '本地配置已存在' };
  } catch (error) {
    return { exists: true, needsSync: true, reason: '本地配置损坏' };
  }
}

/**
 * 检查同步标记
 */
function checkSyncMarker() {
  if (!fs.existsSync(SYNC_MARKER)) {
    return { exists: false, needsSync: true, reason: '未找到同步标记' };
  }

  try {
    const marker = JSON.parse(fs.readFileSync(SYNC_MARKER, 'utf-8'));
    const lastSync = new Date(marker.syncedAt);
    const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceSync > SYNC_EXPIRY_DAYS) {
      return {
        exists: true,
        needsSync: true,
        reason: `同步标记已过期 (${Math.floor(daysSinceSync)} 天前)`,
        daysSinceSync: Math.floor(daysSinceSync)
      };
    }

    return {
      exists: true,
      needsSync: false,
      reason: `已同步 (${Math.floor(daysSinceSync)} 天前)`,
      daysSinceSync: Math.floor(daysSinceSync)
    };
  } catch (error) {
    return { exists: false, needsSync: true, reason: '同步标记损坏' };
  }
}

/**
 * 执行配置同步
 */
function syncConfig() {
  try {
    // 检查模板文件是否存在
    if (!fs.existsSync(SETTINGS_EXAMPLE)) {
      console.error(`❌ 错误: 模板文件不存在: ${SETTINGS_EXAMPLE}`);
      return false;
    }

    // 从模板创建本地配置
    fs.copyFileSync(SETTINGS_EXAMPLE, SETTINGS_PATH);
    console.log(`✅ 已创建 ${SETTINGS_PATH}`);

    // 创建同步标记
    const marker = {
      syncedAt: new Date().toISOString(),
      version: getPackageVersion(),
      platform: os.platform(),
      hostname: os.hostname(),
    };
    fs.writeFileSync(SYNC_MARKER, JSON.stringify(marker, null, 2));
    console.log(`✅ 已创建同步标记: ${SYNC_MARKER}`);

    return true;
  } catch (error) {
    console.error(`❌ 同步失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取 package.json 版本号
 */
function getPackageVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 显示配置状态详情
 */
function showDetailedStatus() {
  const localConfig = checkLocalConfig();
  const syncMarker = checkSyncMarker();

  console.log('📄 配置文件:');
  console.log(`   状态: ${localConfig.exists ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`   原因: ${localConfig.reason}`);

  if (localConfig.exists) {
    const stats = fs.statSync(SETTINGS_PATH);
    console.log(`   大小: ${stats.size} 字节`);
    console.log(`   修改时间: ${stats.mtime.toLocaleString('zh-CN')}`);
  }

  console.log('');
  console.log('📌 同步标记:');
  console.log(`   状态: ${syncMarker.exists ? '✅ 存在' : '❌ 不存在'}`);

  if (syncMarker.exists) {
    try {
      const marker = JSON.parse(fs.readFileSync(SYNC_MARKER, 'utf-8'));
      console.log(`   同步时间: ${new Date(marker.syncedAt).toLocaleString('zh-CN')}`);
      console.log(`   项目版本: ${marker.version}`);
      console.log(`   平台: ${marker.platform}`);
      console.log(`   主机名: ${marker.hostname}`);
    } catch (error) {
      console.log(`   ⚠️  标记文件损坏`);
    }
  } else {
    console.log(`   原因: ${syncMarker.reason}`);
  }

  console.log('');

  const needsSync = !localConfig.exists || syncMarker.needsSync;
  console.log(`📊 总体状态: ${needsSync ? '⚠️  需要同步' : '✅ 配置已同步'}`);

  return needsSync ? 1 : 0;
}

/**
 * Git hook 模式 - 只检测，不执行同步
 */
function gitHookMode() {
  const localConfig = checkLocalConfig();
  const syncMarker = checkSyncMarker();
  const needsSync = !localConfig.exists || syncMarker.needsSync;

  if (needsSync) {
    console.log('⚠️  检测到配置需要同步');
    console.log('💡 运行 npm install 同步配置');
    return 1;
  } else {
    console.log('✅ 配置已是最新');
    return 0;
  }
}

// ==================== 主函数 ====================

function main() {
  const args = process.argv.slice(2);
  const isGitHook = args.includes('--git-hook');
  const isVerify = args.includes('--verify');
  const isCheck = args.includes('--check');

  console.log('');
  console.log('🔍 Claude Code 配置检查');
  console.log('========================');
  console.log('');

  // 处理不同的模式
  if (isCheck) {
    return showDetailedStatus();
  }

  if (isGitHook) {
    return gitHookMode();
  }

  // 检查配置状态
  const localConfig = checkLocalConfig();
  const syncMarker = checkSyncMarker();

  // 判断是否需要同步
  const needsSync = !localConfig.exists || syncMarker.needsSync;

  if (isVerify) {
    // 验证模式：只检查，不同步
    console.log(`📊 配置状态: ${localConfig.reason}`);
    console.log(`📊 同步状态: ${syncMarker.reason}`);
    console.log('');
    console.log(needsSync ? '⚠️  需要同步配置' : '✅ 配置已同步');
    return needsSync ? 1 : 0;
  }

  // 默认模式：自动同步
  if (needsSync) {
    console.log('🔧 需要同步配置');
    console.log(`   原因: ${localConfig.exists ? syncMarker.reason : localConfig.reason}`);
    console.log('');
    console.log('📝 正在自动同步配置...');
    console.log('');

    const success = syncConfig();

    if (success) {
      console.log('');
      console.log('✅ 配置同步完成！');
      console.log('');
      console.log('📌 后续操作：');
      console.log('   1. 运行 npm run dev 启动开发服务器');
      console.log('   2. 编辑 .claude/settings.local.json 添加本地权限（如需要）');
      console.log('   3. 编辑 .env 添加 API Key（如需要）');
      console.log('');
    } else {
      console.log('');
      console.log('❌ 配置同步失败');
      console.log('');
      return 1;
    }
  } else {
    console.log('✅ 配置已同步，无需操作');
    console.log(`   状态: ${syncMarker.reason}`);
    console.log('');
  }

  return 0;
}

// ==================== 导出 ====================

module.exports = {
  checkLocalConfig,
  checkSyncMarker,
  syncConfig,
};

// ==================== 运行 ====================

if (require.main === module) {
  const exitCode = main();
  process.exit(exitCode);
}
