# 🤖 UrielPractice – מערכת בוטים לסימולציה וביקורת

מערכת זו מדמה 9 שחקנים/משתמשים שונים של המערכת.
כל בוט מבצע פעולות כפי שמשתמש אמיתי היה מבצע, ומדווח על מה שלא עובד / חסר / צריך שיפור.

---

## 👥 הבוטים

| # | שם | תפקיד | חשבון במערכת |
|---|-----|--------|--------------|
| 1 | **רבקה לוי** | רואת חשבון ראשית | `rivka@uriel-practice.co.il` |
| 2 | **אוריאל כהן** | מנהל מערכת | `admin@uriel-practice.co.il` |
| 3 | **משה גולד** | מנהל חשבונות (Bookkeeper) | `moshe@uriel-practice.co.il` |
| 4 | **דוד ברק** | בעל עסק / לקוח | _(אין פורטל לקוח עדיין)_ |
| 5 | **ניצן כהן** | פקיד שומה – מס הכנסה | _(חיצוני)_ |
| 6 | **גלית שמיר** | פקידת מע"מ | _(חיצונית)_ |
| 7 | **תמר אביב** | בודקת תוכנה (QA) | `admin@uriel-practice.co.il` |
| 8 | **ענת שפירא** | מנהלת מוצר | `admin@uriel-practice.co.il` |
| 9 | **שירה ברק** | מנהלת שכר | `shira@uriel-practice.co.il` |

---

## 🚀 הרצה

```bash
# הרצת כל הבוטים (סדרתית)
cd bots
npx tsx runner.ts

# הרצת כל הבוטים במקביל (מהיר יותר)
npx tsx runner.ts --parallel

# הרצת בוט ספציפי
npx tsx runner.ts --bot cpa
npx tsx runner.ts --bot admin
npx tsx runner.ts --bot qa-tester
npx tsx runner.ts --bot payroll

# שמירה לתיקייה מותאמת
npx tsx runner.ts --output ./my-reports
```

> **הערה:** הבקאנד חייב לרוץ על `http://localhost:3001` לפני ריצת הבוטים.
> להפעלה: `cd /home/user/UrielPractice && npm run dev`

---

## 📊 פלטים

הבוטים מייצרים:
1. **`reports/bot-report-*.json`** – נתונים גולמיים לכל ממצא
2. **`reports/bot-report-*.md`** – דוח Markdown קריא לבני אדם

כל ממצא מסווג לפי עדיפות:

| עדיפות | משמעות |
|--------|---------|
| 🔴 **חובה** | חייב תיקון – blocking, security, critical UX |
| 🟡 **חשוב** | צריך תיקון בסיבוב הבא |
| 🟢 **נחמד** | שיפור אופציונלי |

---

## 🏗️ מבנה קוד

```
bots/
├── runner.ts              # Main – מריץ את כל הבוטים
├── types.ts               # TypeScript types
├── api-client.ts          # HTTP client + helpers
├── report.ts              # מייצר דוחות JSON + Markdown
├── package.json
├── README.md
└── personas/
    ├── cpa.ts             # רואת חשבון
    ├── admin.ts           # מנהל מערכת
    ├── office-staff.ts    # עובד משרד
    ├── business-owner.ts  # בעל עסק
    ├── tax-authority.ts   # פקיד מס הכנסה
    ├── vat-authority.ts   # פקידת מע"מ
    ├── qa-tester.ts       # בודקת QA
    ├── product-manager.ts # מנהלת מוצר
    └── payroll.ts         # מנהלת שכר
```

---

## ➕ הוספת בוט חדש

1. צור קובץ ב-`personas/your-bot.ts`
2. ייצא `async function runYourBot(): Promise<BotReport>`
3. הוסף ל-`runner.ts` ברשימת `ALL_BOTS`
