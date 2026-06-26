#!/usr/bin/env bash
# Genera iconos PWA estilo YouTube (fondo blanco + pastilla roja centrada).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONS="$ROOT/public/icons"
SPLASH="$ROOT/public/splash"
BG="#0F0F0F"
WHITE="#FFFFFF"
# Rojo PekeTube (distinto del #FF0000 de YouTube)
RED="#E62117"

mkdir -p "$ICONS" "$SPLASH"

render_icon() {
  local out="$1"
  local size="$2"
  local pad_x=$(( size * 80 / 512 ))
  local pad_y=$(( size * 112 / 512 ))
  local rw=$(( size * 352 / 512 ))
  local rh=$(( size * 288 / 512 ))
  local rx=$(( size * 72 / 512 ))
  local x1=$pad_x
  local y1=$pad_y
  local x2=$(( pad_x + rw - 1 ))
  local y2=$(( pad_y + rh - 1 ))
  local px1=$(( size * 204 / 512 ))
  local py1=$(( size * 168 / 512 ))
  local px2=$(( size * 204 / 512 ))
  local py2=$(( size * 344 / 512 ))
  local px3=$(( size * 336 / 512 ))
  local py3=$(( size * 256 / 512 ))
  magick -size "${size}x${size}" "xc:${WHITE}" \
    -fill "$RED" -draw "roundrectangle ${x1},${y1} ${x2},${y2} ${rx},${rx}" \
    -fill white -draw "polygon ${px1},${py1} ${px2},${py2} ${px3},${py3}" \
    "$out"
}

# --- PWA / favicon / splash: solo pastilla roja (source.svg), sin texto ---
render_icon "$ICONS/icon-512.png" 512
render_icon "$ICONS/icon-192.png" 192
render_icon "$ICONS/apple-touch-icon-180.png" 180
cp "$ICONS/icon-512.png" "$ICONS/icon-512-maskable.png"
magick "$ICONS/icon-512.png" -colorspace Gray "$ICONS/icon-512-monochrome.png"
magick \( "$ICONS/icon-512.png" -resize 16x16 \) \( "$ICONS/icon-512.png" -resize 32x32 \) \( "$ICONS/icon-512.png" -resize 48x48 \) -delete 0 "$ICONS/favicon.ico"

# --- OAuth / branding Google: icono + PekeTube ES (no van en manifest PWA) ---
magick -density 384 -background white "$ICONS/peketube-logo-horizontal.svg" \
  -resize 880x192 "$ICONS/peketube-logo-horizontal.png"
magick -density 384 -background white "$ICONS/peketube-logo-horizontal.svg" \
  -resize 440x96 "$ICONS/peketube-logo-horizontal-sm.png"
magick -size 512x512 "xc:${WHITE}" \
  \( "$ICONS/peketube-logo-horizontal.svg" -density 384 -resize 420x \) \
  -gravity center -composite "$ICONS/oauth-logo-square.png"
magick "$ICONS/oauth-logo-square.png" -resize 120x120 "$ICONS/oauth-logo-120.png"

for spec in "640x1136" "750x1334" "828x1792" "1125x2436" "1242x2688" "1284x2778"; do
  h="${spec#*x}"
  icon=$(( h / 5 ))
  [[ $icon -gt 280 ]] && icon=280
  magick -size "${spec}" "xc:${BG}" \
    \( "$ICONS/icon-512.png" -resize "${icon}x${icon}" \) -gravity center -composite \
    "$SPLASH/apple-splash-${spec}.png"
done

echo "OK: $ICONS and $SPLASH"
