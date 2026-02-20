@echo off
echo ========================================
echo  UrielPractice - מפעיל את המערכת
echo ========================================
echo.

REM בדוק אם Docker רץ
docker info >nul 2>&1
if errorlevel 1 (
    echo שגיאה: Docker לא פועל.
    echo אנא פתח את Docker Desktop והמתן עד שהוא מוכן.
    pause
    exit /b 1
)

echo מפסיק containers ישנים...
docker compose down >nul 2>&1

echo בונה ומפעיל את המערכת (עשוי לקחת 2-5 דקות בפעם הראשונה)...
docker compose up --build -d

if errorlevel 1 (
    echo.
    echo שגיאה בהפעלה. בדוק שDocker Desktop פועל.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  המערכת פועלת!
echo ========================================
echo.
echo גישה מהמחשב: http://localhost
echo.
echo לגישה מהפלאפון:
echo   1. ודא שהפלאפון מחובר לאותה רשת WiFi
echo   2. הרץ: ipconfig
echo   3. חפש "IPv4 Address" (לדוגמה: 192.168.1.100)
echo   4. גש בפלאפון ל: http://192.168.1.100
echo.
echo כניסה: admin@uriel-practice.co.il / Demo1234!
echo.
pause
