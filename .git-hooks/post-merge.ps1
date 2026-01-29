commit e5e6c55b3d4aee9ffa8fd266ff98ded33644758a
Author: 罗森 <leon3000@live.cn>
Date:   Fri Jan 23 10:58:53 2026 +0800

    fix: 修复 Git Hooks 编码问题
    
    - 移除 emoji 字符，使用纯文本输出
    - 修复 PowerShell 解析错误
    - 更新 Bash 和 PowerShell hook 脚本
    - 测试验证 hooks 正常触发

diff --git a/.git-hooks/post-merge.ps1 b/.git-hooks/post-merge.ps1
index add2691..297d197 100644
--- a/.git-hooks/post-merge.ps1
+++ b/.git-hooks/post-merge.ps1
@@ -1,18 +1,18 @@
 # Git post-merge hook (Windows PowerShell)
 #
-# 触发时机: git pull 或 git merge 后
-# 功能: 检测配置变化，提示用户同步配置
+# Trigger: git pull or git merge
+# Function: Check config changes and prompt user to sync
 
 Write-Host ""
-Write-Host "🔍 [Git Hook] 检测到代码合并，正在检查配置..." -ForegroundColor Cyan
+Write-Host "[Git Hook] Detected code merge, checking config..." -ForegroundColor Cyan
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
