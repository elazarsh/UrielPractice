#!/usr/bin/env bash
# ════════════════════════════════════════════════════════
# setup-autostart.sh – הגדר הפעלה אוטומטית 24/7
#
# מה הסקריפט עושה:
#   1. מוסיף @reboot crontab להפעלה אחרי boot
#   2. מוסיף watchdog כל 5 דקות לcrontab
#   3. מנסה ליצור systemd user service (אם זמין)
#
# שימוש: ./scripts/setup-autostart.sh
# ════════════════════════════════════════════════════════

set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "════════════════════════════════════════════"
echo "  UrielPractice – הגדרת הפעלה אוטומטית"
echo "════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────
# 1. Crontab: @reboot + watchdog
# ─────────────────────────────────────────────────────────
setup_crontab() {
  echo "📅 מגדיר crontab..."

  chmod +x "$WORKDIR/scripts/start-all.sh"
  chmod +x "$WORKDIR/scripts/ensure-running.sh"

  CRON_REBOOT="@reboot sleep 15 && $WORKDIR/scripts/start-all.sh >> /tmp/uriel-autostart.log 2>&1"
  CRON_WATCH="*/5 * * * * $WORKDIR/scripts/ensure-running.sh >> /tmp/uriel-watchdog.log 2>&1"

  # הסר רשומות ישנות של uriel ותוסף חדשות
  (
    crontab -l 2>/dev/null | grep -v "UrielPractice\|uriel-\|start-all\|ensure-running" || true
    echo ""
    echo "# UrielPractice – 24/7 autostart"
    echo "$CRON_REBOOT"
    echo "$CRON_WATCH"
  ) | crontab -

  echo "✅ Crontab מוגדר:"
  crontab -l | grep -A3 "UrielPractice"
  echo ""
}

# ─────────────────────────────────────────────────────────
# 2. Systemd user service (אם systemd זמין)
# ─────────────────────────────────────────────────────────
setup_systemd() {
  if ! command -v systemctl > /dev/null 2>&1; then
    echo "ℹ️  systemd לא זמין – דילוג"
    return 0
  fi

  echo "⚙️  מגדיר systemd user service..."

  SYSTEMD_DIR="$HOME/.config/systemd/user"
  mkdir -p "$SYSTEMD_DIR"

  # שירות Docker Compose
  cat > "$SYSTEMD_DIR/uriel-practice.service" << EOF
[Unit]
Description=UrielPractice – מערכת ניהול משרד רו"ח
After=network-online.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$WORKDIR
ExecStart=$WORKDIR/scripts/start-all.sh
ExecStop=/usr/bin/docker compose -f $WORKDIR/docker-compose.yml down
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
EOF

  # שירות watchdog
  cat > "$SYSTEMD_DIR/uriel-watchdog.service" << EOF
[Unit]
Description=UrielPractice Watchdog
After=uriel-practice.service

[Service]
Type=oneshot
ExecStart=$WORKDIR/scripts/ensure-running.sh
EOF

  cat > "$SYSTEMD_DIR/uriel-watchdog.timer" << EOF
[Unit]
Description=UrielPractice Watchdog – כל 5 דקות
Requires=uriel-watchdog.service

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

  systemctl --user daemon-reload 2>/dev/null || true
  systemctl --user enable uriel-practice.service 2>/dev/null && echo "✅ uriel-practice.service מופעל" || echo "⚠️  לא ניתן להפעיל systemd service (ייתכן שנדרש loginctl enable-linger)"
  systemctl --user enable uriel-watchdog.timer 2>/dev/null && echo "✅ uriel-watchdog.timer מופעל" || true
  echo ""
}

# ─────────────────────────────────────────────────────────
# 3. הפעל עכשיו
# ─────────────────────────────────────────────────────────
start_now() {
  echo "🚀 מפעיל שירותים עכשיו..."
  bash "$WORKDIR/scripts/start-all.sh" || true
  echo ""
}

# ─────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────
setup_crontab
setup_systemd
start_now

echo "════════════════════════════════════════════"
echo "✅ UrielPractice מוגדר לפעולה 24/7!"
echo ""
echo "  פקודות שימושיות:"
echo "  docker compose ps                     – סטטוס שירותים"
echo "  docker compose logs -f backend        – לוגי backend"
echo "  docker compose logs -f telegram-bot   – לוגי telegram"
echo "  tail -f /tmp/uriel-watchdog.log       – לוג watchdog"
echo "  tail -f /tmp/uriel-autostart.log      – לוג הפעלה"
echo "════════════════════════════════════════════"
