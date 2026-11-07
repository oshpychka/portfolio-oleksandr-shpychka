#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --virtual-time-budget=2000 "$@" 2>/dev/null; }
shot --window-size=1200,630 --screenshot="$ROOT/public/og.png" "file://$DIR/og.html"
shot --window-size=512,512 --screenshot="$DIR/icon-512.png" "file://$DIR/icon.html"
cp "$DIR/icon-512.png" "$ROOT/public/icon-512.png"
sips -z 192 192 "$DIR/icon-512.png" --out "$ROOT/public/icon-192.png" >/dev/null
sips -z 180 180 "$DIR/icon-512.png" --out "$ROOT/public/apple-touch-icon.png" >/dev/null
sips -z 32 32 -s format png "$DIR/icon-512.png" --out "$DIR/icon-32.png" >/dev/null
rm "$DIR/icon-512.png"
echo done
