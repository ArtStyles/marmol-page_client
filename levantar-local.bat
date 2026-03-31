@echo off
setlocal

set "ROOT=%~dp0"

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm no esta instalado o no esta en PATH.
  echo Instala pnpm y vuelve a ejecutar este script.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\package.json" (
  echo [ERROR] No se encontro backend\package.json
  pause
  exit /b 1
)

if not exist "%ROOT%frontend\package.json" (
  echo [ERROR] No se encontro frontend\package.json
  pause
  exit /b 1
)

if not exist "%ROOT%backend\node_modules" (
  echo Instalando dependencias del backend...
  call pnpm --dir "%ROOT%backend" install || goto :fail
)

if not exist "%ROOT%frontend\node_modules" (
  echo Instalando dependencias del frontend...
  call pnpm --dir "%ROOT%frontend" install || goto :fail
)

echo Iniciando backend y frontend...
start "Marble Backend" cmd /k "cd /d ""%ROOT%backend"" && pnpm dev"
start "Marble Frontend" cmd /k "cd /d ""%ROOT%frontend"" && pnpm dev"

echo Listo. Se abrieron dos ventanas con los servidores.
exit /b 0

:fail
echo [ERROR] Fallo la instalacion de dependencias.
pause
exit /b 1
