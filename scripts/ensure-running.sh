#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# ensure-running.sh – Watchdog: בדוק שכל השירותים רצים
# הפעל ע"י crontab כל 5 דקות:
#   */5 * * * * /home/user/UrielPractice/scripts/ensure-running.sh >> /tmp/uriel-watchdog.log 2>&1
# ════════════════════════════════════════════════════════

WORKDIR="/home/user/UrielPractice"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
RESTARTED=0

log() { echo "[$TIMESTAMP] $*"; }

# ─────────────────────────────────────────────────────────
# בדוק ש-Docker daemon פועל
# ─────────────────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  log "⚠️  Docker daemon לא פועל – מדלג"
  exit 0
fi

# ─────────────────────────────────────────────────────────
# בדוק קונטיינרים קריטיים
# ─────────────────────────────────────────────────────────
check_container() {
  local name="$1"
  local status
  status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null || echo "missing")

  if [ "$status" != "running" ]; then
    log "⚠️  $name אינו רץ (סטטוס: $status) – מפעיל מחדש..."
    docker compose -f "$WORKDIR/docker-compose.yml" up -d --no-deps "$name" 2>&1 | tail -2
    RESTARTED=$((RESTARTED + 1))
    log "✅ $name הופעל מחדש"
  fi
}

check_container "uriel-postgres"
check_container "uriel-backend"
check_container "uriel-frontend"

# ─────────────────────────────────────────────────────────
# בדוק Telegram bot (רק אם .env.telegram קיים)
# ─────────────────────────────────────────────────────────
if [ -f "$WORKDIR/.env.telegram" ]; then
  tg_status=$(docker inspect --format='{{.State.Status}}' "uriel-telegram-bot" 2>/dev/null || echo "missing")

  if [ "$tg_status" != "running" ]; then
    log "⚠️  uriel-telegram-bot אינו רץ (סטטוס: $tg_status) – מפעיל מחדש..."
    docker compose -f "$WORKDIR/docker-compose.yml" --profile with-telegram up -d telegram-bot 2>&1 | tail -2
    RESTARTED=$((RESTARTED + 1))
    log "✅ telegram-bot הופעל מחדש"
  else
    # בדוק heartbeat – הקובץ צריך להתעדכן בדקות האחרונות
    HEARTBEAT="/tmp/uriel-bot-heartbeat"
    if [ -f "$HEARTBEAT" ]; then
      AGE=$(( $(date +%s) - $(date -r "$HEARTBEAT" +%s 2>/dev/null || echo 0) ))
      if [ "$AGE" -gt 120 ]; then
        log "⚠️  Heartbeat ישן ($AGE שניות) – מאתחל telegram-bot..."
        docker compose -f "$WORKDIR/docker-compose.yml" --profile with-telegram restart telegram-bot 2>&1 | tail -2
        RESTARTED=$((RESTARTED + 1))
      fi
    fi
  fi
fi

# ─────────────────────────────────────────────────────────
# דיווח תקופתי (רק אם הופעל מחדש)
# ─────────────────────────────────────────────────────────
if [ "$RESTARTED" -gt 0 ]; then
  log "🔄 הופעלו מחדש $RESTARTED שירותים"

  # שלח התראה לטלגרם
  if [ -f "$WORKDIR/scripts/shalich.sh" ] && [ -f "$WORKDIR/.env.telegram" ]; then
    bash "$WORKDIR/scripts/shalich.sh" "⚠️ Watchdog: $RESTARTED שירותים הופעלו מחדש ב-$TIMESTAMP" 2>/dev/null || true
  fi
else
  log "✅ כל השירותים רצים תקין"
fi
