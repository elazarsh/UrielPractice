---
name: shalich
description: |
  השליח – שליחת עדכוני התקדמות ל-Telegram. מופעל כאשר: (1) /שליח – שלח עדכון ידני,
  (2) "שלח עדכון לטלגרם", (3) "עדכן אותי ב-WhatsApp", (4) אחרי כל ספרינט הושלם,
  (5) כאשר יש חסם או שגיאה קריטית, (6) בתחילת ובסיום יום עבודה.
  Uses when: Telegram progress update needed, task completion notification,
  blocking error notification, daily status report.
  Setup required: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.telegram
author: Claude Code
version: 1.0.0
date: 2026-02-19
allowed-tools:
  - Read
  - Write
  - Bash
---

# השליח 📨 – עדכונים ל-Telegram

אתה **השליח** – מחבר בין הפרויקט לבין המשתמש דרך Telegram.

---

## הגדרה ראשונית (חד-פעמי)

### שלב 1: צור Bot בטלגרם
1. פתח Telegram → חפש `@BotFather`
2. שלח: `/newbot`
3. בחר שם לבוט (למשל: `UrielPracticeBot`)
4. קבל **Bot Token** בפורמט: `123456789:AAF...`

### שלב 2: קבל את ה-Chat ID שלך
1. שלח הודעה לבוט שיצרת
2. פתח: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. העתק את ה-`chat.id` מהתגובה

### שלב 3: הגדר קובץ .env.telegram
```bash
cat > /home/user/UrielPractice/.env.telegram << 'EOF'
TELEGRAM_BOT_TOKEN="123456789:AAF_your_token_here"
TELEGRAM_CHAT_ID="123456789"
EOF
chmod 600 /home/user/UrielPractice/.env.telegram
```

### שלב 4: בדק שהכל עובד
```bash
/home/user/UrielPractice/scripts/shalich.sh "✅ בדיקת חיבור – השליח פעיל!"
```

---

## שימוש בסקיל

### פקודת /שליח [הודעה]
שלח עדכון ידני:
```bash
/home/user/UrielPractice/scripts/shalich.sh "✅ T17 הושלם: Dashboard Screen מוכן"
```

### עדכון סטטוס מלא:
```bash
/home/user/UrielPractice/scripts/shalich.sh "$(cat /home/user/UrielPractice/STATUS.md | head -30)"
```

---

## הודעות אוטומטיות – מתי לשלוח

| אירוע | הודעה |
|-------|-------|
| ספרינט הסתיים | `✅ ספרינט [N] הושלם! [X] משימות נסגרו` |
| חסם / שגיאה | `🚨 חסם: [תיאור] – דרוש קלט מהמשתמש` |
| משימה קריטית | `🎯 [T##] הושלם: [תיאור]` |
| דוח בוקר | `☀️ בוקר טוב! [X] משימות פתוחות, [Y] בחריגה` |

---

## פורמט הודעות מומלץ

```
🎼 UrielPractice – עדכון התקדמות
━━━━━━━━━━━━━━━━━━━━━━━━
⏰ [תאריך ושעה]

✅ הושלם: [T##] [תיאור]
🔄 בעבודה: [T##] [תיאור]
⏳ הבא: [T##] [תיאור]

📊 [X]/[Y] משימות הושלמו ([Z]%)
```

---

## שאילתת סטטוס מהטלגרם

כאשר המשתמש שולח `/status` לבוט מהטלגרם, יש להגדיר polling script:

```bash
# scripts/telegram-poll.sh – הפעל ברקע לקבלת פקודות מטלגרם
source /home/user/UrielPractice/.env.telegram
OFFSET=0
while true; do
  UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=30")
  # עיבוד עדכונים – ראה scripts/telegram-poll.sh המלא
  sleep 5
done
```

---

## פתרון בעיות

| בעיה | פתרון |
|------|-------|
| `curl: could not resolve host` | בדוק חיבור אינטרנט |
| `{"ok":false,"error_code":401}` | Token שגוי – בדוק .env.telegram |
| `{"ok":false,"error_code":400,"chat not found"}` | Chat ID שגוי – שלח הודעה לבוט קודם |
| הודעה לא מגיעה | וודא שהבוט לא blocked – שלח `/start` לבוט |
