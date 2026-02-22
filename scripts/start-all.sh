#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# start-all.sh – הפעל את כל שירותי UrielPractice
# שימוש: ./scripts/start-all.sh [--with-telegram]
#         נקרא אוטומטית מ-crontab: @reboot
# ════════════════════════════════════════════════════════

set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/uriel-autostart.log"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

log() { echo "[$TIMESTAMP] $*" | tee -a "$LOG"; }

log "════════════════════════════════════════════"
log "  UrielPractice – הפעלת שירותים"
log "════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────
# 1. המתן ל-Docker daemon
# ─────────────────────────────────────────────────────────
wait_for_docker() {
  local retries=30
  while ! docker info > /dev/null 2>&1; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && { log "❌ Docker לא זמין"; exit 1; }
    log "⏳ ממתין ל-Docker... ($retries נסיונות נותרו)"
    sleep 2
  done
  log "✅ Docker זמין"
}

# ─────────────────────────────────────────────────────────
# 2. הפעל Docker Compose שירותים
# ─────────────────────────────────────────────────────────
start_docker_services() {
  log "🐳 מפעיל Docker Compose..."
  cd "$WORKDIR"

  # הפעל בסיסיים (postgres + backend + frontend)
  docker compose up -d --remove-orphans postgres backend frontend 2>&1 | tail -5

  log "✅ Docker services פועלים"
}

# ─────────────────────────────────────────────────────────
# 3. הפעל Telegram bot (אם .env.telegram קיים)
# ─────────────────────────────────────────────────────────
start_telegram_bot() {
  local ENV_FILE="$WORKDIR/.env.telegram"
  if [ ! -f "$ENV_FILE" ]; then
    log "ℹ️  .env.telegram לא נמצא – דילוג על בוט טלגרם"
    return 0
  fi

  log "📡 מפעיל Telegram bot (Docker)..."
  cd "$WORKDIR"
  docker compose --profile with-telegram up -d --remove-orphans telegram-bot 2>&1 | tail -3
  log "✅ Telegram bot פועל בתוך Docker"
}

# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
wait_for_docker
start_docker_services
start_telegram_bot

log ""
log "✅ כל השירותים הופעלו!"
log "   בדוק: docker compose ps"
log "   לוג זה: tail -f $LOG"
log "════════════════════════════════════════════"
