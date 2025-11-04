@echo off
title JC Booking Automation Server
echo ========================================
echo JC Court Booking Automation Server
echo ========================================
echo.
echo Starting server...
echo.

cd /d %~dp0
node server.js

echo.
echo Server stopped.
pause
