# PekeTube

## Description (English)

**PekeTube** is a **mobile-first, installable PWA** aimed at **children**: it wraps YouTube in a simple, kid-friendly experience. **Parents** will be able to **manage the app and set limits** on what children can see (allowlists, blocks, and related controls as the product evolves). The app lives under [`peketube/`](peketube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). It uses the **YouTube Data API** for search and feeds, **Google OAuth (Auth.js / NextAuth v5)** for sign-in and delegated access to user-scoped endpoints, and a **local cache** (Dexie) for offline-friendly behaviour. Product and implementation steps are driven by markdown **prompts** in [`.prompts/`](.prompts/).

## Descripción (Español)

**PekeTube** es una **PWA móvil e instalable** orientada a **niños**: presenta YouTube de forma sencilla y adaptada a ellos. Los **padres o tutores** podrán **gestionar la aplicación y acotar lo que pueden ver** (listas permitidas, bloqueos y controles afines según evolucione el producto). La aplicación está en [`peketube/`](peketube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). Usa la **YouTube Data API** para búsqueda y feeds, **Google OAuth (Auth.js / NextAuth v5)** para iniciar sesión y acceso delegado a APIs por usuario, y **caché local** (Dexie) para un comportamiento más tolerante a fallos de red. El alcance y las fases de implementación se guían con **prompts** en [`.prompts/`](.prompts/).

---

Monorepo ligero: la app PWA está en **`peketube/`**; prompts en **`.prompts/`**. Detalle de entorno y troubleshooting: [`peketube/README.md`](peketube/README.md).

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
