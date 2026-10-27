@echo off
title Link YouTube Account - YT AutoPilot
echo =======================================================
echo   Connecting YouTube Account: mdsa134867@gmail.com
echo =======================================================
echo.
echo [*] Launching Google Authorization in your browser...
echo.

.\.venv\Scripts\python.exe automation\authorize_youtube.py mdsa134867@gmail.com

echo.
pause
