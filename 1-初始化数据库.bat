@echo off
chcp 936 >nul
setlocal

REM ============================================================
REM  物业管理系统 - 数据库初始化
REM  作用: 创建 property_db 数据库、14 张表, 并导入演示数据
REM ============================================================

cd /d "%~dp0"

set MYSQL_BIN=mysql
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
)

echo.
echo ============================================================
echo   物业管理系统 - 数据库初始化
echo ============================================================
echo.

if not exist "sql\property_db.sql" (
    echo [错误] 找不到 sql\property_db.sql, 请确认当前目录是否正确。
    pause
    exit /b 1
)

set /p DB_USER=请输入 MySQL 用户名(默认 root):
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS=请输入 MySQL 密码:
if "%DB_PASS%"=="" (
    set "AUTH=-u%DB_USER%"
) else (
    set "AUTH=-u%DB_USER% -p%DB_PASS%"
)

echo.
echo [提示] 脚本会先 DROP 已存在的 property_db 数据库再重建, 原数据会丢失。
set /p GO=确认继续? (Y/N):
if /i not "%GO%"=="Y" (
    echo 已取消。
    pause
    exit /b 0
)

echo.
echo [1/2] 正在导入建库建表与演示数据...
"%MYSQL_BIN%" %AUTH% --default-character-set=utf8mb4 < "sql\property_db.sql"
if errorlevel 1 (
    echo.
    echo [失败] 导入出错, 请检查用户名/密码是否正确, 以及 MySQL 服务是否已启动。
    pause
    exit /b 1
)

echo.
echo [2/2] 校验导入结果...
"%MYSQL_BIN%" %AUTH% -e "USE property_db; SELECT '楼栋' AS 表名, COUNT(*) AS 记录数 FROM building UNION ALL SELECT '房屋', COUNT(*) FROM house UNION ALL SELECT '人员', COUNT(*) FROM owner UNION ALL SELECT '车位', COUNT(*) FROM parking_space UNION ALL SELECT '账单', COUNT(*) FROM fee_bill UNION ALL SELECT '缴费记录', COUNT(*) FROM fee_payment UNION ALL SELECT '报修工单', COUNT(*) FROM repair_order UNION ALL SELECT '临停记录', COUNT(*) FROM temp_parking;"

echo.
echo ============================================================
echo   数据库初始化完成
echo   接下来请运行: 2-启动后端.bat
echo ============================================================
pause
