@echo off
REM Local development startup script for Windows
cd /d "%~dp0"
echo Starting Heidi Admin Server (Local)...
echo.
echo Configuration:
echo - Node.js: Check with 'node --version'
echo - Port: 8081
echo - Environment: See .env.local
echo.
REM Load .env.local and start server
for /f "delims== tokens=1,2" %%A in (.env.local) do set %%A=%%B
call npm install --production
call npm start
