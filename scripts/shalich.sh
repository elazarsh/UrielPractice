#!/usr/bin/env bash
# השליח – שולח הודעות ל-Telegram
# שימוש: ./scripts/shalich.sh "הודעה"
# דרישות: .env.telegram עם TELEGRAM_BOT_TOKEN ו-TELEGRAM_CHAT_ID

MESSAGE="${1:-"📡 עדכון מ-UrielPractice"}"
ENV_FILE="$(dirname "$0")/../.env.telegram"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  השליח: קובץ .env.telegram לא נמצא."
  echo "    צור אותו עם:"
  echo "    TELEGRAM_BOT_TOKEN=\"your-token\""
  echo "    TELEGRAM_CHAT_ID=\"your-chat-id\""
  exit 1
fi

source "$ENV_FILE"

if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "⚠️  השליח: TELEGRAM_BOT_TOKEN או TELEGRAM_CHAT_ID חסרים ב-.env.telegram"
  exit 1
fi

# שלח הודעה
RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${TELEGRAM_CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"parse_mode\": \"HTML\"
  }")

OK=$(echo "$RESPONSE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ok","false"))' 2>/dev/null)

if [ "$OK" = "True" ] || [ "$OK" = "true" ]; then
  echo "✅ השליח: הודעה נשלחה לטלגרם"
else
  echo "❌ השליח: שגיאה בשליחה: $RESPONSE"
fi
