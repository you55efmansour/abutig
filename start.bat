@echo off
echo ========================================
echo    نظام إدارة الشكاوى البلدية
echo ========================================
echo.

echo بدء تشغيل النظام...
echo.

echo 1. تشغيل الخادم الخلفي...
start "Backend Server" cmd /k "cd server && npm start"

echo 2. انتظار 5 ثوانٍ...
timeout /t 5 /nobreak > nul

echo 3. تشغيل الواجهة الأمامية...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo تم تشغيل النظام بنجاح!
echo.
echo الواجهة الأمامية: http://localhost:5173
echo الخادم الخلفي: http://localhost:3001
echo.
echo حسابات الإدارة:
echo - emanhassanmahmoud1@gmail.com / admin123
echo - karemelolary8@gmail.com / admin123
echo ========================================
echo.
pause 