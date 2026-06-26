# PekeTube

## Description (English)

**PekeTube** is a **mobile-first, installable PWA** aimed at **children**: it wraps YouTube in a simple, kid-friendly experience. **Parents** can use a **parental panel** (PIN, channel/video/title blocks, player settings) tied to their Google account; server-side state lives in **SQLite**. The app lives under [`peketube/`](peketube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). It uses the **YouTube Data API** (guest mode with a project API key, or **Google OAuth / Auth.js v5** for signed-in users), a **local cache** (Dexie), plus public **about / privacy / contact** pages and an optional **info landing** (`/info`) with a contact form (SMTP). Product steps are driven by **prompts** in [`.prompts/`](.prompts/).

## Descripción (Español)

**PekeTube** es una **PWA móvil e instalable** orientada a **niños**: presenta YouTube de forma sencilla y adaptada a ellos. Los **padres o tutores** disponen de un **panel parental** (PIN, bloqueos, ajustes del reproductor) vinculado a la cuenta Google; el estado en servidor va en **SQLite**. La aplicación está en [`peketube/`](peketube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). Usa la **YouTube Data API** (modo invitado con API key del proyecto, o **Google OAuth / Auth.js v5** con sesión), **caché local** (Dexie), páginas **sobre / privacidad / contacto** (ES·EN) y una **landing** pública (`/info`) con formulario de contacto por SMTP. El alcance se guía con **prompts** en [`.prompts/`](.prompts/).

---

Monorepo ligero: la app PWA está en **`peketube/`**; prompts en **`.prompts/`**.

- Entorno local, comandos y mapa de rutas: [`peketube/README.md`](peketube/README.md)
- Despliegue TrueNAS + Caddy, landing (`peketubeinfo`), SMTP contacto, volumen SQLite: [`peketube/docs/deploy-truenas.md`](peketube/docs/deploy-truenas.md)

> El proyecto se llamaba **KidsTube**; tras el rename a **PekeTube** la
> carpeta raíz del repo (`KidsTube/`) mantiene su nombre histórico — solo cambia
> la subcarpeta `peketube/` y la marca visible.

## Desde la raíz del repo

```bash
pnpm install    # instala dependencias en peketube (script prepare)
pnpm dev        # arranca Next en http://localhost:3000
pnpm dev:lan    # escucha en 0.0.0.0 (móvil en la misma red)
```

## Solo dentro de la app

```bash
cd peketube
pnpm install
pnpm dev
```

Entorno de desarrollo en PC: [`.prompts/setup-entorno-pc.md`](.prompts/setup-entorno-pc.md).
