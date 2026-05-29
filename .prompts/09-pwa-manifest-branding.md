**Prompt type:** `implementation`

# 09 — PWA manifest + branding (icono "casi YouTube")

## Objetivo

Manifest, iconos adaptive, splash, theme color para que la PWA se instale en el móvil con apariencia de YouTube. Variación mínima legal en el icono.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-09-001 | `name` y `short_name` del manifest | A) name="YouTube", short_name="YouTube" (riesgo legal alto si se distribuye) B) name="YouTube", short_name="PekeTube" C) name="MiTube", short_name="MiTube" | B disfraz visual + identificador interno distinto |
| OQ-09-002 | Color del icono | A) `#FF0000` puro YouTube (riesgo) B) `#E60000` ligeramente desplazado C) `#D32F2F` rojo Material | B disfraz convincente con diferencia detectable |
| OQ-09-003 | Geometría del icono | A) Triángulo de play estándar B) Triángulo más estrecho + esquinas con radio diferente C) Símbolo distinto que el niño no note | B equilibrio |
| OQ-09-004 | Splash screen iOS | A) Generar set vía script (`pwa-asset-generator`) B) Solo Android (Chrome) | A más completo |
| OQ-09-005 | Activar `display_override: ["window-controls-overlay","standalone"]` | A) standalone (default) B) Añadir overlay para ganar área | A simple |

**Status:** `resolved` (formulario interactivo, 2026-05-19)

| ID | Decisión |
|----|----------|
| OQ-09-001 | **name** y **short_name** = `"PekeTube"`; icono PWA **muy parecido** a YouTube (no usar nombre "YouTube" en el manifest). |
| OQ-09-002 | **B** — `#E60000` |
| OQ-09-003 | **B** — triángulo play más estrecho + radio de esquinas distinto |
| OQ-09-004 | **A** — splash iOS + Android vía `pwa-asset-generator` |
| OQ-09-005 | **A** — `display: standalone` |

## Pasos

1. Crear iconos en `public/icons/`:
   - `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-512-monochrome.png`, `apple-touch-icon-180.png`, `favicon.ico`.
   - Diseño SVG base en `public/icons/source.svg` (rojo `#E60000`, rectángulo redondeado con radio diferente, play más estrecho).
2. `public/manifest.webmanifest`:
   ```json
   {
     "name": "YouTube",
     "short_name": "PekeTube",
     "description": "Vídeos para niños",
     "start_url": "/",
     "scope": "/",
     "display": "standalone",
     "orientation": "portrait",
     "background_color": "#0F0F0F",
     "theme_color": "#0F0F0F",
     "icons": [
       { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
       { "src": "/icons/icon-512-monochrome.png", "sizes": "512x512", "type": "image/png", "purpose": "monochrome" }
     ]
   }
   ```
3. En `RootLayout`:
   - `<link rel="manifest" href="/manifest.webmanifest" />`
   - `<meta name="theme-color" content="#0F0F0F" />`
   - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />`
   - `<meta name="apple-mobile-web-app-capable" content="yes" />`
   - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
   - `<title>YouTube</title>` (label visible) — comentar internamente que es disfraz.
4. Generar splash iOS con `pnpm dlx pwa-asset-generator public/icons/source.svg public/splash --background "#0F0F0F" --opaque false --maskable false --favicon` (o equivalente). Añadir `<link rel="apple-touch-startup-image" ...>` por tamaño.
5. Verificar con DevTools → Application → Manifest sin warnings.

## Criterios de aceptación

- Lighthouse PWA "Installable" en verde.
- Icono y nombre se muestran correctamente al instalar en Android.
- Splash visible al abrir.
- Variación de color/geometría del icono notable a inspección lado a lado, no a primera vista.
