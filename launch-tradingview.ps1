# Launch TradingView in Chrome with CDP debug port, then start the bridge server
# Run this script each morning before trading

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userDataDir = "$env:TEMP\tv-cdp-profile"

Write-Host "Starting TradingView with debug port..." -ForegroundColor Cyan

# Kill any existing Chrome on port 9222
$existing = Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Port 9222 already in use — TradingView may already be running" -ForegroundColor Yellow
} else {
  Start-Process $chrome -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$userDataDir",
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.tradingview.com/chart/"
  )
  Write-Host "Chrome launched — waiting for TradingView to load..." -ForegroundColor Green
  Start-Sleep 5
}

# Verify CDP is up
try {
  $cdp = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -TimeoutSec 5 -UseBasicParsing
  Write-Host "CDP connected!" -ForegroundColor Green
} catch {
  Write-Host "CDP not ready yet — give TradingView a few more seconds, then run the bridge manually" -ForegroundColor Yellow
}

# Start bridge server
Write-Host "`nStarting bridge server on port 3001..." -ForegroundColor Cyan
Set-Location "C:\Users\barak\tradingview-mcp-jackson"
node bridge/server.js
