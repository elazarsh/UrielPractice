#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# אשף הגדרת השליח – UrielPracticeBot Telegram Setup
# הפעלה: bash scripts/setup-telegram.sh <BOT_TOKEN>
# ════════════════════════════════════════════════════════

set -e
BOT_TOKEN="${1:-}"
ENV_FILE="$(dirname "$0")/../.env.telegram"
BASE_URL="https://api.telegram.org/bot"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📨 אשף הגדרת השליח – UrielPracticeBot${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# --- שלב 1: קבל Token ---
if [ -z "$BOT_TOKEN" ]; then
  echo -e "${YELLOW}שלב 1: הכנס את Bot Token שקיבלת מ-@BotFather:${NC}"
  read -r -p "Token: " BOT_TOKEN
fi

if [ -z "$BOT_TOKEN" ]; then
  echo -e "${RED}❌ Token ריק. הפעל: bash scripts/setup-telegram.sh <TOKEN>${NC}"
  exit 1
fi

# --- שלב 2: בדוק שה-Token תקין ---
echo -e "\n${YELLOW}שלב 2: בודק Token...${NC}"
BOT_INFO=$(curl -sf "${BASE_URL}${BOT_TOKEN}/getMe" 2>/dev/null)
BOT_OK=$(echo "$BOT_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ok','false'))" 2>/dev/null || echo "false")

if [ "$BOT_OK" != "True" ] && [ "$BOT_OK" != "true" ]; then
  echo -e "${RED}❌ Token לא תקין! בדוק שהעתקת נכון מ-@BotFather${NC}"
  echo "תגובה מ-Telegram: $BOT_INFO"
  exit 1
fi

BOT_NAME=$(echo "$BOT_INFO" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['username'])" 2>/dev/null)
echo -e "${GREEN}✅ Token תקין! בוט: @${BOT_NAME}${NC}"

# --- שלב 3: קבל Chat ID ---
echo -e "\n${YELLOW}שלב 3: מחפש את ה-Chat ID שלך...${NC}"
echo -e "   ➡️  עכשיו שלח הודעה לבוט @${BOT_NAME} בטלגרם (כתוב: /start)"
echo -e "   ⏳ ממתין 30 שניות..."

CHAT_ID=""
for i in $(seq 1 6); do
  sleep 5
  UPDATES=$(curl -sf "${BASE_URL}${BOT_TOKEN}/getUpdates" 2>/dev/null)
  CHAT_ID=$(echo "$UPDATES" | python3 -c "
import json,sys
data = json.load(sys.stdin)
if data.get('ok') and data.get('result'):
    for r in reversed(data['result']):
        chat = r.get('message', {}).get('chat', {})
        if chat.get('id'):
            print(chat['id'])
            break
" 2>/dev/null)
  if [ -n "$CHAT_ID" ]; then
    echo -e "${GREEN}✅ Chat ID נמצא: $CHAT_ID${NC}"
    break
  fi
  echo -e "   ⏳ עדיין ממתין... (${i}/6) – שלח /start לבוט @${BOT_NAME}"
done

if [ -z "$CHAT_ID" ]; then
  echo -e "\n${YELLOW}לא נמצאה הודעה אוטומטית. הכנס Chat ID ידנית:${NC}"
  echo -e "   (פתח: https://api.telegram.org/bot${BOT_TOKEN}/getUpdates)"
  read -r -p "Chat ID: " CHAT_ID
fi

if [ -z "$CHAT_ID" ]; then
  echo -e "${RED}❌ Chat ID ריק. לא ניתן להמשיך.${NC}"
  exit 1
fi

# --- שלב 4: שמור .env.telegram ---
echo -e "\n${YELLOW}שלב 4: שומר .env.telegram...${NC}"
cat > "$ENV_FILE" << ENVEOF
TELEGRAM_BOT_TOKEN="${BOT_TOKEN}"
TELEGRAM_CHAT_ID="${CHAT_ID}"
ENVEOF
chmod 600 "$ENV_FILE"
echo -e "${GREEN}✅ נשמר ב-.env.telegram${NC}"

# --- שלב 5: בדיקת שליחה ---
echo -e "\n${YELLOW}שלב 5: שולח הודעת בדיקה...${NC}"
TEST_MSG="🎼 <b>UrielPractice – השליח מחובר!</b>

✅ הגדרת הבוט הושלמה בהצלחה
🤖 בוט: @${BOT_NAME}
💬 Chat ID: ${CHAT_ID}

<b>פקודות זמינות:</b>
/status – סטטוס נוכחי
/tasks – רשימת משימות
/log – לוג אחרון
/help – עזרה

⏰ $(date '+%Y-%m-%d %H:%M:%S')"

SEND_RESULT=$(curl -sf -X POST \
  "${BASE_URL}${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${CHAT_ID}\", \"text\": $(python3 -c "import json; print(json.dumps('''${TEST_MSG}'''))"), \"parse_mode\": \"HTML\"}" 2>/dev/null)

SEND_OK=$(echo "$SEND_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ok','false'))" 2>/dev/null || echo "false")

if [ "$SEND_OK" = "True" ] || [ "$SEND_OK" = "true" ]; then
  echo -e "${GREEN}✅ הודעת בדיקה נשלחה לטלגרם!${NC}"
else
  echo -e "${RED}❌ שגיאה בשליחה: $SEND_RESULT${NC}"
  exit 1
fi

# --- שלב 6: הפעל פולינג ברקע ---
echo -e "\n${YELLOW}שלב 6: מפעיל פולינג ברקע...${NC}"
POLL_SCRIPT="$(dirname "$0")/telegram-poll.sh"
if [ -f "$POLL_SCRIPT" ]; then
  nohup bash "$POLL_SCRIPT" > /tmp/uriel-telegram-poll.log 2>&1 &
  POLL_PID=$!
  echo "$POLL_PID" > /tmp/uriel-poll.pid
  echo -e "${GREEN}✅ פולינג פעיל (PID: $POLL_PID)${NC}"
  echo -e "   לצפייה בלוג: tail -f /tmp/uriel-telegram-poll.log"
  echo -e "   לעצירה: kill \$(cat /tmp/uriel-poll.pid)"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 השליח מוכן! כל העדכונים יגיעו ל-Telegram שלך.${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
