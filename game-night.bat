@echo off
title THE CODEX - Game Night Server
color 0A

echo.
echo  ============================================
echo   THE CODEX - Game Night Remote Access
echo  ============================================
echo.
echo  Leave this window open and your PC on.
echo  One URL for app + AI from your phone.
echo.

REM ── 1. Set Ollama CORS + Host ──
set OLLAMA_ORIGINS=*
set OLLAMA_HOST=0.0.0.0:11434

taskkill /IM ollama.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo  [1/3] Starting Ollama AI...
start /B "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
timeout /t 3 /nobreak >nul

curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Ollama failed to start.
    pause
    exit /b 1
)
echo  [OK] Ollama running

REM ── 2. Start Codex dev server ──
echo  [2/3] Starting The Codex app...
cd /d "%~dp0"
start /B cmd /c "npm run dev 2>nul"
timeout /t 5 /nobreak >nul
echo  [OK] Codex running on port 5173 (Ollama proxied at /ollama)

REM ── 3. Single tunnel for everything ──
echo  [3/3] Opening tunnel...
del "%TEMP%\codex-tunnel.log" >nul 2>&1
start /B cmd /c ""%~dp0cloudflared.exe" tunnel --url http://localhost:5173 2>"%TEMP%\codex-tunnel.log""
timeout /t 12 /nobreak >nul

REM ── 4. Extract URL and copy to clipboard ──
set "TUNNEL_URL="
for /f "tokens=*" %%a in ('findstr /C:"trycloudflare.com" "%TEMP%\codex-tunnel.log" 2^>nul') do (
    set "LINE=%%a"
)
if defined LINE (
    for %%u in (%LINE%) do (
        echo %%u | findstr /C:"https://" >nul 2>&1 && set "TUNNEL_URL=%%u"
    )
)

echo.
echo  ============================================
echo   GAME NIGHT IS LIVE
echo  ============================================
echo.

if defined TUNNEL_URL (
    set "FULL_URL=%TUNNEL_URL%/the-codex/"
    echo  OPEN ON YOUR PHONE:
    echo.
    echo  %TUNNEL_URL%/the-codex/
    echo.
    echo %TUNNEL_URL%/the-codex/| clip
    echo  [COPIED TO CLIPBOARD]
    echo.
    echo  Just paste it into your phone browser.
    echo  Ollama AI is built in. No extra config needed.
) else (
    echo  Tunnel still connecting... trying again...
    timeout /t 8 /nobreak >nul
    for /f "tokens=*" %%a in ('findstr /C:"trycloudflare.com" "%TEMP%\codex-tunnel.log" 2^>nul') do (
        set "LINE2=%%a"
    )
    if defined LINE2 (
        for %%u in (!LINE2!) do (
            echo %%u | findstr /C:"https://" >nul 2>&1 && set "TUNNEL_URL=%%u"
        )
    )
    if defined TUNNEL_URL (
        echo  OPEN ON YOUR PHONE:
        echo.
        echo  %TUNNEL_URL%/the-codex/
        echo.
        echo %TUNNEL_URL%/the-codex/| clip
        echo  [COPIED TO CLIPBOARD]
    ) else (
        echo  Could not extract URL. Check the log:
        echo  type "%TEMP%\codex-tunnel.log"
    )
)

echo.
echo  Keep this window open. Press Ctrl+C to stop.
echo  ============================================
echo.
pause >nul
