# Morning Trading Launch Script
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userDataDir = "$env:TEMP\tv-cdp-profile"
$bridgeDir = "C:\Users\barak\tradingview-mcp-jackson"
$cfExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

Write-Host "=== Trading Desk Morning Launch ===" -ForegroundColor Cyan

# 1. Launch TradingView
$existing = Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "TradingView already running on port 9222" -ForegroundColor Yellow
} else {
    Start-Process $chrome -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$userDataDir", "--no-first-run", "--no-default-browser-check", "https://www.tradingview.com/chart/"
    Write-Host "Chrome launched - waiting 6s..." -ForegroundColor Green
    Start-Sleep 6
}

# 2. Start cloudflared tunnel
$logFile = "$env:TEMP\cf-tunnel.log"
Remove-Item $logFile -ErrorAction SilentlyContinue
Start-Process $cfExe -ArgumentList "tunnel", "--url", "http://localhost:3001" -WindowStyle Minimized -RedirectStandardError $logFile
Write-Host "Cloudflare tunnel starting..." -ForegroundColor Cyan
Start-Sleep 6

# Read tunnel URL from log
$tunnelUrl = ""
$attempts = 0
while ($tunnelUrl -eq "" -and $attempts -lt 10) {
    Start-Sleep 2
    $attempts++
    $lines = Get-Content $logFile -ErrorAction SilentlyContinue
    foreach ($line in $lines) {
        if ($line -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
        }
    }
}

if ($tunnelUrl -ne "") {
    $wsUrl = $tunnelUrl.Replace("https://", "wss://") + "/live"
    Write-Host ""
    Write-Host "TUNNEL URL: $tunnelUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "Paste this tunnel URL into Claude to update Oracle." -ForegroundColor Yellow
    Write-Host "Tunnel URL: $tunnelUrl" -ForegroundColor White
} else {
    Write-Host "Tunnel URL not found - check $logFile" -ForegroundColor Red
}

# 3. Start bridge server
Write-Host ""
Write-Host "Starting bridge on port 3001..." -ForegroundColor Cyan
Set-Location $bridgeDir
node bridge/server.js
