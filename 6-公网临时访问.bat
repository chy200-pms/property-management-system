@echo off
chcp 936 >nul
title 物业管理系统 - 临时公网访问
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo   物业管理系统 - 临时公网访问（不用注册任何账号）
echo ============================================================
echo.
echo  作用: 把本机正在运行的系统映射成一个公网网址,
echo        发给任何人就能直接打开。
echo.
echo  必须知道的三件事:
echo    1) 本窗口要一直开着; 关掉窗口 = 链接立刻失效
echo    2) 免费隧道约 60 分钟后到期, 重新运行本脚本即可拿到新链接
echo    3) 本机 (Windows) 必须开着机, 不能关机/休眠
echo.
echo  ------------------------------------------------------------
echo.

rem ---------- 1. 检查后端 8080 ----------
netstat -ano | findstr "LISTENING" | findstr ":8080" >nul
if errorlevel 1 (
    echo [停止] 8080 端口没有服务在监听, 后端还没启动。
    echo        请先双击  2-启动后端.bat  (密码输入 a123456),
    echo        等出现 "Started PropertyApplication" 之后再运行本脚本。
    echo.
    pause
    exit /b 1
)
echo [1/4] 后端 8080 正常

rem ---------- 2. 找 Node ----------
set "NODE_EXE="
for /f "delims=" %%i in ('where node 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%i"
)
if not defined NODE_EXE (
    echo [停止] 没找到 Node.js, 无法启动前端页面服务。
    echo        请先安装 Node.js (https://nodejs.org) 后重试。
    echo.
    pause
    exit /b 1
)
echo [2/4] Node: %NODE_EXE%

rem ---------- 3. 找 ssh (Windows 10/11 自带) ----------
where ssh >nul 2>nul
if errorlevel 1 (
    echo [停止] 没找到 ssh 客户端。
    echo        Windows: 设置 - 系统 - 可选功能 - 添加功能 - "OpenSSH 客户端"
    echo.
    pause
    exit /b 1
)
echo [3/4] ssh 客户端正常

rem ---------- 4. 启动前端 (带 /api 同源代理) ----------
netstat -ano | findstr "LISTENING" | findstr ":9000" >nul
if errorlevel 1 (
    echo [4/4] 正在启动前端服务 9000 (带 /api 同源代理)...
    pushd "%~dp0frontend"
    start "PMS-Frontend" /min "%NODE_EXE%" serve.js 9000 --api 8080
    popd
    ping -n 3 127.0.0.1 >nul
) else (
    echo [4/4] 前端 9000 已在运行, 直接复用
)

echo.
echo ============================================================
echo   正在建立公网隧道, 请稍候 5-15 秒...
echo.
echo   稍后会打印 https:// 开头的网址 —— 把它发给别人即可访问。
echo   同一个端口还有第二个备用网址, 第一个打不开就换第二个。
echo ============================================================
echo.
echo   (按 Ctrl+C 或直接关掉本窗口, 即停止对外分享)
echo.

ssh -p 443 -R0:localhost:9000 -o StrictHostKeyChecking=no -o UserKnownHostsFile="%TEMP%\pms_known_hosts" -o ServerAliveInterval=30 -o ConnectTimeout=15 -o ExitOnForwardFailure=yes a.pinggy.io

echo.
echo ------------------------------------------------------------
echo  隧道已断开 (可能是到了 60 分钟上限, 或网络抖动)。
echo  需要继续分享的话, 重新运行本脚本即可。
echo ------------------------------------------------------------
echo.
pause
