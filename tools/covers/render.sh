#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SLUGS=("$@")
[ ${#SLUGS[@]} -eq 0 ] && SLUGS=(barbershop-crm finance-app users-filter football-helper)
for slug in "${SLUGS[@]}"; do
  out="$ROOT/src/assets/projects/$slug/cover.png"
  mkdir -p "$(dirname "$out")"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor=1.5 --window-size=1600,1000 --virtual-time-budget=2000 \
    --screenshot="$out" "file://$DIR/cover.html#$slug" 2>/dev/null
  echo "$out"
done
