#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# restart-telegram-bot.sh – עצור, עדכן, הפעל מחדש את בוט הטלגרם
# שימוש: ./scripts/restart-telegram-bot.sh
# ════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKDIR="$SCRIPT_DIR/.."
PID_FILE="/tmp/uriel-poll.pid"
LOG_FILE="/tmp/uriel-telegram-bot.log"
POLL_SCRIPT="$SCRIPT_DIR/telegram-poll.sh"

# ─────────────────────────────────────────────────────────
# עצור תהליך קיים
# ─────────────────────────────────────────────────────────
stop_bot() {
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "🛑 עוצר בוט קיים (PID: $OLD_PID)..."
      kill "$OLD_PID" && sleep 1
      echo "✅ בוט נעצר"
    else
      echo "ℹ️  PID $OLD_PID לא פעיל (כבר עצור)"
    fi
    rm -f "$PID_FILE"
  else
    # חפש לפי שם גם בלי PID file
    FOUND=$(pgrep -f "telegram-poll.sh" 2>/dev/null || true)
    if [ -n "$FOUND" ]; then
      echo "🛑 עוצר תהליך ישן: $FOUND"
      kill $FOUND 2>/dev/null || true
      sleep 1
    else
      echo "ℹ️  אין בוט פעיל"
    fi
  fi
}

# ─────────────────────────────────────────────────────────
# עדכן קוד מ-git
# ─────────────────────────────────────────────────────────
pull_latest() {
  echo "📥 מעדכן קוד מ-git..."
  cd "$WORKDIR"
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "   ענף: $BRANCH"
  git pull origin "$BRANCH" --ff-only 2>&1 | tail -3
  echo "   גרסה: $(git log --oneline -1)"
}

# ─────────────────────────────────────────────────────────
# הפעל בוט חדש ברקע
# ─────────────────────────────────────────────────────────
start_bot() {
  echo "🚀 מפעיל בוט טלגרם חדש..."
  chmod +x "$POLL_SCRIPT"
  nohup bash "$POLL_SCRIPT" > "$LOG_FILE" 2>&1 &
  NEW_PID=$!
  echo $NEW_PID > "$PID_FILE"
  sleep 1

  if kill -0 "$NEW_PID" 2>/dev/null; then
    echo "✅ בוט פועל (PID: $NEW_PID)"
    echo "   לוג: tail -f $LOG_FILE"
  else
    echo "❌ הבוט נכשל בהפעלה – בדוק:"
    tail -10 "$LOG_FILE"
    exit 1
  fi
}

# ─────────────────────────────────────────────────────────
# הדפס גרסה לטלגרם אחרי עלייה
# ─────────────────────────────────────────────────────────
send_version_notice() {
  local ENV_FILE="$WORKDIR/.env.telegram"
  [ -f "$ENV_FILE" ] || return 0
  source "$ENV_FILE"

  GIT_HASH=$(git -C "$WORKDIR" log --oneline -1)
  MSG="✅ בוט טלגרם עודכן
גרסה: ${GIT_HASH}
פקודות חדשות:
/workers  – פירוט מלא לפי עובד
/sprints  – סיכום ספרינטים
/log30    – 30 שורות לוג
/help     – כל הפקודות"

  curl -s -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": $(echo "$MSG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"parse_mode\": \"HTML\"}" \
    > /dev/null && echo "📨 הודעת גרסה נשלחה לטלגרם"
}

# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
echo "════════════════════════════════════════"
echo "  UrielPractice – הפעלה מחדש של בוט"
echo "════════════════════════════════════════"

stop_bot
pull_latest
start_bot
send_version_notice

echo ""
echo "════════════════════════════════════════"
echo "✅ הבוט עלה עם הגרסה החדשה!"
echo "   כדי לאמת: שלח /help לבוט"
echo "════════════════════════════════════════"
