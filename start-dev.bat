@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\npm.cmd" run dev -- -H 127.0.0.1 -p 3000
echo.
echo ReviewRadar dev server stopped. Press any key to close this window.
pause >nul
