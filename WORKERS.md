# צוות עובדים – מערכת ניהול משרד רו"ח
> מסמך "שפה משותפת" – כל עובד, תפקידו, ומשימותיו

---

## עובדי הפרויקט

### 🏗️ האדריכל (ARCH)
**תפקיד:** תכנון ארכיטקטורה, קבלת החלטות טכנולוגיות, ERD, API spec
**סקיל/כלי:** Plan agent
**משימות שהושלמו:** T00 (ניתוח דרישות + ניתוח התאמות)
**סטטוס:** ✅ DONE

---

### 🗄️ הסכמאי (SCHEMA)
**תפקיד:** עיצוב מסד נתונים, Prisma schema, migrations, seed data
**סקיל/כלי:** Bash + Write
**משימות שהושלמו:** T02 (User/Client schema), T03 (Process schema), T04 (Tasks/Docs/Billing/Audit)
**סטטוס:** ✅ DONE

---

### ⚙️ מפתח-שרת (BE)
**תפקיד:** Fastify API, routes, middleware, auth, business logic
**סקיל/כלי:** Write + Task agent
**משימות שהושלמו:** T05 (skeleton), T06 (Auth), T07 (RBAC/Users), T08 (Clients), T09 (Templates), T10 (Instances), T11 (Tasks), T12 (Documents), T13 (Dashboard)
**סטטוס:** ✅ DONE

---

### 🎨 מפתח-לקוח (FE)
**תפקיד:** React components, pages, RTL, Tailwind, hooks
**סקיל/כלי:** Write + Task agent
**משימות שהושלמו:** T01 (monorepo setup)
**משימות פתוחות:** T14 (setup), T15 (login), T16 (layout), T17 (dashboard), T18 (clients), T19 (processes), T20 (tasks), T21 (documents)
**סטטוס:** 🔄 IN PROGRESS

---

### 🔍 הבוחן (QA)
**תפקיד:** בדיקות, validation, acceptance tests
**סקיל/כלי:** Bash + test runners
**משימות פתוחות:** T24 (acceptance tests)
**סטטוס:** ⬜ PENDING

---

### 📊 הקלט (DATA)
**תפקיד:** seed data ישראלי, תבניות תהליך, migrations
**סקיל/כלי:** Write + Bash
**משימות פתוחות:** T22 (seed data – מע"מ/ניכויים/שנתי/demo users)
**סטטוס:** ⬜ PENDING

---

### 🎼 המתזמר (ORCH)
**תפקיד:** ניהול לוגים, STATUS.md, TASKS.md, תיאום בין עובדים
**סקיל:** metzamer
**פעיל תמיד**

---

### 📨 השליח (MSG)
**תפקיד:** שליחת עדכונים ל-Telegram, polling לפקודות מרחוק
**סקיל:** shalich
**סקריפטים:** `scripts/shalich.sh`, `scripts/telegram-poll.sh`
**הגדרה:** `.env.telegram` (צריך יצירה ידנית)
**סטטוס:** ⬜ PENDING SETUP (ממתין ל-.env.telegram מהמשתמש)

---

## שיוך משימות לעובדים

| Task | עובד | תיאור | סטטוס |
|------|------|-------|-------|
| T00 | ARCH | ניתוח דרישות | ✅ |
| T01 | ARCH | Monorepo init | ✅ |
| T02 | SCHEMA | DB schema – Users/Clients | ✅ |
| T03 | SCHEMA | DB schema – Processes | ✅ |
| T04 | SCHEMA | DB schema – Tasks/Docs/Billing/Audit | ✅ |
| T05 | BE | Backend skeleton + Fastify | ✅ |
| T06 | BE | Auth endpoints + JWT | ✅ |
| T07 | BE | RBAC + Users API | ✅ |
| T08 | BE | Clients CRUD API | ✅ |
| T09 | BE | Process Template API | ✅ |
| T10 | BE | Process Instance API | ✅ |
| T11 | BE | Task API | ✅ |
| T12 | BE | Document API | ✅ |
| T13 | BE | Dashboard API | ✅ |
| T14 | FE | Frontend setup (React+Vite+Tailwind+RTL) | 🔄 |
| T15 | FE | Auth context + Login screen | ⬜ |
| T16 | FE | Layout + RTL sidebar | ⬜ |
| T17 | FE | Dashboard screen | ⬜ |
| T18 | FE | Client list + Client 360 | ⬜ |
| T19 | FE | Process/workflow view | ⬜ |
| T20 | FE | Task management screen | ⬜ |
| T21 | FE | Document hub screen | ⬜ |
| T22 | DATA | Seed data ישראלי + migrations | ⬜ |
| T23 | DATA | Docker Compose setup | ⬜ |
| T24 | QA | Acceptance tests | ⬜ |
| T25 | ORCH | Commit + push סופי | ⬜ |

---

## איך לתקשר עם הצוות

### כתיבה בעברית (שפת המנהל)
דבר עם הצוות בעברית – כל עובד מבין עברית:
- "האדריכל, תכנן את מבנה ה-API"
- "מפתח-שרת, בנה את endpoint החיפוש"
- "הבוחן, בדוק את ה-auth routes"

### פקודות מהירות
```
/מתזמר           → דוח סטטוס מלא
/מנהל-משימות     → תצוגת משימות לפי עובד
/שליח [הודעה]   → שלח לטלגרם
/claudeception   → שמור ידע חדש כסקיל
```

### מעקב מבחוץ (Telegram)
```bash
# הגדרת השליח (חד-פעמי)
cp /home/user/UrielPractice/.env.telegram.example /home/user/UrielPractice/.env.telegram
# ערוך והכנס Token ו-Chat ID
nano /home/user/UrielPractice/.env.telegram

# הפעל פולינג ברקע
nohup /home/user/UrielPractice/scripts/telegram-poll.sh &

# שלח סטטוס עכשיו
/home/user/UrielPractice/scripts/shalich.sh "$(cat /home/user/UrielPractice/STATUS.md | head -15)"
```
