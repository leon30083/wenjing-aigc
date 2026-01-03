@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
:: 配置
:: ========================================
set "BACKEND_PORT=9000"
set "FRONTEND_PORT=5173"

:: ========================================
:: 欢迎信息
:: ========================================
cls
echo ========================================
echo   WinJin AIGC 停止开发环境
echo ========================================
echo.

:: ========================================
:: 停止后端
:: ========================================
echo [1/2] 停止后端服务器...
set "BACKEND_STOPPED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set "BACKEND_STOPPED=1"
)

if !BACKEND_STOPPED! equ 0 (
    echo [提示] 后端服务未运行
) else (
    echo [✓] 后端服务已停止
)
echo.

:: ========================================
:: 停止前端
:: ========================================
echo [2/2] 停止前端开发服务器...
set "FRONTEND_STOPPED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set "FRONTEND_STOPPED=1"
)

if !FRONTEND_STOPPED! equ 0 (
    echo [提示] 前端服务未运行
) else (
    echo [✓] 前端服务已停止
)
echo.

:: ========================================
:: 完成提示
:: ========================================
echo ========================================
echo   ✓ 开发环境已停止
echo ========================================
echo.

timeout /t 2 /nobreak >nul
