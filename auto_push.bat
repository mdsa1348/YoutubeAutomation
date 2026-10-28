@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================================
echo       YT AutoPilot - Auto Git Commit and Push
echo ========================================================

git add -A

git diff-index --quiet HEAD --
if %ERRORLEVEL% NEQ 0 (
    set "COMMIT_MSG=Auto-update: %date% %time%"
    if not "%~1"=="" set "COMMIT_MSG=%~1"
    echo [INFO] Committing changes...
    git commit -m "!COMMIT_MSG!"
) else (
    echo [INFO] Working tree clean. Checking for unpushed commits...
)

echo [INFO] Fetching latest remote status...
git fetch origin main

echo [INFO] Syncing with origin main (rebase)...
git pull --rebase origin main

echo [INFO] Pushing to origin main...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo [SUCCESS] Successfully synced and pushed to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo [ERROR] Git push failed. Please check network or conflicts.
    echo ========================================================
)

endlocal
