@echo off
:: Force directory to be the folder where this batch script is located
cd /d "%~dp0"

title FinanceFlow Local Runner
echo ===================================================
echo           FinanceFlow Local Runner
echo ===================================================
echo.

:: Ensure .env exists
if not exist .env (
    echo [INFO] Creating local .env config file from .env.example...
    copy .env.example .env >nul
)

:: Run npm install
echo [INFO] Installing project dependencies (npm install)...
echo [INFO] Please wait, this might take a moment...
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed! Please check if Node.js is installed correctly.
    echo Get Node.js at: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Open default web browser safely (does not block execution)
echo.
echo [INFO] Automatically opening http://localhost:3000 in your browser...
start "" "http://localhost:3000"

:: Start the local development server (this blocks execution until stopped)
echo [INFO] Starting the FinanceFlow local server (npm run dev)...
echo.
call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] The development server crashed or failed to start!
    echo.
)

echo.
echo ===================================================
echo Server stopped.
pause
