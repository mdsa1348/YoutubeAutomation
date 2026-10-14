@echo off
title YT AutoPilot 3.0 Server
echo ========================================================
echo   YT AutoPilot 3.0 - AI YouTube Automation Server
echo ========================================================
echo.
echo Starting local PHP server on http://localhost:8080...
echo Database Engine: SQLite / MySQL Auto-Connecting
echo.
start "" "http://localhost:8080/index.html"
php -S localhost:8080
pause
