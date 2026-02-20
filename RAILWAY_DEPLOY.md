# 🚂 פריסה ל-Railway – מדריך מהיר

## מה זה Railway?
שירות ענן חינמי שמפעיל את האפליקציה שלך 24/7.
תקבל כתובת URL קבועה (לדוגמה: `uriel-practice.up.railway.app`) שניתן לפתוח מכל מקום.

---

## שלבי הפריסה (10 דקות)

### שלב 1 – צור חשבון Railway
1. גש ל: **https://railway.app**
2. לחץ **"Start a New Project"**
3. הירשם עם GitHub

---

### שלב 2 – חבר את הריפוזיטורי
1. לחץ **"Deploy from GitHub repo"**
2. בחר את הריפוזיטורי `UrielPractice`
3. Railway יזהה אוטומטית את ה-`Dockerfile` בשורש

---

### שלב 3 – הוסף מסד נתונים PostgreSQL
1. בפרויקט, לחץ **"+ Add Service"**
2. בחר **"Database" → "PostgreSQL"**
3. Railway יוצר `DATABASE_URL` אוטומטית

---

### שלב 4 – הגדר משתני סביבה
בשירות ה-backend, לחץ על **"Variables"** והוסף:

| שם משתנה | ערך |
|----------|-----|
| `DATABASE_URL` | _מוגדר אוטומטית על ידי Railway_ |
| `JWT_SECRET` | `your-super-secret-min-32-chars-here!!` |
| `JWT_REFRESH_SECRET` | `your-refresh-secret-min-32-chars-here!` |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

> **חשוב:** החלף את ה-JWT secrets בסיסמאות חזקות אמיתיות!

---

### שלב 5 – Deploy!
Railway מתחיל לבנות אוטומטית. ממתין ~3-5 דקות.

בסיום, תקבל URL כמו:
```
https://urielpractice-production.up.railway.app
```

---

## גישה מהפלאפון
פשוט פתח את ה-URL שקיבלת בדפדפן הפלאפון! 📱

**כניסה:** `admin@uriel-practice.co.il` / `Demo1234!`

---

## עלויות
- **Hobby Plan (חינמי):** $5 credit חודשי – מספיק לדמו
- **Pro Plan:** $20/חודש לשימוש מלא
