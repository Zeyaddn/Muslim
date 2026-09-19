@echo off
title هُدَى - Next.js Dev Server
echo ====================================
echo    هُدَى - منصة إسلامية شاملة
echo    يتم تشغيل الخادم المحلي...
echo ====================================
echo.
echo    افتح المتصفح على:
echo    http://localhost:3000
echo.
echo    اضغط Ctrl+C للإيقاف
echo ====================================
echo.
cd /d "%~dp0"
npx next dev -p 3000
pause
