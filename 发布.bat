@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================
echo    笔记一键发布
echo ======================================
echo.

git add -A

git diff --cached --quiet
if %errorlevel%==0 (
    echo [提示] 没有检测到任何改动，无需推送。
    echo.
    pause
    exit /b 0
)

set /p msg="本次更新说明（直接回车用默认）："
if "%msg%"=="" set msg=更新笔记 %date% %time%

git commit -m "%msg%"

echo.
echo 正在推送到 GitHub...
echo.

git push > "%TEMP%\notepush.log" 2>&1
set PUSH_RESULT=%errorlevel%
type "%TEMP%\notepush.log"

echo.
if %PUSH_RESULT%==0 (
    echo ======================================
    echo    [成功] 已推送，约 1 分钟后网站生效
    echo ======================================
) else (
    echo ======================================
    echo    [失败] 推送没有成功！
    echo ======================================
    echo.
    echo  常见原因与解决办法：
    echo.
    echo  1. 报 "Failed to connect to github.com:443"
    echo     说明在用 HTTPS 方式，请执行下面这行切换为 SSH：
    echo       git remote set-url origin git@github.com:YYDSas/notes.git
    echo.
    echo  2. 报 "Everything up-to-date" 但网站没更新
    echo     这句是误报，直接重试一次 git push 即可
    echo.
    echo  3. 报 "Permission denied (publickey)"
    echo     说明 SSH 公钥没配置，请查看 使用说明.md 第五节
    echo.
)

echo.
pause
