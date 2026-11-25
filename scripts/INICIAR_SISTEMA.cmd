@echo off
setlocal
pushd "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Operacao.ps1" Iniciar
set "SOLDADO_EXIT=%ERRORLEVEL%"
if not "%SOLDADO_EXIT%"=="0" pause
popd
exit /b %SOLDADO_EXIT%
