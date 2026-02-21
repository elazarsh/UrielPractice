# 🏗️ UrielPractice – סטטוס עובדים פעילים
> קובץ זה מתעדכן אוטומטית על ידי כל בוט/סקריפט. אל תערוך ידנית.
> עדכן עם: `./scripts/log-progress.sh "TASK" "STATUS" "תיאור" "WORKER" "פיצ'ר ספציפי|מסך|מה עובד על"`

---

## ✅ האדריכל (ARCH)
**משימה:** T01 – Monorepo setup
**מסך:** —
**פיצ'ר:** תשתית פרויקט
**עוסק ב:** הושלם – package.json, tsconfig, root workspace
**עודכן:** 2026-02-19

---

## ✅ הסכמאי (SCHEMA)
**משימה:** T02-T04 – Prisma schema מלא
**מסך:** —
**פיצ'ר:** מסד נתונים
**עוסק ב:** הושלם – User, Role, Client, Process, Task, Document, Billing, AuditLog
**עודכן:** 2026-02-19

---

## ✅ מפתח-שרת (BE)
**משימה:** T05-T13 – Backend API מלא
**מסך:** —
**פיצ'ר:** Fastify API + Auth + כל ה-routes
**עוסק ב:** הושלם – auth, clients, processes, tasks, documents, dashboard, seed, Docker
**עודכן:** 2026-02-20

---

## 🔄 מפתח-לקוח א (FE-א)
**משימה:** T15 – Auth context + Login screen
**מסך:** `/login` – LoginPage
**פיצ'ר:** Auth context + טופס כניסה עברי
**עוסק ב:** ולידציה עברית (שדה חובה / סיסמה שגויה) + loading spinner + remember-me + טיפול בשגיאות רשת
**קבצים:** `src/hooks/useAuth.ts` · `src/hooks/useAuthProvider.ts` · `src/pages/auth/LoginPage.tsx`
**עודכן:** —

---

## 🔄 מפתח-לקוח ב (FE-ב)
**משימה:** T17 – Dashboard screen (5 zones)
**מסך:** `/dashboard` – DashboardPage
**פיצ'ר:** 5 אזורי עבודה עם נתונים חיים
**עוסק ב:** אזור איחורים (אדום) + מתקרבים (כתום) + ממתין ללקוח (צהוב) + מוכן לבדיקה (ירוק) + המשימות שלי · כל אזור מציג ספירה + רשימה + ניווט בלחיצה
**קבצים:** `src/pages/dashboard/DashboardPage.tsx` · `src/api/dashboard.ts`
**עודכן:** —

---

## 🔄 מפתח-לקוח ג (FE-ג)
**משימה:** T18 – Client list + Client 360
**מסך:** `/clients` + `/clients/:id`
**פיצ'ר:** רשימת לקוחות + כרטיס 360 עם טאבים
**עוסק ב:** חיפוש + פילטר לפי סוג עסק (עוסק/חברה/שותפות) · Client 360 עם טאבים: פרטים / תהליכים / מסמכים / תשלומים / תקשורת
**קבצים:** `src/pages/clients/ClientsPage.tsx` · `src/pages/clients/ClientDetailPage.tsx` · `src/api/clients.ts`
**עודכן:** —

---

## 🔄 מפתח-לקוח ד (FE-ד)
**משימה:** T20 – Task management screen
**מסך:** `/tasks` – TasksPage
**פיצ'ר:** תיבת דואר נכנס לפי תפקיד
**עוסק ב:** תצוגת inbox מסוננת לפי תפקיד המשתמש · עמודות: משימה / לקוח / תאריך יעד / עדיפות / סטטוס · פעולות מהירות: סמן הושלם / הקצה מחדש · תאריכים צבועים (אדום=איחור, כתום=היום)
**קבצים:** `src/pages/tasks/TasksPage.tsx` · `src/api/tasks.ts`
**עודכן:** —

---

## 🔄 מפתח-לקוח ה (FE-ה)
**משימה:** T19 – Process/workflow view
**מסך:** `/processes` + `/processes/:id`
**פיצ'ר:** תצוגת ציר זמן + שלבים
**עוסק ב:** רשימת תהליכים עם פילטר לפי סטטוס + חיפוש · ProcessDetail: ציר זמן ויזואלי, שלב נוכחי מודגש, כפתור "הגש שלב", metadata (סוג / לקוח / תאריכים)
**קבצים:** `src/pages/processes/ProcessesPage.tsx` · `src/pages/processes/ProcessDetailPage.tsx` · `src/api/processes.ts`
**עודכן:** —

---

## ⬜ הבוחן (QA)
**משימה:** T24 – Acceptance tests
**מסך:** כל המסכים
**פיצ'ר:** בדיקות קבלה אוטומטיות
**עוסק ב:** ממתין ל-Sprint 3 (T15, T17, T18, T19, T20 חייבים להסתיים)
**קבצים:** `bots/runner.ts` · `bots/personas/*.ts` · `bots/reports/qa-summary.md`
**עודכן:** —

---

## 📊 סיכום ספרינטים
| Sprint | תיאור | סטטוס |
|--------|--------|--------|
| Sprint 1 | תשתית (T01-T05) | ✅ הושלם |
| Sprint 2 | Backend API (T06-T13) | ✅ הושלם |
| Sprint 3 | Frontend (T14-T21) | 🔄 בעבודה – 5 בוטים מקבילים |
| Sprint 4 | נתונים + Docker (T22-T23) | ✅ הושלם |
| Sprint 5 | QA (T24) | ⬜ ממתין |
