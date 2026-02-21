#!/usr/bin/env bash
# טלגרם-פולינג – מאזין לפקודות מהמשתמש בטלגרם ומחזיר סטטוס מפורט
# הפעל ברקע: nohup ./scripts/telegram-poll.sh &
# עצור:      kill $(cat /tmp/uriel-poll.pid)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.telegram"
PROGRESS_LOG="$SCRIPT_DIR/../progress.log"
STATUS_FILE="$SCRIPT_DIR/../STATUS.md"
TASKS_FILE="$SCRIPT_DIR/../TASKS.md"
WORKER_STATUS_FILE="$SCRIPT_DIR/../WORKER_STATUS.md"
PID_FILE="/tmp/uriel-poll.pid"
BOT_VERSION="$(git -C "$SCRIPT_DIR/.." log --oneline -1 2>/dev/null || echo 'unknown')"
BOT_STARTED="$(date '+%Y-%m-%d %H:%M:%S')"

source "$ENV_FILE" 2>/dev/null || { echo "❌ .env.telegram לא נמצא"; exit 1; }

echo $$ > "$PID_FILE"
echo "📡 השליח מאזין לפקודות... (PID: $$)"

# ─────────────────────────────────────────────────────────
# שלח הודעה לטלגרם
# ─────────────────────────────────────────────────────────
send_message() {
  local text="$1"
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
    > /dev/null
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /status – סיכום חכם לפי ספרינטים
# ─────────────────────────────────────────────────────────
build_status() {
  local LOG_FILE="$PROGRESS_LOG"
  local LAST_TS LAST_WORKER LAST_TASK

  # קרא עדכון אחרון מה-log
  LAST_LINE=$(tail -1 "$LOG_FILE" 2>/dev/null)
  LAST_TS=$(echo "$LAST_LINE" | grep -oP '\[\K[^\]]+(?=\])' | head -1)
  LAST_WORKER=$(echo "$LAST_LINE" | grep -oP '\[([^\]]+)\]' | sed -n '3p' | tr -d '[]')
  LAST_TASK=$(echo "$LAST_LINE" | grep -oP '\[([^\]]+)\]' | sed -n '2p' | tr -d '[]')

  # ספור משימות
  DONE_COUNT=$(grep -c "✅\|DONE" "$LOG_FILE" 2>/dev/null || echo 0)
  FAIL_COUNT=$(grep -c "❌\|FAIL" "$LOG_FILE" 2>/dev/null || echo 0)
  IN_PROG=$(grep -c "🔄\|START" "$LOG_FILE" 2>/dev/null || echo 0)

  # סטטוס ספרינטים מ-TASKS.md
  S1=$(grep -c "Sprint 1\|T0[1-5].*✅" "$TASKS_FILE" 2>/dev/null || echo "?")
  FE_DONE=$(grep -E "T1[4-9]|T2[01]" "$TASKS_FILE" 2>/dev/null | grep -c "✅" || echo 0)
  FE_PROG=$(grep -E "T1[4-9]|T2[01]" "$TASKS_FILE" 2>/dev/null | grep -c "🔄" || echo 0)
  FE_PEND=$(grep -E "T1[4-9]|T2[01]" "$TASKS_FILE" 2>/dev/null | grep -c "⬜" || echo 0)

  echo "🎼 <b>UrielPractice – סטטוס פרויקט</b>
⏰ עדכון: ${LAST_TS:-לא ידוע}

<b>ספרינטים:</b>
✅ Sprint 1 – תשתית (T01-T05) <b>הושלם</b>
✅ Sprint 2 – Backend API (T06-T13) <b>הושלם</b>
🔄 Sprint 3 – Frontend (T14-T21) <b>בעבודה</b>
   └ ✅ הושלמו: ${FE_DONE} מסכים | 🔄 פעילים: ${FE_PROG} | ⬜ ממתינים: ${FE_PEND}
✅ Sprint 4 – נתונים + Docker (T22-T23) <b>הושלם</b>
⬜ Sprint 5 – QA (T24) <b>ממתין ל-Sprint 3</b>

<b>עדכון אחרון:</b>
<code>$(echo "$LAST_LINE" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</code>

📋 /workers – פירוט לפי עובד
📜 /log – 15 שורות לוג אחרונות"
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /workers – פירוט מלא לכל עובד
# ─────────────────────────────────────────────────────────
build_workers() {
  if [ ! -f "$WORKER_STATUS_FILE" ]; then
    echo "⚠️ WORKER_STATUS.md לא נמצא. הפעל את הבוטים תחילה."
    return
  fi

  # קרא את WORKER_STATUS.md ופרמט ל-Telegram HTML
  python3 - "$WORKER_STATUS_FILE" << 'PYEOF'
import sys, re

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

output = []
output.append("🏗 <b>UrielPractice – פירוט עובדים פעילים</b>\n")

# מצא כל בלוק עובד (## סמל שם)
blocks = re.split(r'\n(?=## [✅🔄❌🚨⬜📝])', content)

for block in blocks:
    if not block.strip() or block.startswith('#') and '📊' in block:
        continue
    lines = block.strip().split('\n')
    if not lines or not lines[0].startswith('##'):
        continue

    header = lines[0].replace('## ', '').strip()
    # קרא שדות
    fields = {}
    for line in lines[1:]:
        m = re.match(r'\*\*([^*]+)\*\*:\s*(.*)', line)
        if m:
            fields[m.group(1).strip()] = m.group(2).strip()

    # קבע badge
    if '✅' in header:
        badge = '✅'
    elif '🔄' in header:
        badge = '🔄'
    elif '❌' in header:
        badge = '❌'
    elif '🚨' in header:
        badge = '🚨'
    elif '⬜' in header:
        badge = '⬜'
    else:
        badge = '📝'

    # בנה הודעה לעובד זה
    name = re.sub(r'^[✅🔄❌🚨⬜📝]\s*', '', header)
    block_text = f"\n{badge} <b>{name}</b>"

    task = fields.get('משימה', '')
    if task:
        block_text += f"\n  📌 משימה: {task}"

    screen = fields.get('מסך', '')
    if screen and screen != '—':
        block_text += f"\n  🖥 מסך: <code>{screen}</code>"

    feature = fields.get('פיצ\'ר', '') or fields.get('פיצ'ר', '')
    if feature and feature != '—':
        block_text += f"\n  🔧 פיצ'ר: {feature}"

    doing = fields.get('עוסק ב', '')
    if doing:
        block_text += f"\n  ✏️ עוסק ב: {doing}"

    updated = fields.get('עודכן', '')
    if updated and updated != '—':
        block_text += f"\n  ⏰ עודכן: {updated}"

    output.append(block_text)

# חלק להודעות (מגבלת 4096 תווים לטלגרם)
full = '\n'.join(output)
# escape HTML chars (מחוץ לתגיות)
safe = full.replace('&', '&amp;')
print(safe)
PYEOF
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /log – לוג מפורמט
# ─────────────────────────────────────────────────────────
build_log() {
  local N="${1:-15}"
  local LINES
  LINES=$(tail -"$N" "$PROGRESS_LOG" 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  if [ -z "$LINES" ]; then
    echo "📜 <b>לוג ריק</b> – עדיין לא הופעלו בוטים."
  else
    echo "📜 <b>$N שורות לוג אחרונות:</b>
<code>${LINES}</code>"
  fi
}

# ─────────────────────────────────────────────────────────
# לולאת פולינג
# ─────────────────────────────────────────────────────────
OFFSET=0

while true; do
  UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=30" 2>/dev/null)

  RESULTS=$(echo "$UPDATES" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('ok') and data.get('result'):
    for r in data['result']:
        msg = r.get('message', {})
        text = msg.get('text', '')
        update_id = r.get('update_id', 0)
        print(f'{update_id}|||{text}')
" 2>/dev/null)

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    UPDATE_ID=$(echo "$line" | cut -d'|||' -f1)
    TEXT=$(echo "$line" | cut -d'|||' -f2)
    OFFSET=$((UPDATE_ID + 1))

    case "$TEXT" in

      /status|/סטטוס)
        send_message "$(build_status)"
        ;;

      /workers|/עובדים)
        send_message "$(build_workers)"
        ;;

      /log|/לוג)
        send_message "$(build_log 15)"
        ;;

      /log30|/לוג30)
        send_message "$(build_log 30)"
        ;;

      /tasks|/משימות)
        TASKS=$(grep -E "T[0-9]+.*[✅🔄⬜❌]" "$TASKS_FILE" 2>/dev/null \
          | head -20 \
          | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        send_message "📋 <b>משימות:</b>
<code>$TASKS</code>"
        ;;

      /sprints|/ספרינטים)
        REPLY="📊 <b>סיכום ספרינטים</b>

✅ <b>Sprint 1</b> – תשתית (T01-T05) הושלם
✅ <b>Sprint 2</b> – Backend API (T06-T13) הושלם
🔄 <b>Sprint 3</b> – Frontend – 5 בוטים מקבילים:
   FE-א → T15: Login + Auth
   FE-ב → T17: Dashboard (5 zones)
   FE-ג → T18: Clients + 360
   FE-ד → T20: Task inbox
   FE-ה → T19: Process timeline
✅ <b>Sprint 4</b> – נתונים + Docker (T22-T23) הושלם
⬜ <b>Sprint 5</b> – QA (T24) ממתין

<i>להפעלת בוטים: ./scripts/launch-parallel-bots.sh fe</i>"
        send_message "$REPLY"
        ;;

      /version|/גרסה)
        send_message "🔖 <b>גרסת בוט – UrielPractice</b>

📦 <code>${BOT_VERSION}</code>
🕐 הופעל: ${BOT_STARTED}

✅ פקודות פעילות:
/status /workers /sprints /tasks /log /log30 /version /help"
        ;;

      /help|/עזרה)
        send_message "🤖 <b>פקודות זמינות – UrielPractice</b>

/status   – סטטוס נוכחי לפי ספרינטים
/workers  – <b>פירוט מלא לפי עובד</b> (מסך / פיצ'ר / עוסק ב)
/sprints  – סיכום ספרינטים + חלוקת בוטים
/tasks    – רשימת משימות עם סטטוס
/log      – 15 שורות לוג אחרונות
/log30    – 30 שורות לוג
/version  – גרסת הבוט הנוכחית
/help     – עזרה

🔖 <i>גרסה: $(echo "${BOT_VERSION}" | cut -c1-40)</i>"
        ;;

    esac
  done <<< "$RESULTS"

  sleep 5
done
