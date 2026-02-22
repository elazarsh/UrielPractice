#!/usr/bin/env bash
# Usage: ./scripts/log-progress.sh "TASK_ID" "STATUS" "MESSAGE" ["WORKER"] ["SCREEN|FEATURE|DETAIL"]
# STATUS: START | DONE | FAIL | NOTE | BLOCK
# WORKER: ARCH | SCHEMA | BE | FE | QA | DATA | ORCH | MSG
# SCREEN|FEATURE|DETAIL (אופציונלי): "מסך Login|Auth context|עובד על ולידציה עברית"
# Example:
#   ./scripts/log-progress.sh "T15" "START" "מתחיל login screen" "FE" "/login – LoginPage|Auth context + טופס|ולידציה עברית + spinner"
#   ./scripts/log-progress.sh "T15" "DONE"  "Login screen הושלם" "FE"

TASK_ID="${1:-?}"
STATUS="${2:-NOTE}"
MESSAGE="${3:-עדכון}"
WORKER="${4:-ORCH}"
DETAIL="${5:-}"   # אופציונלי: "SCREEN|FEATURE|עוסק ב..."

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DATE_ONLY=$(date '+%Y-%m-%d')
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/../progress.log"
STATUS_FILE="$SCRIPT_DIR/../STATUS.md"
WORKER_STATUS_FILE="$SCRIPT_DIR/../WORKER_STATUS.md"
SHALICH="$SCRIPT_DIR/shalich.sh"

# ─────────────────────────────────────────────────────────
# שמות עובדים בעברית
# ─────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────
# סמלי סטטוס
# ─────────────────────────────────────────────────────────
case "$STATUS" in
  START) STATUS_ICON="🔄" ;;
  DONE)  STATUS_ICON="✅" ;;
  FAIL)  STATUS_ICON="❌" ;;
  BLOCK) STATUS_ICON="🚨" ;;
  NOTE)  STATUS_ICON="📝" ;;
  *)     STATUS_ICON="📌" ;;
esac

# ─────────────────────────────────────────────────────────
# כתוב ל-progress.log
# ─────────────────────────────────────────────────────────
touch "$LOG_FILE"
echo "[$TIMESTAMP] $STATUS_ICON [$STATUS] [$TASK_ID] [$WORKER_HE] $MESSAGE" >> "$LOG_FILE"

# ─────────────────────────────────────────────────────────
# עדכן STATUS.md
# ─────────────────────────────────────────────────────────
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
cat /home/user/UrielPractice/STATUS.md
tail -30 /home/user/UrielPractice/progress.log
/home/user/UrielPractice/scripts/shalich.sh "\$(cat /home/user/UrielPractice/STATUS.md | head -10)"
\`\`\`
STATUSEOF

# ─────────────────────────────────────────────────────────
# עדכן WORKER_STATUS.md אם יש פרמטר DETAIL
# ─────────────────────────────────────────────────────────
if [ -f "$WORKER_STATUS_FILE" ] && [ -n "$DETAIL" ]; then
  # פרס את DETAIL: "SCREEN|FEATURE|עוסק ב"
  IFS='|' read -r WS_SCREEN WS_FEATURE WS_DOING <<< "$DETAIL"
  WS_SCREEN="${WS_SCREEN:-—}"
  WS_FEATURE="${WS_FEATURE:-—}"
  WS_DOING="${WS_DOING:-$MESSAGE}"

  # בנה את הסטטוס החדש לעובד
  case "$STATUS" in
    START) WORKER_BADGE="🔄" ;;
    DONE)  WORKER_BADGE="✅" ;;
    FAIL)  WORKER_BADGE="❌" ;;
    BLOCK) WORKER_BADGE="🚨" ;;
    *)     WORKER_BADGE="📝" ;;
  esac

  NEW_BLOCK="## $WORKER_BADGE $WORKER_HE ($WORKER)
**משימה:** $TASK_ID – $MESSAGE
**מסך:** $WS_SCREEN
**פיצ'ר:** $WS_FEATURE
**עוסק ב:** $WS_DOING
**עודכן:** $DATE_ONLY"

  # החלף את הבלוק הישן של העובד בקובץ (לפי שם עובד)
  python3 - "$WORKER_STATUS_FILE" "$WORKER_HE" "$WORKER" "$NEW_BLOCK" << 'PYEOF'
import sys, re

filepath = sys.argv[1]
worker_he = sys.argv[2]
worker_code = sys.argv[3]
new_block = sys.argv[4]

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# מחפש בלוק קיים של העובד (## [סמל] שם-עובד)
pattern = rf'(##\s+[^\n]*(?:{re.escape(worker_he)}|{re.escape(worker_code)})[^\n]*\n(?:(?!\n##)[^\n]*\n)*)'
if re.search(pattern, content):
    new_content = re.sub(pattern, new_block + '\n\n', content)
else:
    # הוסף לפני שורת "📊 סיכום"
    new_content = content.replace('## 📊 סיכום', new_block + '\n\n---\n\n## 📊 סיכום')

# עדכן timestamp בכותרת
new_content = re.sub(
    r'> קובץ זה מתעדכן אוטומטית.*\n',
    f'> עדכון אחרון: {sys.argv[3]} | {worker_he} | {sys.argv[1].split("/")[-1]}\n',
    new_content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("ok")
PYEOF
fi

echo "✓ [$WORKER_HE] [$TASK_ID] $STATUS_ICON $STATUS – $MESSAGE"

# ─────────────────────────────────────────────────────────
# שלח לטלגרם במקרים חשובים
# ─────────────────────────────────────────────────────────
if [ "$STATUS" = "DONE" ] || [ "$STATUS" = "FAIL" ] || [ "$STATUS" = "BLOCK" ]; then
  if [ -f "$SHALICH" ] && [ -f "$SCRIPT_DIR/../.env.telegram" ]; then
    TELEGRAM_MSG="$STATUS_ICON UrielPractice
[$TASK_ID] $WORKER_HE
$STATUS: $MESSAGE
⏰ $TIMESTAMP"
    bash "$SHALICH" "$TELEGRAM_MSG" 2>/dev/null &
  fi
fi
