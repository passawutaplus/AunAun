@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\publish-codex-review-prs.ps1"
echo.
if errorlevel 1 (
  echo Publishing failed. Leave this window open and send Codex a screenshot.
) else (
  echo All branches and draft pull requests are ready.
)
pause
