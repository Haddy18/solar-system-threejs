@echo off
cd /d "%~dp0"
echo Iniciando Sistema Solar en http://localhost:8080 ...
where node >nul 2>nul
if %errorlevel%==0 (
  start "solar-system-threejs" /min cmd /c "node scripts/dev-server.mjs --port 8080"
) else (
  start "solar-system-threejs" /min cmd /c "python -m http.server 8080 2>nul || py -m http.server 8080"
)
timeout /t 1 /nobreak >nul
start "" http://localhost:8080
echo.
echo Servidor en marcha (recarga en vivo con Node). Cierra la ventana minimizada para detenerlo.
pause
