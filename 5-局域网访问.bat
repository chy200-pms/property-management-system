@echo off
chcp 936 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  物业管理系统 - 局域网访问助手
REM  作用: 1) 列出本机局域网地址
REM        2) 放行防火墙的 8080(后端) / 9000(前端) 端口
REM  说明: 放行防火墙需要管理员权限, 请"右键 - 以管理员身份运行"
REM ============================================================

cd /d "%~dp0"

set "PORT_FRONT=9000"
set "PORT_BACK=8080"

echo.
echo ============================================================
echo   物业管理系统 - 局域网访问助手
echo ============================================================
echo.

echo [1/2] 本机网络地址
echo ------------------------------------------------------------
set "FOUND="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "RAW=%%a"
    set "RAW=!RAW: =!"
    if not defined FOUND set "FOUND=!RAW!"
    echo    http://!RAW!:!PORT_FRONT!/index.html
)
if not defined FOUND echo    未识别到 IPv4 地址, 请手动执行 ipconfig 查看
echo.
echo    以上是发给同事的地址(需在同一局域网/WiFi)。
echo    后端接口会自动指向同一台机器的 %PORT_BACK% 端口, 无需配置。
echo.

echo [2/2] 放行防火墙端口 (TCP %PORT_FRONT% / %PORT_BACK%)
echo ------------------------------------------------------------
netsh advfirewall firewall delete rule name="物业管理系统-前端9000" >nul 2>&1
netsh advfirewall firewall delete rule name="物业管理系统-后端8080" >nul 2>&1

netsh advfirewall firewall add rule name="物业管理系统-前端9000" dir=in action=allow protocol=TCP localport=%PORT_FRONT% >nul 2>&1
if errorlevel 1 (
    echo    [需要管理员权限] 未放行 %PORT_FRONT%
) else (
    echo    [完成] 已放行 TCP %PORT_FRONT%
)

netsh advfirewall firewall add rule name="物业管理系统-后端8080" dir=in action=allow protocol=TCP localport=%PORT_BACK% >nul 2>&1
if errorlevel 1 (
    echo    [需要管理员权限] 未放行 %PORT_BACK%
) else (
    echo    [完成] 已放行 TCP %PORT_BACK%
)

echo.
echo    如果上面出现"需要管理员权限", 请关闭本窗口,
echo    右键本文件 - 以管理员身份运行, 再执行一次。
echo.

echo ============================================================
echo   使用步骤
echo   1) 双击 2-启动后端.bat   (MySQL 密码按本机实际填写)
echo   2) 双击 3-启动前端.bat
echo   3) 把 http://本机IP:9000/index.html 发给同事
echo   4) 同事用浏览器打开即可登录使用
echo ============================================================
pause
