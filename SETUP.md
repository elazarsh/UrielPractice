# 🚀 הרצה מהמחשב שלך – גישה מהפלאפון

## מה צריך להתקין (פעם אחת בלבד)

### שלב 1 – התקן Docker Desktop
1. גש לאתר: **https://www.docker.com/products/docker-desktop/**
2. הורד ל-Windows (או Mac)
3. התקן → לחץ Next → הפעל מחדש את המחשב

---

## הפעלה

### Windows – לחץ פעמיים על הקובץ `start.bat`
### Mac/Linux – פתח Terminal והרץ: `bash start.sh`

זהו! המערכת תתחיל תוך ~2 דקות.

---

## גישה מהפלאפון

1. ודא שהמחשב והפלאפון מחוברים לאותה רשת WiFi
2. מצא את כתובת ה-IP של המחשב:
   - **Windows**: פתח cmd → הקלד `ipconfig` → חפש "IPv4 Address" (לדוגמה: `192.168.1.100`)
   - **Mac**: הגדרות → WiFi → לחץ על הרשת → ה-IP מופיע
3. בפלאפון, פתח דפדפן וגש ל: `http://192.168.1.100` (החלף בכתובת שמצאת)

---

## פרטי כניסה לדמו

| משתמש | אימייל | סיסמה |
|--------|--------|--------|
| מנהל | `admin@uriel-practice.co.il` | `Demo1234!` |
| רואת חשבון | `rivka@uriel-practice.co.il` | `Demo1234!` |
| מנהל חשבונות | `moshe@uriel-practice.co.il` | `Demo1234!` |
| מחלקת שכר | `shira@uriel-practice.co.il` | `Demo1234!` |

---

## עצירה

```bash
docker compose down
```
