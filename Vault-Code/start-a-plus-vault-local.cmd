@echo off
setlocal
cd /d "%~dp0"
title A+ Vault Local Server
echo Starting A+ Vault local server...
echo URL: http://127.0.0.1:5177/
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js or add it to PATH.
  echo.
  pause
  exit /b 1
)
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:5177/'"
node "outputs\a-plus-vault\local-server.cjs"
echo.
echo Server stopped. Press any key to close this window.
pause >nul
