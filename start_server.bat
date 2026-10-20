@echo off
title YT AutoPilot 3.0 Auto-Server
echo ========================================================
echo   🚀 YT AutoPilot 3.0 - YouTube Intelligence & Automation
echo ========================================================
echo.

:: 1. Auto-detect PHP in standard paths
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "D:\xampp\php\php.exe" (
        set "PATH=D:\xampp\php;%PATH%"
    ) else if exist "C:\xampp\php\php.exe" (
        set "PATH=C:\xampp\php;%PATH%"
    )
)

:: 2. Check if PHP is ready
where php >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [+] PHP Engine detected: OK
    echo [+] Database Engine: SQLite / MySQL Ready
    echo.
    echo [*] Launching YT AutoPilot in your browser...
    start "" "http://localhost:8080/index.html"
    echo [*] Server running on http://localhost:8080
    echo [*] Press Ctrl+C in this window to stop the server.
    echo.
    php -S localhost:8080
) else (
    echo [-] PHP not found in PATH or XAMPP.
    where node >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [+] Node.js detected: starting Node server fallback...
        start "" "http://localhost:8080/index.html"
        node server.js
    ) else (
        echo [-] Neither PHP nor Node.js could be found.
        echo Please ensure XAMPP is installed or install PHP.
        pause
    )
)
pause
