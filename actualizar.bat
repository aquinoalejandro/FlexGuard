@echo off
setlocal
echo ============================================================
echo   FlexGuard - Actualizador Rapido desde GitHub
echo ============================================================
echo.

git --version >nul 2>&1
if errorlevel 1 goto :no_git

echo [1/2] Obteniendo ultimos cambios desde GitHub...
git pull origin main
if errorlevel 1 goto :git_error

echo.
echo [OK] Codigo actualizado correctamente a la ultima version.
goto :instructions

:no_git
echo [AVISO] Git no esta disponible en este equipo.
echo Puedes descargar la version mas reciente en ZIP desde:
echo https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip
goto :instructions

:git_error
echo.
echo [AVISO] Hubo un problema al ejecutar git pull.
echo Si modificaste archivos locales, respalda tus cambios o descarga el ZIP:
echo https://github.com/aquinoalejandro/FlexGuard/archive/refs/heads/main.zip
goto :instructions

:instructions
echo.
echo ============================================================
echo   PASO FINAL PARA APLICAR EN CHROME / EDGE:
echo   1. Abre chrome://extensions/ en tu navegador.
echo   2. Busca la tarjeta de FlexGuard.
echo   3. Haz clic en el icono circular de Recargar.
echo   4. Refresca la pestana donde tengas abierto el IDE.
echo ============================================================
echo.
pause
