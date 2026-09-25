@echo off
chcp 936 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  物业管理系统 - 启动后端服务 (SpringBoot + MyBatis + MySQL)
REM  优先使用已打包的 jar, 没有则用 Maven 运行
REM ============================================================

cd /d "%~dp0backend"

REM 某些终端环境会预置 SERVER_PORT, 把 8080 顶掉, 这里强制锁定 8080
set "SERVER_PORT=8080"

echo.
echo ============================================================
echo   物业管理系统 - 启动后端服务
echo ============================================================
echo.

REM ---------- 数据库连接信息 ----------
if not defined DB_USERNAME set "DB_USERNAME=root"
set /p INPUT_USER=MySQL 用户名(默认 root, 直接回车跳过):
if not "!INPUT_USER!"=="" set "DB_USERNAME=!INPUT_USER!"
set /p DB_PASSWORD=MySQL 密码(与应用 application.yml 保持一致):
if "!DB_PASSWORD!"=="" (
    echo [提示] 未输入密码, 将使用 application.yml 中的默认值。
)
echo [环境] 数据库用户: !DB_USERNAME!
echo.

REM ---------- 定位 JDK ----------
set "JAVA_EXE="
if exist "C:\Program Files\Java\jdk-17\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    set "JAVA_EXE=C:\Program Files\Java\jdk-17\bin\java.exe"
)
if not defined JAVA_EXE (
    for /f "delims=" %%i in ('where java 2^>nul') do (
        if not defined JAVA_EXE set "JAVA_EXE=%%i"
    )
)
if not defined JAVA_EXE (
    echo [错误] 未找到 Java, 请先安装 JDK 17 并配置 JAVA_HOME。
    pause
    exit /b 1
)
echo [环境] Java: !JAVA_EXE!
echo.

REM ---------- 方式一: 直接运行打好的 jar ----------
set "JAR="
for %%f in (target\property-management-system-*.jar) do (
    echo %%f | findstr /i "sources javadoc original" >nul || set "JAR=%%f"
)

if defined JAR (
    echo [启动] 使用已打包的 jar: !JAR!
    echo.
    echo ------------------------------------------------------------
    echo   接口地址: http://localhost:8080/api
    echo   前端入口: ..\frontend\index.html
    echo   按 Ctrl+C 可停止服务
    echo ------------------------------------------------------------
    echo.
    "!JAVA_EXE!" -Dfile.encoding=UTF-8 -jar "!JAR!"
    goto :done
)

REM ---------- 方式二: 回退到 Maven ----------
echo [提示] 未找到打包好的 jar, 尝试用 Maven 启动...
set "MVN="
where mvn >nul 2>&1 && set "MVN=mvn"
if not defined MVN if exist "D:\tools\maven363\bin\mvn.cmd" set "MVN=D:\tools\maven363\bin\mvn.cmd"

if not defined MVN (
    echo.
    echo [错误] 既没有 target 下的 jar, 也没有可用的 Maven。
    echo        请先双击执行  4-编译打包.bat
    pause
    exit /b 1
)

echo [启动] 使用 Maven: !MVN!
echo [提示] 按 Ctrl+C 可停止服务
echo.
call "!MVN!" spring-boot:run

:done
echo.
echo [服务已停止]
pause
