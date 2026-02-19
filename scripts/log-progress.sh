#!/usr/bin/env bash
# Usage: ./scripts/log-progress.sh "TASK_ID" "STATUS" "MESSAGE" ["WORKER"]
# STATUS: START | DONE | FAIL | NOTE | BLOCK
# WORKER: ARCH | SCHEMA | BE | FE | QA | DATA | ORCH | MSG
# Example: ./scripts/log-progress.sh "T01" "DONE" "Monorepo initialized" "ARCH"

TASK_ID="$1"
STATUS="$2"
MESSAGE="$3"
WORKER="${4:-ORCH}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$(dirname "$0")/../progress.log"
STATUS_FILE="$(dirname "$0")/../STATUS.md"
SHALICH="$(dirname "$0")/shalich.sh"

# רשימת שמות עובדים בעברית
case "$WORKER" in
  ARCH)   WORKER_HE="האדריכל" ;;
  SCHEMA) WORKER_HE="הסכמאי" ;;
  BE)     WORKER_HE="מפתח-שרת" ;;
  FE)     WORKER_HE="מפתח-לקוח" ;;
  QA)     WORKER_HE="הבוחן" ;;
  DATA)   WORKER_HE="הקלט" ;;
  MSG)    WORKER_HE="השליח" ;;
  ORCH)   WORKER_HE="המתזמר" ;;
  *)      WORKER_HE="$WORKER" ;;
esac

# סמל סטטוס
case "$STATUS" in
  START) STATUS_ICON="🔄" ;;
  DONE)  STATUS_ICON="✅" ;;
  FAIL)  STATUS_ICON="❌" ;;
  BLOCK) STATUS_ICON="🚨" ;;
  NOTE)  STATUS_ICON="📝" ;;
  *)     STATUS_ICON="📌" ;;
esac

echo "[$TIMESTAMP] $STATUS_ICON [$STATUS] [$TASK_ID] [$WORKER_HE] $MESSAGE" >> "$LOG_FILE"

# Rewrite STATUS.md with latest info
LAST_20=$(tail -20 "$LOG_FILE")
cat > "$STATUS_FILE" << STATUSEOF
# סטטוס עדכני – מערכת ניהול משרד רו"ח
**עודכן לאחרונה:** $TIMESTAMP
**עובד אחרון:** $WORKER_HE
**משימה:** [$TASK_ID] – $STATUS

## $STATUS_ICON משימה נוכחית
**$WORKER_HE** | **[$TASK_ID]** | $STATUS: $MESSAGE

## 20 הרשומות האחרונות בלוג
\`\`\`
$LAST_20
\`\`\`

## איך לעקוב מבחוץ
\`\`\`bash
# סטטוס מיידי
cat /home/user/UrielPractice/STATUS.md

# לוג מלא
cat /home/user/UrielPractice/progress.log

# 30 שורות אחרונות
tail -30 /home/user/UrielPractice/progress.log

# עדכון לטלגרם
/home/user/UrielPractice/scripts/shalich.sh "\$(cat /home/user/UrielPractice/STATUS.md | head -10)"
\`\`\`
STATUSEOF

echo "✓ [$WORKER_HE] [$TASK_ID] $STATUS_ICON $STATUS – $MESSAGE"

# שלח לטלגרם אוטומטית במקרים חשובים
if [ "$STATUS" = "DONE" ] || [ "$STATUS" = "FAIL" ] || [ "$STATUS" = "BLOCK" ]; then
  if [ -f "$SHALICH" ] && [ -f "$(dirname "$0")/../.env.telegram" ]; then
    TELEGRAM_MSG="$STATUS_ICON UrielPractice
[$TASK_ID] $WORKER_HE
$STATUS: $MESSAGE
⏰ $TIMESTAMP"
    bash "$SHALICH" "$TELEGRAM_MSG" 2>/dev/null &
  fi
fi
