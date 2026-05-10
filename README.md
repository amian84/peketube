# KidsTube

## Description (English)

**KidsTube** is a **mobile-first, installable PWA** that wraps YouTube in a curated experience for families. The app lives under [`kidstube/`](kidstube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). It uses the **YouTube Data API** for search and feeds, **Google OAuth (Auth.js / NextAuth v5)** for sign-in and delegated access to user-scoped endpoints, and a **local cache** (Dexie) for offline-friendly behaviour. Product and implementation steps are driven by markdown **prompts** in [`.prompts/`](.prompts/).

## Descripción (Español)

**KidsTube** es una **PWA móvil e instalable** que envuelve YouTube con una experiencia pensada para **familias y uso supervisado**. La aplicación está en [`kidstube/`](kidstube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). Usa la **YouTube Data API** para búsqueda y feeds, **Google OAuth (Auth.js / NextAuth v5)** para iniciar sesión y acceso delegado a APIs por usuario, y **caché local** (Dexie) para un comportamiento más tolerante a fallos de red. El alcance y las fases de implementación se guían con **prompts** en [`.prompts/`](.prompts/).

---

Monorepo ligero: la app PWA está en **`kidstube/`**; prompts en **`.prompts/`**. Detalle de entorno y troubleshooting: [`kidstube/README.md`](kidstube/README.md).

## Desde la raíz del repo (`KidsTube/`)

```bash
pnpm install    # instala dependencias en kidstube (script prepare)
pnpm dev        # arranca Next en http://localhost:3000
pnpm dev:lan    # escucha en 0.0.0.0 (móvil en la misma red)
```

## Solo dentro de la app

```bash
cd kidstube
pnpm install
pnpm dev
```

Entorno de desarrollo en PC: [`.prompts/setup-entorno-pc.md`](.prompts/setup-entorno-pc.md).
