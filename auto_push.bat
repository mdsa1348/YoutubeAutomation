@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo       YT AutoPilot - Auto Git Commit and Push
echo ========================================================

git add -A

git diff-index --quiet HEAD --
if %ERRORLEVEL% EQU 0 (
    echo [OK] No changes detected to commit.
    exit /b 0
)

set "COMMIT_MSG=Auto-update: %date% %time%"
if not "%~1"=="" set "COMMIT_MSG=%~1"

echo [INFO] Committing changes...
git commit -m "%COMMIT_MSG%"

echo [INFO] Pushing to origin main...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo [SUCCESS] Successfully pushed all changes to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo [ERROR] Git push failed.
    echo ========================================================
)

endlocal
