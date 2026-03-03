@echo off
echo ====================================
echo  Instalando Delfina Nails Studio
echo ====================================
echo.

echo [1/2] Instalando dependencias frontend...
call npm install

echo.
echo [2/2] Instalando dependencias backend...
cd server
call npm install
cd ..

echo.
echo ====================================
echo  Instalacion completada!
echo ====================================
echo.
echo Para iniciar la aplicacion ejecuta:
echo   start.bat
echo.
pause
