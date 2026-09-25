@echo off
chcp 936 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  物业管理系统 - 启动前端界面
REM  用 Node.js 起一个静态服务器, 监听 0.0.0.0
REM  这样局域网内的其它电脑/手机也能打开同一套界面
REM  说明: 本机没有 Node 时会退回 Python; 两者都没有则直接打开本地文件
REM ============================================================

cd /d "%~dp0frontend"

echo.
echo ============================================================
echo   物业管理系统 - 启动前端界面
echo ============================================================
echo.

set "PORT=9000"
set "RUNNER="
set "RUN_EXE="

REM ---------- 1) 优先使用 Node.js ----------
if exist "C:\Program Files\nodejs\node.exe" set "RUN_EXE=C:\Program Files\nodejs\node.exe"
if not defined RUN_EXE (
    for /f "delims=" %%i in ('where node 2^>nul') do (
        if not defined RUN_EXE set "RUN_EXE=%%i"
    )
)
if defined RUN_EXE (
    "!RUN_EXE!" -v >nul 2>&1
    if errorlevel 1 set "RUN_EXE="
)
if defined RUN_EXE set "RUNNER=node"

REM ---------- 2) 没有 Node 就找 Python ----------
REM 注意: 要排除 Windows 应用商店的占位符(0 字节的 python.exe), 它不能真正运行
if not defined RUNNER (
    for /f "delims=" %%i in ('where python 2^>nul ^| findstr /i /v "WindowsApps"') do (
        if not defined PY_EXE set "PY_EXE=%%i"
    )
    if defined PY_EXE (
        set "RUNNER=python"
        set "RUN_EXE=!PY_EXE!"
    )
)

REM ---------- 3) 两者都没有, 只能直接打开本地文件 ----------
if not defined RUNNER (
    echo [提示] 未检测到 Node.js, 也没有可用的 Python。
    echo        将直接用浏览器打开本地页面, 这种方式只有你自己能看, 别人无法访问。
    echo        如需让同事访问, 请先安装 Node.js 后重新运行本脚本。
    echo.
    start "" "index.html"
    pause
    exit /b 0
)

REM ---------- 取本机局域网 IP, 供他人访问 ----------
set "LANIP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    if not defined LANIP (
        set "RAW=%%a"
        set "RAW=!RAW: =!"
        set "LANIP=!RAW!"
    )
)

REM ---------- 端口是否已被占用 ----------
set "BUSY="
for /f "delims=" %%l in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    if not defined BUSY set "BUSY=1"
)
if defined BUSY (
    echo [提示] 端口 %PORT% 已经在监听, 前端服务可能已经在运行了。
    echo        现在为你打开页面; 若仍然打不开, 请先关掉旧的前端窗口再重试。
    echo.
    start "" "http://localhost:%PORT%/index.html"
    pause
    exit /b 0
)

echo [运行环境] !RUNNER!  =^>  !RUN_EXE!
echo.
echo [本机访问]   http://localhost:%PORT%/index.html
if defined LANIP (
    echo [局域网访问] http://!LANIP!:%PORT%/index.html
    echo                ^(把上面这个地址发给同事, 需在同一局域网/WiFi^)
) else (
    echo [局域网访问] 未识别到 IPv4 地址, 可手动执行 ipconfig 查看
)
echo.
echo [重要] 别人要能用, 后端也必须是对外监听的:
echo        请另外双击运行 2-启动后端.bat
echo [重要] 若对方打不开, 双击运行 5-局域网访问.bat 放行防火墙端口
echo.
echo [提示] 本窗口不要关闭, 按 Ctrl+C 可停止服务
echo.

REM 延迟约 2 秒再打开浏览器, 等服务器真正就绪
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:%PORT%/index.html"

if "!RUNNER!"=="node" (
    "!RUN_EXE!" "%~dp0frontend\serve.js" %PORT% 0.0.0.0
) else (
    "!RUN_EXE!" -m http.server %PORT% --bind 0.0.0.0
)

echo.
echo [服务已停止]
pause
