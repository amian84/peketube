# KidsTube

## Description (English)

**KidsTube** is a **mobile-first, installable PWA** aimed at **children**: it wraps YouTube in a simple, kid-friendly experience. **Parents** will be able to **manage the app and set limits** on what children can see (allowlists, blocks, and related controls as the product evolves). The app lives under [`kidstube/`](kidstube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). It uses the **YouTube Data API** for search and feeds, **Google OAuth (Auth.js / NextAuth v5)** for sign-in and delegated access to user-scoped endpoints, and a **local cache** (Dexie) for offline-friendly behaviour. Product and implementation steps are driven by markdown **prompts** in [`.prompts/`](.prompts/).

## Descripción (Español)

**KidsTube** es una **PWA móvil e instalable** orientada a **niños**: presenta YouTube de forma sencilla y adaptada a ellos. Los **padres o tutores** podrán **gestionar la aplicación y acotar lo que pueden ver** (listas permitidas, bloqueos y controles afines según evolucione el producto). La aplicación está en [`kidstube/`](kidstube/) (Next.js 14, App Router, Tailwind, shadcn, `next-pwa`). Usa la **YouTube Data API** para búsqueda y feeds, **Google OAuth (Auth.js / NextAuth v5)** para iniciar sesión y acceso delegado a APIs por usuario, y **caché local** (Dexie) para un comportamiento más tolerante a fallos de red. El alcance y las fases de implementación se guían con **prompts** en [`.prompts/`](.prompts/).

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
