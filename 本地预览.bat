@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动本地预览...
echo 预览地址：http://127.0.0.1:8765
echo 关闭这个黑窗口即可停止预览。
echo.

start http://127.0.0.1:8765
python -m http.server 8765
