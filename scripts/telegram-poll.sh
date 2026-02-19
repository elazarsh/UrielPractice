#!/usr/bin/env bash
# טלגרם-פולינג – מאזין לפקודות מהמשתמש בטלגרם ומחזיר סטטוס
# הפעל ברקע: nohup ./scripts/telegram-poll.sh &
# עצור: kill $(cat /tmp/uriel-poll.pid)

ENV_FILE="$(dirname "$0")/../.env.telegram"
PROGRESS_LOG="$(dirname "$0")/../progress.log"
STATUS_FILE="$(dirname "$0")/../STATUS.md"
TASKS_FILE="$(dirname "$0")/../TASKS.md"
PID_FILE="/tmp/uriel-poll.pid"

source "$ENV_FILE" 2>/dev/null || { echo "❌ .env.telegram לא נמצא"; exit 1; }

echo $$ > "$PID_FILE"
echo "📡 השליח מאזין לפקודות... (PID: $$)"

send_message() {
  local text="$1"
  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
    > /dev/null
}

OFFSET=0

while true; do
  UPDATES=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=30" 2>/dev/null)

  # חלץ עדכונים
  RESULTS=$(echo "$UPDATES" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('ok') and data.get('result'):
    for r in data['result']:
        msg = r.get('message', {})
        text = msg.get('text', '')
        update_id = r.get('update_id', 0)
        print(f\"{update_id}|||{text}\")
" 2>/dev/null)

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    UPDATE_ID=$(echo "$line" | cut -d'|||' -f1)
    TEXT=$(echo "$line" | cut -d'|||' -f2)
    OFFSET=$((UPDATE_ID + 1))

    case "$TEXT" in
      /status|/סטטוס)
        REPLY="🎼 <b>UrielPractice – סטטוס</b>
$(tail -10 "$PROGRESS_LOG" 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')"
        send_message "$REPLY"
        ;;
      /tasks|/משימות)
        TASKS=$(grep -E "✅|🔄|⬜" "$TASKS_FILE" 2>/dev/null | head -15 | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        send_message "📋 <b>משימות:</b>
$TASKS"
        ;;
      /log|/לוג)
        LOGS=$(tail -15 "$PROGRESS_LOG" 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        send_message "📜 <b>לוג אחרון:</b>
<code>$LOGS</code>"
        ;;
      /help|/עזרה)
        send_message "🤖 <b>פקודות זמינות:</b>
/status – סטטוס נוכחי
/tasks – רשימת משימות
/log – לוג 15 שורות אחרונות
/help – עזרה"
        ;;
    esac
  done <<< "$RESULTS"

  sleep 5
done
