#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# מפעיל-בוטים מקבילי – UrielPractice
# מפעיל claude agents בו-זמנית, כל אחד על קבוצת משימות
# שימוש: ./scripts/launch-parallel-bots.sh [fe|qa|all]
# ════════════════════════════════════════════════════════

set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$WORKDIR/progress.log"
RESULTS_DIR="/tmp/uriel-bots"
MODE="${1:-all}"

mkdir -p "$RESULTS_DIR"

# ─────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────
log() {
  local LEVEL="$1"; shift
  local TS; TS=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TS] $LEVEL [המתזמר] $*" | tee -a "$LOG"
}

# ─────────────────────────────────────────────────────────
# בדוק ש-claude CLI קיים
# ─────────────────────────────────────────────────────────
if ! command -v claude &>/dev/null; then
  echo "❌ claude CLI לא נמצא. התקן עם: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

# ─────────────────────────────────────────────────────────
# פונקציה: הפעל בוט בודד כ-background process
# ─────────────────────────────────────────────────────────
launch_bot() {
  local BOT_ID="$1"
  local TASK_IDS="$2"
  local WORKER_CODE="$3"
  local WORKER_NAME="$4"
  local PROMPT="$5"
  local LOG_FILE="$RESULTS_DIR/bot-${BOT_ID}.log"

  log "🤖 [START]" "בוט $BOT_ID ($TASK_IDS) – $WORKER_NAME מופעל"

  # הפעל claude ב-background, שמור פלט לקובץ
  claude --print \
    --output-format text \
    "$PROMPT" \
    > "$LOG_FILE" 2>&1 &

  echo $!   # מחזיר PID
}

# ─────────────────────────────────────────────────────────
# הגדרת פרומפטים לכל בוט FE (ללא תלויות ביניהם)
# כל בוט עובד על דפים / קבצים שונים לחלוטין
# ─────────────────────────────────────────────────────────

PROMPT_FE_A="You are מפתח-לקוח (Frontend Developer) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR/frontend

YOUR TASKS: T15 – Auth context + Login screen polish
Files to improve:
  - src/hooks/useAuth.ts
  - src/hooks/useAuthProvider.ts
  - src/pages/auth/LoginPage.tsx

Requirements:
- Full RTL Hebrew login form with validation (שדה חובה, סיסמה שגויה, etc.)
- Loading spinner during authentication
- Error messages in Hebrew
- Remember-me checkbox
- Handle network errors gracefully

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T15' 'DONE' 'Auth context + Login screen - RTL Hebrew, validation, error handling' 'FE'
"

PROMPT_FE_B="You are מפתח-לקוח (Frontend Developer) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR/frontend

YOUR TASKS: T17 – Dashboard screen (5 zones)
File to improve:
  - src/pages/dashboard/DashboardPage.tsx
  - src/api/dashboard.ts

Requirements:
- 5 distinct zones: איחורים (Overdue), מתקרבים (Due Soon), ממתין ללקוח (Waiting), מוכן לבדיקה (Ready), המשימות שלי (My Tasks)
- Each zone shows count + list of items
- Color-coded urgency (red/orange/yellow/green)
- Click on item navigates to relevant page
- Real data from /api/dashboard endpoint via React Query

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T17' 'DONE' 'Dashboard - 5 zones with real data, color-coded urgency' 'FE'
"

PROMPT_FE_C="You are מפתח-לקוח (Frontend Developer) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR/frontend

YOUR TASKS: T18 – Client list + Client 360
Files to improve:
  - src/pages/clients/ClientsPage.tsx
  - src/pages/clients/ClientDetailPage.tsx
  - src/api/clients.ts

Requirements:
- ClientsPage: search bar, filter by type (עוסק מורשה/חברה בע\"מ/שותפות), sort by name/ID
- ClientDetailPage (360 view): tabs for פרטים/תהליכים/מסמכים/תשלומים/תקשורת
- Show all related data per client in one place
- Hebrew field labels throughout

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T18' 'DONE' 'Client list with search/filter + Client 360 with tabs' 'FE'
"

PROMPT_FE_D="You are מפתח-לקוח (Frontend Developer) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR/frontend

YOUR TASKS: T20 – Task management screen (inbox by role)
Files to improve:
  - src/pages/tasks/TasksPage.tsx
  - src/api/tasks.ts

Requirements:
- Inbox view filtered by logged-in user's role
- Columns: משימה, לקוח, תאריך יעד, עדיפות, סטטוס
- Filter by: סטטוס (פתוח/בטיפול/הושלם), עדיפות (גבוה/בינוני/נמוך)
- Quick actions: סמן כהושלם, הקצה מחדש
- Color-coded due dates (overdue = red, today = orange)

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T20' 'DONE' 'Task management - inbox by role, filters, quick actions' 'FE'
"

PROMPT_FE_E="You are מפתח-לקוח (Frontend Developer) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR/frontend

YOUR TASKS: T19 – Process/workflow view (timeline + steps)
Files to improve:
  - src/pages/processes/ProcessesPage.tsx
  - src/pages/processes/ProcessDetailPage.tsx
  - src/api/processes.ts

Requirements:
- ProcessesPage: list with filter by status (פעיל/הושלם/מבוטל), search by client name
- ProcessDetailPage: visual timeline showing all steps, current step highlighted
- Each step shows: שם שלב, אחראי, תאריך יעד, סטטוס
- Action button: 'הגש שלב' to submit current step
- Show process metadata: סוג, לקוח, תאריך פתיחה, תאריך יעד

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T19' 'DONE' 'Process view - timeline, steps, submit action' 'FE'
"

PROMPT_QA="You are הבוחן (QA Tester) working on the UrielPractice CPA office management system.
Working directory: $WORKDIR

YOUR TASKS: T24 – QA acceptance tests
Files: $WORKDIR/bots/runner.ts and personas/*.ts

Requirements:
1. Run the existing bot personas against the backend to validate all API endpoints:
   cd $WORKDIR/bots && npx tsx runner.ts --parallel --output $WORKDIR/bots/reports
2. Check each bot's report for failures
3. Validate: auth endpoints, client CRUD, process API, task API, document API, dashboard API
4. Write a QA summary report to $WORKDIR/bots/reports/qa-summary.md with:
   - ✅ passed tests
   - ❌ failed tests with description
   - 🔶 warnings / suggestions

After completing, run:
  cd $WORKDIR && ./scripts/log-progress.sh 'T24' 'DONE' 'QA acceptance tests completed - see bots/reports/qa-summary.md' 'QA'
"

# ─────────────────────────────────────────────────────────
# הפעל בוטים לפי מצב
# ─────────────────────────────────────────────────────────

declare -a PIDS=()
declare -a BOT_IDS=()

case "$MODE" in
  fe|all)
    log "🎼 [START]" "מפעיל 5 בוטי FE במקביל..."
    echo "
╔══════════════════════════════════════════════════════╗
║         🤖 בוטים מקבילים – UrielPractice            ║
╠══════════════════════════════════════════════════════╣
║  FE-א: T15 – Auth + Login screen                    ║
║  FE-ב: T17 – Dashboard (5 zones)                    ║
║  FE-ג: T18 – Client list + Client 360               ║
║  FE-ד: T20 – Task management inbox                  ║
║  FE-ה: T19 – Process/workflow timeline              ║
╚══════════════════════════════════════════════════════╝
"
    PIDS+=( "$(launch_bot '1-FE-א' 'T15' 'FE' 'מפתח-לקוח א' "$PROMPT_FE_A")" )
    BOT_IDS+=( "1-FE-א" )

    PIDS+=( "$(launch_bot '2-FE-ב' 'T17' 'FE' 'מפתח-לקוח ב' "$PROMPT_FE_B")" )
    BOT_IDS+=( "2-FE-ב" )

    PIDS+=( "$(launch_bot '3-FE-ג' 'T18' 'FE' 'מפתח-לקוח ג' "$PROMPT_FE_C")" )
    BOT_IDS+=( "3-FE-ג" )

    PIDS+=( "$(launch_bot '4-FE-ד' 'T20' 'FE' 'מפתח-לקוח ד' "$PROMPT_FE_D")" )
    BOT_IDS+=( "4-FE-ד" )

    PIDS+=( "$(launch_bot '5-FE-ה' 'T19' 'FE' 'מפתח-לקוח ה' "$PROMPT_FE_E")" )
    BOT_IDS+=( "5-FE-ה" )
    ;;
esac

case "$MODE" in
  qa|all)
    log "🎼 [START]" "מפעיל בוט QA..."
    echo "
╔══════════════════════════════════════════════════════╗
║  QA: T24 – Acceptance tests (בוחן)                  ║
╚══════════════════════════════════════════════════════╝
"
    PIDS+=( "$(launch_bot '6-QA' 'T24' 'QA' 'הבוחן' "$PROMPT_QA")" )
    BOT_IDS+=( "6-QA" )
    ;;
esac

# ─────────────────────────────────────────────────────────
# המתן לכל הבוטים לסיים
# ─────────────────────────────────────────────────────────
log "⏳ [WAIT]" "ממתין לסיום ${#PIDS[@]} בוטים (PID: ${PIDS[*]})..."

FAILED=0
for i in "${!PIDS[@]}"; do
  PID="${PIDS[$i]}"
  BOT="${BOT_IDS[$i]}"
  if wait "$PID"; then
    log "✅ [DONE]" "בוט $BOT הסתיים בהצלחה"
  else
    log "❌ [FAIL]" "בוט $BOT נכשל (exit code $?)"
    FAILED=$((FAILED + 1))
  fi
done

# ─────────────────────────────────────────────────────────
# סיכום
# ─────────────────────────────────────────────────────────
TOTAL="${#PIDS[@]}"
PASSED=$((TOTAL - FAILED))
echo ""
echo "════════════════════════════════════════"
echo "  סיכום: $PASSED/$TOTAL בוטים הצליחו"
echo "  לוגים: $RESULTS_DIR/bot-*.log"
echo "  לוג ראשי: $LOG"
echo "════════════════════════════════════════"

if [ "$FAILED" -gt 0 ]; then
  log "❌ [FAIL]" "$FAILED בוטים נכשלו – בדוק $RESULTS_DIR/bot-*.log"
  exit 1
else
  log "✅ [DONE]" "כל $TOTAL הבוטים הסתיימו בהצלחה"
fi
