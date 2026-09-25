@echo off
chcp 936 >nul
setlocal

REM ============================================================
REM  物业管理系统 - 编译打包后端
REM  产出: backend\target\property-management-system-1.0.0.jar
REM ============================================================

cd /d "%~dp0backend"

echo.
echo ============================================================
echo   编译打包后端 (SpringBoot + MyBatis)
echo ============================================================
echo.

REM ---------- 定位 JDK ----------
if exist "C:\Program Files\Java\jdk-17\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
) else (
    for /f "tokens=2,*" %%a in ('reg query "HKLM\SOFTWARE\JavaSoft\JDK" /s /v JavaHome 2^>nul ^| findstr /i JavaHome') do (
        if not defined JAVA_HOME set "JAVA_HOME=%%b"
    )
)
if not defined JAVA_HOME (
    echo [错误] 未找到 JDK, 请设置环境变量 JAVA_HOME 指向 JDK 目录。
    pause
    exit /b 1
)
echo [环境] JAVA_HOME=%JAVA_HOME%
echo.

REM ---------- 定位 Maven ----------
set "MVN="
where mvn >nul 2>&1 && set "MVN=mvn"
if not defined MVN if exist "D:\tools\maven363\bin\mvn.cmd" set "MVN=D:\tools\maven363\bin\mvn.cmd"
if not defined MVN (
    echo [错误] 未找到 Maven。请安装 Maven 并加入 PATH, 或将其放到 D:\tools\maven363
    pause
    exit /b 1
)
echo [环境] Maven=%MVN%
echo.

echo [1/1] 开始打包 (首次执行需要下载依赖, 请耐心等待)...
call "%MVN%" clean package -DskipTests

if errorlevel 1 (
    echo.
    echo [失败] 打包失败, 请查看上方 Maven 输出。
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   打包成功
for %%f in (target\property-management-system-*.jar) do echo   %%f
echo   启动方式: 双击 2-启动后端.bat
echo ============================================================
pause
