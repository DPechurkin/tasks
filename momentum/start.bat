@echo off
setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%.momentum_port"

if exist "%CONFIG_FILE%" (
  set /p PORT=<"%CONFIG_FILE%"
  echo Используется порт !PORT! (из .momentum_port)
) else (
  echo.
  echo   Momentum -- локальный планировщик
  echo   ==================================
  echo.
  set /p PORT="  На каком порту запустить? [3030]: "
  if "!PORT!"=="" set PORT=3030
  echo !PORT!> "%CONFIG_FILE%"
  echo   Порт !PORT! сохранён в .momentum_port
)

echo.
echo   Сборка и запуск (может занять несколько минут при первом запуске)...
echo.

cd /d "%SCRIPT_DIR%"
set MOMENTUM_PORT=!PORT!
docker compose up -d --build

echo.
echo   Momentum запущен: http://localhost:!PORT!
echo.
echo   Остановить:  stop.bat
echo   Сменить порт: удалите .momentum_port и запустите снова
pause
