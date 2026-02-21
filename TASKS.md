# תכנית עבודה – מערכת ניהול משרד רו"ח
> כל משימה: עד 20 דקות | עדכון לוג לאחר כל משימה | ניתן לעקוב ב-`progress.log` ו-`STATUS.md`

## איך לעקוב אחרי ההתקדמות
```bash
# סטטוס עדכני
cat /home/user/UrielPractice/STATUS.md

# לוג מלא
cat /home/user/UrielPractice/progress.log

# 20 שורות אחרונות
tail -20 /home/user/UrielPractice/progress.log
```

---

## SPRINT 1 – תשתית (Foundation)
| ID  | משימה | זמן מוערך | סטטוס |
|-----|--------|-----------|--------|
| T01 | Monorepo init + package.json (backend + frontend + root) | 15 min | ✅ DONE |
| T02 | Prisma schema חלק א: User, Role, Client, ClientContact | 15 min | ✅ DONE |
| T03 | Prisma schema חלק ב: ProcessTemplate, TemplateStep, DueRule, ProcessInstance, StepInstance | 15 min | ✅ DONE |
| T04 | Prisma schema חלק ג: Task, Document, RequiredDocRule, CommunicationMessage, BillingCharge, Payment, AuditLog | 15 min | ✅ DONE |
| T05 | Backend skeleton: Fastify app + env config + CORS + error handler | 20 min | ✅ DONE |

## SPRINT 2 – Backend API ליבה
| ID  | משימה | זמן מוערך | סטטוס |
|-----|--------|-----------|--------|
| T06 | Auth: JWT login/refresh/logout endpoints | 20 min | ✅ DONE |
| T07 | Auth middleware + RBAC (6 roles) + user management API | 20 min | ✅ DONE |
| T08 | Client CRUD API (create/read/update/delete + search + tags) | 20 min | ✅ DONE |
| T09 | Process Template API (CRUD + clone + steps) | 20 min | ✅ DONE |
| T10 | Process Instance API (create from template + status transitions) | 20 min | ✅ DONE |
| T11 | Task API (CRUD + assign + workload summary) | 20 min | ✅ DONE |
| T12 | Document API (upload + link to process + missing docs list) | 20 min | ✅ DONE |
| T13 | Dashboard API (overdue, due-soon, waiting-on-client, ready-for-review) | 20 min | ✅ DONE |

## SPRINT 3 – Frontend (5 בוטים מקבילים – ללא תלויות)
> ⚡ כל בוט עובד על דפים **שונים לחלוטין** – אין dependency בין הבוטים
> הפעלה: `./scripts/launch-parallel-bots.sh fe`

| ID  | משימה | בוט | זמן מוערך | סטטוס |
|-----|--------|-----|-----------|--------|
| T14 | Frontend setup: React + Vite + TypeScript + Tailwind + RTL + React Query | - | 20 min | ✅ DONE |
| T15 | Auth context + login screen (RTL, Hebrew, validation, errors) | **FE-א** | 20 min | 🔄 IN PROGRESS |
| T16 | Layout component + RTL sidebar navigation | - | 20 min | ✅ DONE |
| T17 | Dashboard screen (5 zones: Overdue, Due Soon, Waiting, Ready, My Tasks) | **FE-ב** | 20 min | 🔄 IN PROGRESS |
| T18 | Client list screen + Client 360 card (tabs: פרטים/תהליכים/מסמכים/תשלומים) | **FE-ג** | 20 min | 🔄 IN PROGRESS |
| T19 | Process/workflow view screen (timeline + steps + submit action) | **FE-ה** | 20 min | 🔄 IN PROGRESS |
| T20 | Task management screen (inbox by role, filters, quick actions) | **FE-ד** | 20 min | 🔄 IN PROGRESS |
| T21 | Document hub screen (upload + missing docs list) | - | 20 min | ✅ DONE |

## SPRINT 4 – נתוני פתיחה ופריסה
| ID  | משימה | זמן מוערך | סטטוס |
|-----|--------|-----------|--------|
| T22 | Seed data: תבניות תהליך ישראליות (מע"מ, ניכויים, דוח שנתי) + משתמשי demo | 15 min | ✅ DONE |
| T23 | Docker Compose (backend + postgres + frontend) | 15 min | ✅ DONE |

## SPRINT 5 – QA (בוחן)
> הפעלה: `./scripts/launch-parallel-bots.sh qa`
> **תנאי קדם:** Sprint 3 הושלם (T15-T20 כולם DONE)

| ID  | משימה | בוט | זמן מוערך | סטטוס |
|-----|--------|-----|-----------|--------|
| T24 | QA acceptance tests: הרץ bot personas + בדוק כל API endpoints | **QA** | 20 min | ⬜ PENDING |

---

## מקרא סטטוס
- ⬜ PENDING – טרם התחיל
- 🔄 IN PROGRESS – בוט רץ עכשיו
- ✅ DONE – הושלם
- ❌ FAILED – נכשל / נדרש טיפול

---

## הפעלת בוטים מקבילים

```bash
# הפעל רק FE (5 בוטים במקביל – T15, T17, T18, T19, T20)
./scripts/launch-parallel-bots.sh fe

# הפעל רק QA (לאחר שה-FE הסתיים)
./scripts/launch-parallel-bots.sh qa

# הפעל הכול (FE + QA)
./scripts/launch-parallel-bots.sh all

# עקוב אחרי הלוג בזמן אמת
tail -f /home/user/UrielPractice/progress.log

# ראה פלט בוט ספציפי
tail -f /tmp/uriel-bots/bot-1-FE-א.log
```

---

## ארכיטקטורה טכנולוגית

```
UrielPractice/
├── backend/              # Node.js + TypeScript + Fastify + Prisma
│   ├── src/
│   │   ├── auth/         # JWT + RBAC
│   │   ├── clients/      # Client CRUD
│   │   ├── processes/    # Workflow engine
│   │   ├── tasks/        # Task management
│   │   ├── documents/    # Document hub
│   │   ├── dashboard/    # Summary endpoints
│   │   └── shared/       # Types, utils, middleware
│   └── prisma/           # Schema + migrations + seed
├── frontend/             # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # Screen-level components
│       ├── hooks/        # React Query hooks
│       └── api/          # API client functions
├── bots/                 # User simulation bots (QA)
│   ├── personas/         # 9 bot personas (CPA, admin, etc.)
│   ├── runner.ts         # Parallel bot runner
│   └── reports/          # Generated QA reports
├── scripts/
│   ├── launch-parallel-bots.sh  # ← מפעיל claude CLI במקביל
│   ├── log-progress.sh          # ← עדכון progress.log
│   └── shalich.sh               # ← שליחה לטלגרם
├── progress.log          # ← עדכון לאחר כל משימה
├── STATUS.md             # ← סטטוס נוכחי תמיד עדכני
└── TASKS.md              # ← רשימת משימות זו
```

## Stack
| שכבה | טכנולוגיה |
|------|-----------|
| Backend | Node.js + TypeScript + Fastify |
| ORM | Prisma |
| DB | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS (RTL) |
| State | React Query (TanStack) |
| File Storage | Local (MVP) → S3 compatible |
