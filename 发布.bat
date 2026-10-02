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
git push

echo.
echo ======================================
echo    发布完成，约 1 分钟后网站生效
echo ======================================
echo.
pause
