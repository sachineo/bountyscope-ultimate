@echo off
setlocal
title BountyScope Ultimate Launcher
cd /d "%~dp0"

echo.
echo  ============================================================
echo   BOUNTYSCOPE ULTIMATE // OFFENSIVE OPERATIONS CONSOLE
echo   Developed by Sachin x skoolic.com
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo Install Node.js 20 or newer, then double-click this launcher again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [SETUP] Installing project dependencies. This runs only once...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [LAUNCH] Starting BountyScope...
call npm run launch

if errorlevel 1 (
  echo.
  echo [ERROR] BountyScope exited unexpectedly.
  pause
)

endlocal
