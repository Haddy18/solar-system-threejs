@echo off
cd /d "%~dp0"
echo Iniciando Sistema Solar en http://localhost:8080 ...
start "solar-system-threejs" /min cmd /c "python -m http.server 8080 2>nul || py -m http.server 8080"
timeout /t 1 /nobreak >nul
start "" http://localhost:8080
echo.
echo Servidor en marcha. Cierra la ventana minimizada para detenerlo.
pause
