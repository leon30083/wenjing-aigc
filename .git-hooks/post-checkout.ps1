commit e5e6c55b3d4aee9ffa8fd266ff98ded33644758a
Author: 罗森 <leon3000@live.cn>
Date:   Fri Jan 23 10:58:53 2026 +0800

    fix: 修复 Git Hooks 编码问题
    
    - 移除 emoji 字符，使用纯文本输出
    - 修复 PowerShell 解析错误
    - 更新 Bash 和 PowerShell hook 脚本
    - 测试验证 hooks 正常触发

diff --git a/.git-hooks/post-checkout.ps1 b/.git-hooks/post-checkout.ps1
index 91cfe99..9478340 100644
--- a/.git-hooks/post-checkout.ps1
+++ b/.git-hooks/post-checkout.ps1
@@ -1,25 +1,32 @@
 # Git post-checkout hook (Windows PowerShell)
 #
-# 触发时机: git checkout 或 git branch 切换后
-# 功能: 检测配置变化，提示用户同步配置
-#
-# 参数: $args[0] = previous ref, $args[1] = new ref, $args[2] = branch checkout flag (1=branch)
+# Trigger: git checkout or git branch switch
+# Function: Check config changes and prompt user to sync
+
+param(
+  [Parameter(Mandatory=$false)]
+  [string]$PreviousRef,
+  [Parameter(Mandatory=$false)]
+  [string]$NewRef,
+  [Parameter(Mandatory=$false)]
+  [string]$BranchFlag
+)
 
-# 只在分支切换时检查（不适用于文件签出）
-if ($args[2] -ne "1") {
+# Only check on branch switch (not file checkout)
+if ($BranchFlag -ne "1") {
     exit 0
 }
 
 Write-Host ""
-Write-Host "🔍 [Git Hook] 检测到分支切换，正在检查配置..." -ForegroundColor Cyan
+Write-Host "[Git Hook] Detected branch switch, checking config..." -ForegroundColor Cyan
 Write-Host ""
 
-# 运行配置检查脚本（Git hook 模式）
+# Run config check script (Git hook mode)
 $exitCode = & node scripts/check-claude-sync.js --git-hook
 
-# 检查退出码
+# Check exit code
 if ($exitCode -ne 0) {
     Write-Host ""
-    Write-Host "💡 提示: 运行 'npm install' 同步最新配置" -ForegroundColor Yellow
+    Write-Host "[Git Hook] Config needs sync. Run: npm install" -ForegroundColor Yellow
     Write-Host ""
 }
