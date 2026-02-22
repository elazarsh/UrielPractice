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
# שלח הודעה לטלגרם (עם פיצול אוטומטי ל-4096 תווים)
# ─────────────────────────────────────────────────────────
send_message() {
  local text="$1"
  local MAX=4000

  # אם ההודעה קצרה מספיק – שלח ישירות
  if [ "${#text}" -le "$MAX" ]; then
    curl -s -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
      > /dev/null
    return
  fi

  # פצל לפי שורות לחלקים של עד MAX תווים
  local chunk=""
  while IFS= read -r line; do
    candidate="${chunk}${line}
"
    if [ "${#candidate}" -gt "$MAX" ]; then
      # שלח chunk הנוכחי
      if [ -n "$chunk" ]; then
        curl -s -X POST \
          "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
          -H "Content-Type: application/json" \
          -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$chunk" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
          > /dev/null
        sleep 0.5
      fi
      chunk="${line}
"
    else
      chunk="$candidate"
    fi
  done <<< "$text"

  # שלח שארית
  if [ -n "$chunk" ]; then
    curl -s -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$chunk" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
      > /dev/null
  fi
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /status – סיכום לפי ספרינטים (קורא TASKS.md בזמן אמת)
# ─────────────────────────────────────────────────────────
build_status() {
  local LAST_LINE LAST_TS

  LAST_LINE=$(tail -1 "$PROGRESS_LOG" 2>/dev/null)
  LAST_TS=$(echo "$LAST_LINE" | grep -oP '\[\K[^\]]+(?=\])' | head -1)

  # ספור לפי TASKS.md
  local S1_DONE S2_DONE S3_DONE S3_PROG S4_DONE S5_PEND

  S1_DONE=$(grep -E "T0[1-5].*✅" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')
  S2_DONE=$(grep -E "T(0[6-9]|1[0-3]).*✅" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')
  S3_DONE=$(grep -E "T(1[4-9]|2[01]|25).*✅" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')
  S3_PROG=$(grep -E "T(1[4-9]|2[01]|25).*🔄" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')
  S4_DONE=$(grep -E "T2[23].*✅" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')
  S5_PEND=$(grep -E "T24.*⬜" "$TASKS_FILE" 2>/dev/null | wc -l | tr -d ' ')

  local S3_STATUS="✅ הושלם"
  [ "$S3_PROG" -gt 0 ] && S3_STATUS="🔄 בעבודה (${S3_DONE} סגורות, ${S3_PROG} בתהליך)"

  echo "🎼 <b>UrielPractice – סטטוס פרויקט</b>
⏰ עדכון: ${LAST_TS:-לא ידוע}

<b>ספרינטים:</b>
✅ Sprint 1 – תשתית (T01-T05) – ${S1_DONE}/5 הושלמו
✅ Sprint 2 – Backend API (T06-T13) – ${S2_DONE}/8 הושלמו
${S3_STATUS:0:2} Sprint 3 – Frontend (T14-T25) – ${S3_STATUS}
✅ Sprint 4 – נתונים + Docker (T22-T23) – ${S4_DONE}/2 הושלמו
⬜ Sprint 5 – QA (T24) – ממתין

<b>עדכון אחרון:</b>
<code>$(echo "$LAST_LINE" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')</code>

📋 /workers | 📊 /sprints | 📜 /log | ❓ /help"
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /workers – פירוט מלא לכל עובד
# ─────────────────────────────────────────────────────────
build_workers() {
  if [ ! -f "$WORKER_STATUS_FILE" ]; then
    echo "⚠️ WORKER_STATUS.md לא נמצא."
    return
  fi

  python3 << PYEOF
import re, sys

with open("$WORKER_STATUS_FILE", "r", encoding="utf-8") as f:
    content = f.read()

output = ["🏗 <b>UrielPractice – פירוט עובדים</b>\n"]

blocks = re.split(r'\n(?=## )', content)

for block in blocks:
    if not block.strip():
        continue
    lines = block.strip().split('\n')
    if not lines or not lines[0].startswith('##'):
        continue
    # דלג על כותרת ראשית וסיכום
    header_text = lines[0].replace('## ', '').strip()
    if '📊' in header_text or 'סיכום' in header_text:
        continue

    fields = {}
    for line in lines[1:]:
        m = re.match(r'\*\*([^*]+)\*\*:\s*(.*)', line)
        if m:
            fields[m.group(1).strip()] = m.group(2).strip()

    badge = '✅' if '✅' in header_text else '🔄' if '🔄' in header_text else '⬜' if '⬜' in header_text else '❌' if '❌' in header_text else '📝'
    name = re.sub(r'^[✅🔄❌🚨⬜📝]\s*', '', header_text)

    block_text = f"\n{badge} <b>{name}</b>"

    task = fields.get('משימה', '')
    if task:
        block_text += f"\n  📌 {task}"

    screen = fields.get('מסך', '')
    if screen and screen != '—':
        block_text += f"\n  🖥 <code>{screen}</code>"

    doing = fields.get('עוסק ב', '')
    if doing:
        # קיצור ל-120 תווים
        short = doing[:120] + ('...' if len(doing) > 120 else '')
        block_text += f"\n  ✏️ {short}"

    updated = fields.get('עודכן', '')
    if updated and updated != '—':
        block_text += f"\n  ⏰ {updated}"

    output.append(block_text)

print('\n'.join(output))
PYEOF
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /log
# ─────────────────────────────────────────────────────────
build_log() {
  local N="${1:-15}"
  local LINES
  LINES=$(tail -"$N" "$PROGRESS_LOG" 2>/dev/null | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  if [ -z "$LINES" ]; then
    echo "📜 <b>לוג ריק</b> – עדיין לא הופעלו בוטים."
  else
    echo "📜 <b>${N} שורות לוג אחרונות:</b>
<code>${LINES}</code>"
  fi
}

# ─────────────────────────────────────────────────────────
# בנה תגובת /sprints – קורא מ-TASKS.md בזמן אמת
# ─────────────────────────────────────────────────────────
build_sprints() {
  python3 << PYEOF
import re

with open("$TASKS_FILE", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split('\n')
sprints = {}
current = None

for line in lines:
    sm = re.match(r'## SPRINT (\d+)', line)
    if sm:
        current = int(sm.group(1))
        sprints[current] = {'done': 0, 'prog': 0, 'pend': 0, 'fail': 0, 'tasks': []}
    if current and re.match(r'\| T\d+', line):
        cells = [c.strip() for c in line.split('|')]
        if len(cells) >= 5:
            tid = cells[1]
            task_name = cells[2][:50]
            status = cells[-2]
            if '✅' in status:
                sprints[current]['done'] += 1
            elif '🔄' in status:
                sprints[current]['prog'] += 1
                sprints[current]['tasks'].append(f"  🔄 {tid}: {task_name}")
            elif '⬜' in status:
                sprints[current]['pend'] += 1
            elif '❌' in status:
                sprints[current]['fail'] += 1

out = ["📊 <b>סיכום ספרינטים – UrielPractice</b>\n"]

sprint_names = {
    1: "תשתית",
    2: "Backend API",
    3: "Frontend",
    4: "נתונים + Docker",
    5: "QA"
}

for num in sorted(sprints.keys()):
    s = sprints[num]
    total = s['done'] + s['prog'] + s['pend'] + s['fail']
    if s['fail'] > 0:
        badge = '❌'
    elif s['prog'] > 0:
        badge = '🔄'
    elif s['pend'] == total:
        badge = '⬜'
    elif s['done'] == total:
        badge = '✅'
    else:
        badge = '🔄'

    name = sprint_names.get(num, f"Sprint {num}")
    out.append(f"{badge} <b>Sprint {num}</b> – {name}")
    out.append(f"   ✅ {s['done']} הושלמו | 🔄 {s['prog']} פעילים | ⬜ {s['pend']} ממתינים")
    for t in s['tasks']:
        out.append(t)

print('\n'.join(out))
PYEOF
}

# ─────────────────────────────────────────────────────────
# לולאת פולינג ראשית
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
    RAW_TEXT=$(echo "$line" | cut -d'|||' -f2)
    OFFSET=$((UPDATE_ID + 1))

    # strip @BotName suffix (e.g. /help@MyBot → /help)
    CMD=$(echo "$RAW_TEXT" | sed 's/@[A-Za-z0-9_]*//' | awk '{print $1}')

    case "$CMD" in

      /status|/סטטוס)
        send_message "$(build_status)"
        ;;

      /workers|/עובדים)
        send_message "$(build_workers)"
        ;;

      /log)
        send_message "$(build_log 15)"
        ;;

      /log30|/לוג30)
        send_message "$(build_log 30)"
        ;;

      /tasks|/משימות)
        TASKS=$(grep -E "T[0-9]+.*[✅🔄⬜❌]" "$TASKS_FILE" 2>/dev/null \
          | head -30 \
          | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
        send_message "📋 <b>משימות:</b>
<code>$TASKS</code>"
        ;;

      /sprints|/ספרינטים)
        send_message "$(build_sprints)"
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

/status   – סטטוס פרויקט לפי ספרינטים
/workers  – פירוט מלא לפי עובד
/sprints  – ספירת משימות לפי ספרינט (בזמן אמת)
/tasks    – רשימת משימות עם סטטוס
/log      – 15 שורות לוג אחרונות
/log30    – 30 שורות לוג
/version  – גרסת הבוט
/help     – עזרה זו

🔖 <i>${BOT_VERSION}</i>"
        ;;

    esac
  done <<< "$RESULTS"

  sleep 5
done
