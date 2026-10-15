@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node build.mjs
) else (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" build.mjs
)
if errorlevel 1 (
  echo Build failed. Check the error above.
  pause
  exit /b 1
)
echo Build complete.
pause
