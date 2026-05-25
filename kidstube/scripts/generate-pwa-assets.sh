#!/usr/bin/env bash
# Genera iconos PWA estilo YouTube (prompt 09). Requiere ImageMagick.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONS="$ROOT/public/icons"
SPLASH="$ROOT/public/splash"
BG="#0F0F0F"
RED="#E60000"

mkdir -p "$ICONS" "$SPLASH"

render_icon() {
  local out="$1"
  local size="$2"
  local rx=$(( size * 108 / 512 ))
  magick -size "${size}x${size}" xc:none \
    -fill "$RED" -draw "roundrectangle 0,0 $((size - 1)),$((size - 1)) $rx,$rx" \
    -fill white -draw "polygon $((size * 196 / 512)),$((size * 158 / 512)) $((size * 196 / 512)),$((size * 354 / 512)) $((size * 332 / 512)),$((size * 256 / 512))" \
    "$out"
}

render_icon "$ICONS/icon-512.png" 512
render_icon "$ICONS/icon-192.png" 192
render_icon "$ICONS/apple-touch-icon-180.png" 180
cp "$ICONS/icon-512.png" "$ICONS/icon-512-maskable.png"
magick "$ICONS/icon-512.png" -colorspace Gray "$ICONS/icon-512-monochrome.png"
magick \( "$ICONS/icon-512.png" -resize 16x16 \) \( "$ICONS/icon-512.png" -resize 32x32 \) \( "$ICONS/icon-512.png" -resize 48x48 \) -delete 0 "$ICONS/favicon.ico"

for spec in "640x1136" "750x1334" "828x1792" "1125x2436" "1242x2688" "1284x2778"; do
  h="${spec#*x}"
  icon=$(( h / 5 ))
  [[ $icon -gt 280 ]] && icon=280
  magick -size "${spec}" "xc:${BG}" \
    \( "$ICONS/icon-512.png" -resize "${icon}x${icon}" \) -gravity center -composite \
    "$SPLASH/apple-splash-${spec}.png"
done

echo "OK: $ICONS and $SPLASH"
