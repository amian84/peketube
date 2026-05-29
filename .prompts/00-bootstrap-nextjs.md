**Prompt type:** `implementation`

# 00 — Bootstrap Next.js + Tailwind + shadcn/ui + PWA

## Objetivo

Inicializar el proyecto Next.js 14 (App Router, TS, Tailwind), añadir shadcn/ui, configurar PWA con `next-pwa`, dejar tema oscuro YouTube-like y estructura de carpetas.

## Open questions (blocking implementation until resolved)

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-00-001 | Gestor de paquetes | A) pnpm (recomendado, ya en `setup-entorno-pc.md`) B) npm C) yarn | pnpm por velocidad y disco |
| OQ-00-002 | Nombre del paquete y carpeta del proyecto | A) `peketube` B) `youtube-kids-disguise` C) otro | Solo afecta nombres internos |
| OQ-00-003 | Activar Service Worker en `pnpm dev` | A) Solo producción (default `next-pwa`) B) También en dev (PWA debug) | A es lo habitual |
| OQ-00-004 | App Router locale | A) `es` B) `en` C) detectar navegador | UI en español por contexto del usuario |

**Status:** `deferred` (implementación 00 ejecutada con decisiones por defecto)

**Assumptions if deferred:** OQ-00-001 → **pnpm**. OQ-00-002 → carpeta **`peketube/`** bajo el repo (`.prompts` permanece en la raíz). OQ-00-003 → **PWA solo en producción** (`disable` en `development`). OQ-00-004 → **`lang="es"`** en el layout.

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Pasos

1. `pnpm create next-app@latest peketube --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
2. `cd peketube && pnpm dlx shadcn@latest init` (estilo Default, color base Neutral, CSS variables on, dark mode class).
3. Añadir `next-pwa`:
   ```bash
   pnpm add next-pwa
   pnpm add -D @types/serviceworker
   ```
   Configurar `next.config.mjs` envolviendo con `withPWA({ dest: "public", disable: process.env.NODE_ENV === "development", register: true, skipWaiting: true, runtimeCaching: [...] })`. Caching SOLO de assets propios (NO `youtube.com`).
4. Crear estructura:
   ```
   src/
     app/
       (main)/page.tsx                 # Home
       (main)/shorts/page.tsx
       (main)/subscriptions/page.tsx
       (main)/you/page.tsx
       (main)/results/page.tsx
       (main)/watch/[id]/page.tsx
       parental/...                    # se crea en prompt 07
       api/yt/...                      # se crea en prompt 01
       layout.tsx (RootLayout, dark)
       globals.css
     components/{ui,layout,video,player,parental}
     lib/{yt,db,auth,utils}
     hooks/
   ```
5. Tema: en `globals.css` y `tailwind.config.ts` definir tokens YouTube-like:
   - `--background: #0F0F0F` (dark default)
   - `--foreground: #FFFFFF`
   - `--accent: #FF0000`
   - `--muted: #272727`
   - Tipografía Roboto (`next/font/google`).
6. `RootLayout`:
   - `lang="es"`, `<html className="dark">`.
   - Meta `viewport`, `theme-color`, `apple-mobile-web-app-capable`.
   - Link al `manifest.webmanifest` (vacío de momento; se completa en prompt 09).
7. Página Home placeholder con el texto "PekeTube" centrado y un botón shadcn `<Button>` para validar Tailwind + shadcn.
8. Scripts `package.json`:
   - `dev: next dev`
   - `dev:lan: next dev -H 0.0.0.0`
   - `build: next build`
   - `start: next start`
   - `lint`, `typecheck: tsc --noEmit`.
9. Crear `.env.example` con `GOOGLE_CLIENT_ID=`, `GOOGLE_CLIENT_SECRET=`, `AUTH_SECRET=`, `NEXTAUTH_URL=http://localhost:3000`. No se usa `YOUTUBE_API_KEY` (todas las llamadas a YouTube van con Bearer OAuth del usuario).
10. `README.md` mínimo con setup y comandos.

## Criterios de aceptación

- `pnpm dev` arranca sin errores en `http://localhost:3000`.
- Tema oscuro aplicado, fuente Roboto, botón shadcn renderiza.
- `pnpm build && pnpm start` genera Service Worker (`public/sw.js`) en producción.
- `pnpm typecheck` pasa.
