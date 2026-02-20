#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# מפעיל-בוטים מקבילי – UrielPractice
# מפעיל 6 Claude agents בו-זמנית, כל אחד על קבוצת משימות
# ════════════════════════════════════════════════════════

LOG="$(dirname "$0")/../progress.log"
RESULTS_DIR="/tmp/uriel-bots"
mkdir -p "$RESULTS_DIR"

log() {
  TS=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$TS] 🎼 [START] [PARALLEL] [המתזמר] $1" >> "$LOG"
  echo "🎼 $1"
}

log "מפעיל 6 בוטים מקבילים..."

# ─────────────────────────────────────────────────────────
# תיעוד הבוטים והמשימות שלהם
# ─────────────────────────────────────────────────────────
echo "
╔══════════════════════════════════════════════════════╗
║         🤖 בוטים מקבילים – UrielPractice            ║
╠══════════════════════════════════════════════════════╣
║  בוט 1 (FE-א): T14 Setup + T15 Login                ║
║  בוט 2 (FE-ב): T16 Layout + T17 Dashboard           ║
║  בוט 3 (FE-ג): T18 Clients list + Client 360        ║
║  בוט 4 (FE-ד): T19 Processes + T20 Tasks            ║
║  בוט 5 (FE-ה): T21 Documents hub                    ║
║  בוט 6 (DATA): T22 Seed data + T23 Docker           ║
╚══════════════════════════════════════════════════════╝
"

log "6 בוטים הופעלו – ראה /tmp/uriel-bots/bot-*.log לפלט כל בוט"
log "מעקב: tail -f /home/user/UrielPractice/progress.log"
