@echo off
echo ====================================
echo  Iniciando Delfina Nails Studio
echo ====================================
echo.
echo Frontend: http://localhost:5173
echo JSON API: http://localhost:3001
echo Backend Email: http://localhost:4000
echo.
echo Usuario Admin:
echo   Email: admin@turnos.com
echo   Pass: admin123
echo.
echo ====================================
echo.

start cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak >nul
start cmd /k "npm run server"
timeout /t 2 /nobreak >nul
start cmd /k "npm run dev"

echo.
echo Servidores iniciados! (3 ventanas)
echo Presiona Ctrl+C en cada ventana para detener
echo.
