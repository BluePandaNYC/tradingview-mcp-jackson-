# BARAK Brain — Start MCP server + Cloudflare tunnel
# Run this once. The tunnel URL printed below goes into Claude.ai settings.

$ROOT = Split-Path $PSScriptRoot -Parent

# Start MCP server in background
$mcp = Start-Process powershell -ArgumentList "-NoProfile -Command `"cd '$ROOT'; node bridge/mcp-server.js`"" -PassThru -WindowStyle Normal
Write-Host "MCP server started (PID $($mcp.Id))"
Start-Sleep -Seconds 2

# Start Cloudflare tunnel — prints the public HTTPS URL
Write-Host "`nStarting Cloudflare tunnel...`n"
& "$PSScriptRoot\cloudflared.exe" tunnel --url "http://localhost:3333"
