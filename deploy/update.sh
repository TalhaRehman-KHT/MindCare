#!/usr/bin/env bash
# ============================================================
# MindCare — pull approved images and restart only what changed.
# Run by the systemd timer (mindcare-update.timer) every 2 minutes and at boot.
# Manual run (from the deploy/ folder):  ./update.sh
# ============================================================
set -euo pipefail

# Folder this script lives in (the repo's deploy/ folder), wherever the repo is cloned
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Never run two updates at the same time
exec 9>"$APP_DIR/.update.lock"
flock -n 9 || { echo "update already running, skipping"; exit 0; }

before="$(docker compose images --quiet 2>/dev/null | sort | tr '\n' ' ')"

docker compose pull --quiet
docker compose up -d --remove-orphans

after="$(docker compose images --quiet 2>/dev/null | sort | tr '\n' ' ')"

if [ "$before" != "$after" ]; then
  echo "$(date '+%F %T') new version deployed"
  docker image prune -f >/dev/null
fi
