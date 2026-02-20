#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# קבלת Chat ID – הרץ אחרי ששלחת /start לבוט
# ════════════════════════════════════════════════════════
TOKEN="8557831812:AAHAi3xDwlRF-JmAjXMlv0FNk7S8_e3-vbc"
ENV_FILE="$(dirname "$0")/../.env.telegram"

echo "מחפש Chat ID..."
UPDATES=$(curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates")
CHAT_ID=$(echo "$UPDATES" | python3 -c "
import json,sys
data = json.load(sys.stdin)
results = data.get('result', [])
if results:
    chat = results[-1]['message']['chat']
    print(chat['id'])
else:
    print('')
" 2>/dev/null)

if [ -z "$CHAT_ID" ]; then
    echo "❌ לא נמצאה הודעה. בצע:"
    echo "   1. פתח טלגרם"
    echo "   2. חפש את הבוט שלך"
    echo "   3. שלח /start"
    echo "   4. הרץ שוב: bash scripts/get-chat-id.sh"
    exit 1
fi

echo "✅ Chat ID נמצא: $CHAT_ID"
# עדכן .env.telegram
sed -i "s/TELEGRAM_CHAT_ID=.*/TELEGRAM_CHAT_ID=\"$CHAT_ID\"/" "$ENV_FILE"
echo "✅ עודכן ב-.env.telegram"

# שלח הודעת בדיקה
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d "chat_id=$CHAT_ID&text=✅ UrielPractice מחובר לטלגרם!" > /dev/null
echo "✅ הודעת בדיקה נשלחה!"
