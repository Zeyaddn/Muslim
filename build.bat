@echo off
chcp 65001 >nul
title هُدَى -بناء نسخة الرفع (Static Export)
echo ====================================
echo    هُدَى - إنتاج نسخة الاستضافة الثابتة
echo ====================================
echo.
cd /d "%~dp0"
echo [1/2] جارٍ البناء...
call npx next build
if errorlevel 1 (
  echo.
  echo فشل البناء. راجع الأخطاء أعلاة.
  pause
  exit /b 1
)
echo.
echo [2/2] تم البناء بنجاح. مجلد الرفع الجاهز هو: out
echo.
echo    ارفع كل محتويات مجلد out إلى مجلد htdocs على InfinityFree.
echo    للمعاينة المحلية:  npx serve out
echo.
pause
