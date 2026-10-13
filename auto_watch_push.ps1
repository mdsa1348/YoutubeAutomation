# YT AutoPilot - Continuous Background Auto-Push Watcher
# Periodically checks for file changes every interval seconds and pushes to origin main

param(
    [int]$IntervalSeconds = 30
)

$RepoDir = $PSScriptRoot
Set-Location $RepoDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " YT AutoPilot - Continuous Git Auto-Push Watcher Started" -ForegroundColor Green
Write-Host " Monitoring: $RepoDir" -ForegroundColor Yellow
Write-Host " Interval: Every $IntervalSeconds seconds" -ForegroundColor Yellow
Write-Host " Remote: origin main" -ForegroundColor Yellow
Write-Host " Press Ctrl+C at any time to stop" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

while ($true) {
    try {
        $status = (git status --porcelain 2>&1)
        if ($status) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Write-Host "[$timestamp] Changes detected! Staging and committing..." -ForegroundColor Yellow
            git add -A
            git commit -m "Auto-sync update: $timestamp"
            
            Write-Host "[$timestamp] Pushing to origin main..." -ForegroundColor Cyan
            $pushResult = git push origin main 2>&1
            Write-Host "[$timestamp] Push completed successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "[$timestamp] Error during auto-sync: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $IntervalSeconds
}
