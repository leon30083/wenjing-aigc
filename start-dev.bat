@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
:: 配置
:: ========================================
set "BACKEND_PORT=9000"
set "FRONTEND_PORT=5173"
set "BROWSER_URL=http://localhost:%FRONTEND_PORT%/"

:: ========================================
:: 1. 欢迎信息
:: ========================================
cls
echo ========================================
echo   WinJin AIGC 开发环境启动工具
echo ========================================
echo.

:: ========================================
:: 2. 环境检查
:: ========================================
echo [1/5] 检查环境...
echo.

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [✓] Node.js 已安装

:: 检查 npm
where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 npm
    echo 请重新安装 Node.js
    echo.
    pause
    exit /b 1
)
echo [✓] npm 已安装

:: 检查 .env 文件
if not exist ".env" (
    if exist ".env.example" (
        echo [警告] 未找到 .env 文件
        echo 正在从 .env.example 复制...
        copy ".env.example" ".env" >nul
        echo [✓] 已创建 .env 文件
        echo [提示] 请编辑 .env 文件并填写 API Key
        echo.
    ) else (
        echo [错误] 未找到 .env 文件和 .env.example
        echo 请创建 .env 文件并填写配置
        echo.
        pause
        exit /b 1
    )
) else (
    echo [✓] .env 文件存在
)
echo.

:: ========================================
:: 3. 端口检查与清理
:: ========================================
echo [2/5] 检查端口占用...
echo.

:: 检查 9000 端口
netstat -ano | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [警告] 端口 %BACKEND_PORT% 已被占用
    set /p "KILL=是否终止占用端口的进程? (Y/N): "
    if /i "!KILL!"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
            echo 终止进程 %%a...
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 2 /nobreak >nul
        echo [✓] 端口 %BACKEND_PORT% 已清理
    ) else (
        echo [提示] 跳过端口清理，可能启动失败
    )
) else (
    echo [✓] 端口 %BACKEND_PORT% 可用
)
echo.

:: 检查 5173 端口
netstat -ano | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [警告] 端口 %FRONTEND_PORT% 已被占用
    set /p "KILL=是否终止占用端口的进程? (Y/N): "
    if /i "!KILL!"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%" ^| findstr "LISTENING"') do (
            echo 终止进程 %%a...
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 2 /nobreak >nul
        echo [✓] 端口 %FRONTEND_PORT% 已清理
    ) else (
        echo [提示] 跳过端口清理，可能启动失败
    )
) else (
    echo [✓] 端口 %FRONTEND_PORT% 可用
)
echo.

:: ========================================
:: 4. 启动服务
:: ========================================
echo [3/5] 启动后端服务器...
start "WinJin Backend" cmd /k "npm run server"
echo [✓] 后端启动中...
echo.

echo [4/5] 启动前端开发服务器...
cd src\client
start "WinJin Frontend" cmd /k "npm run dev"
cd ..\..
echo [✓] 前端启动中...
echo.

:: ========================================
:: 5. 等待服务启动
:: ========================================
echo [5/5] 等待服务启动...
timeout /t 5 /nobreak >nul
echo.

:: ========================================
:: 6. 打开浏览器
:: ========================================
echo 正在打开浏览器...
start "" "%BROWSER_URL%"
echo [✓] 浏览器已打开
echo.

:: ========================================
:: 7. 完成提示
:: ========================================
echo ========================================
echo   ✓ 开发环境已启动
echo ========================================
echo 后端: http://localhost:%BACKEND_PORT%/
echo 前端: http://localhost:%FRONTEND_PORT%/
echo.
echo 提示: 运行 stop-dev.bat 停止所有服务
echo ========================================
echo.

pause
