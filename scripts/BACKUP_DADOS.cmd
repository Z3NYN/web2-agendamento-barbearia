@echo off
setlocal
pushd "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Operacao.ps1" Backup
set "SOLDADO_EXIT=%ERRORLEVEL%"
pause
popd
exit /b %SOLDADO_EXIT%
