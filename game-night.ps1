# ============================================
#  THE CODEX - Game Night Remote Access
# ============================================
# Run this, leave your PC on, head to the DM's house.
# One URL gives you the full app + Ollama AI from your phone.

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "THE CODEX - Game Night"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   THE CODEX - Game Night Remote Access" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""

# ── Config ──
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
$cloudflaredPath = "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
$codexDir = $PSScriptRoot
$appPort = 5173

# ── 1. Start Ollama with CORS ──
Write-Host "  [1/3] Starting Ollama AI..." -ForegroundColor Cyan
$env:OLLAMA_ORIGINS = "*"
$env:OLLAMA_HOST = "0.0.0.0:11434"

Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$ollamaProc = Start-Process -FilePath $ollamaPath -ArgumentList "serve" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

try {
    $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
    Write-Host "  [OK] Ollama running" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Ollama may still be starting..." -ForegroundColor Yellow
}

# ── 2. Start Codex Dev Server ──
Write-Host "  [2/3] Starting The Codex app..." -ForegroundColor Cyan
Push-Location $codexDir
$codexProc = Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -PassThru -WindowStyle Hidden
Pop-Location
Start-Sleep -Seconds 5
Write-Host "  [OK] Codex running on port $appPort (Ollama proxied at /ollama)" -ForegroundColor Green

# ── 3. Start Single Cloudflare Tunnel ──
Write-Host "  [3/3] Opening tunnel..." -ForegroundColor Cyan
$tunnelLog = "$env:TEMP\codex-tunnel.log"
Remove-Item $tunnelLog -ErrorAction SilentlyContinue
$tunnelProc = Start-Process -FilePath $cloudflaredPath `
    -ArgumentList "tunnel --url http://localhost:$appPort" `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardError $tunnelLog

Write-Host ""
Write-Host "  Waiting for tunnel..." -ForegroundColor Yellow
Start-Sleep -Seconds 12

# ── Extract URL ──
$tunnelUrl = $null
if (Test-Path $tunnelLog) {
    $content = Get-Content $tunnelLog -Raw
    if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
        $tunnelUrl = $matches[1]
    }
}

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   GAME NIGHT IS LIVE" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""

if ($tunnelUrl) {
    $appUrl = "$tunnelUrl/the-codex/"
    Write-Host "  OPEN ON YOUR PHONE:" -ForegroundColor White
    Write-Host ""
    Write-Host "  $appUrl" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Set-Clipboard -Value $appUrl
    Write-Host "  [COPIED TO CLIPBOARD]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Just paste it into your phone browser." -ForegroundColor DarkGray
    Write-Host "  Ollama AI is built in. No extra setup needed." -ForegroundColor DarkGray
} else {
    Write-Host "  Tunnel still connecting... retrying..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
    if (Test-Path $tunnelLog) {
        $content = Get-Content $tunnelLog -Raw
        if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
            $tunnelUrl = $matches[1]
            $appUrl = "$tunnelUrl/the-codex/"
            Write-Host "  $appUrl" -ForegroundColor White -BackgroundColor DarkGreen
            Set-Clipboard -Value $appUrl
            Write-Host "  [COPIED TO CLIPBOARD]" -ForegroundColor Cyan
        } else {
            Write-Host "  Could not extract URL. Check: $tunnelLog" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "  Keep this window open. Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) { Start-Sleep -Seconds 60 }
} finally {
    Write-Host "`n  Shutting down..." -ForegroundColor Yellow
    $tunnelProc, $codexProc, $ollamaProc | ForEach-Object {
        if ($_ -and !$_.HasExited) { $_.Kill() }
    }
    Write-Host "  Done. Good session!" -ForegroundColor Green
}
