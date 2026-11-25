@echo off
setlocal
pushd "%~dp0.."
call npm --prefix src/main/frontend ci || goto :erro
call npm --prefix src/main/frontend run build || goto :erro
call mvnw.cmd clean verify || goto :erro
popd
exit /b 0
:erro
popd
exit /b 1
