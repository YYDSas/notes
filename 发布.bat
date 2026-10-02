@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================
echo    笔记一键发布
echo ======================================
echo.

git add -A
git diff --cached --quiet
if %errorlevel%==0 goto :nocommit

set /p msg="本次更新说明（直接回车用默认）："
if "%msg%"=="" set msg=更新笔记 %date% %time%
git commit -m "%msg%"
goto :checkpush

:nocommit
echo [提示] 本次没有新的改动，只检查是否有提交需要推送。

:checkpush
git fetch -q origin main 2>nul
for /f %%i in ('git rev-list --count origin/main..HEAD 2^>nul') do set AHEAD=%%i
if "%AHEAD%"=="" set AHEAD=?
if "%AHEAD%"=="0" goto :nothing

echo.
echo 正在推送到 GitHub（%AHEAD% 个提交待推送）...
echo.

git push > "%TEMP%\notepush.log" 2>&1
set PUSH_RESULT=%errorlevel%
type "%TEMP%\notepush.log"

echo.
if %PUSH_RESULT%==0 goto :ok

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
echo  4. 报 "rejected ... fetch first"
echo     说明远程有别的提交，先执行 git pull 再重新发布
echo.
echo  提交已保存在本地，不会丢失。网络恢复后重新双击本文件即可。
echo.
pause
exit /b 1

:ok
echo ======================================
echo    [成功] 已推送，约 1 分钟后网站生效
echo ======================================
echo.
pause
exit /b 0

:nothing
echo.
echo [提示] 没有需要推送的内容，网站已是最新。
echo.
pause
exit /b 0
