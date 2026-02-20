#!/usr/bin/env bash
set -e

echo "========================================"
echo " UrielPractice - מפעיל את המערכת"
echo "========================================"
echo

# בדוק Docker
if ! docker info > /dev/null 2>&1; then
  echo "שגיאה: Docker לא פועל."
  echo "אנא הפעל את Docker Desktop ונסה שוב."
  exit 1
fi

echo "מפסיק containers ישנים..."
docker compose down 2>/dev/null || true

echo "בונה ומפעיל (עשוי לקחת 2-5 דקות בפעם הראשונה)..."
docker compose up --build -d

echo
echo "========================================"
echo " המערכת פועלת!"
echo "========================================"
echo

# מצא IP מקומי
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ipconfig getifaddr en0 2>/dev/null || echo "לא נמצא")

echo "גישה מהמחשב: http://localhost"
echo "גישה מהפלאפון (אותה רשת WiFi): http://${LOCAL_IP}"
echo
echo "כניסה: admin@uriel-practice.co.il / Demo1234!"
echo
