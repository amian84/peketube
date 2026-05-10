**Prompt type:** `implementation`

# 03 — UI clon YouTube (mobile-first)

## Objetivo

Réplica visual de la app YouTube en mobile: top bar, bottom nav, grid de vídeos, dark theme. Long-press 5s en el logo abre acceso al panel parental.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-03-001 | Logo en top bar | A) Texto "YouTube" con tipografía similar B) SVG inspirado (variación mínima legal) | B más fiel pero hay que diseñarlo (prompt 09) |
| OQ-03-002 | Bottom nav: incluir botón "+" central | A) Sí (decorativo, no abre nada) B) Sí, abre toast "No disponible" C) Quitar | A para fidelidad visual |
| OQ-03-003 | Sección Shorts | A) Implementar feed vertical real B) Placeholder ("Próximamente") C) Reutilizar Home filtrando por duración <60s | C realista sin demasiado trabajo |
| OQ-03-004 | Categorías de chips bajo top bar (Todo, Música, Dibujos…) | A) Sí, hardcoded infantiles B) No | A más fiel a YouTube |
| OQ-03-005 | Mostrar miniaturas como `next/image` o `<img>` | A) `next/image` con `remotePatterns` para `i.ytimg.com` B) `<img>` simple | A mejor performance |

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Componentes (`src/components/layout` y `/video`)

- `<TopBar>`: logo (long-press 5s → `router.push("/parental/login")`), buscador, icono notificaciones (decorativo), avatar.
- `<BottomNav>`: Home, Shorts, +, Suscripciones, Tú. Activo según pathname.
- `<CategoryChips>`: lista horizontal de filtros.
- `<VideoCard>`: thumbnail 16:9, duración overlay, título 2 líneas, canal + vistas + tiempo.
- `<ShortCard>`: thumbnail 9:16, título 2 líneas.
- `<ChannelRow>`: avatar + nombre + suscriptores.

## Páginas (`src/app/(main)`)

- `/` Home: chips + grid `<VideoCard>` (datos de `useFeed`).
- `/shorts`: feed vertical de `useSearch({ duration: "short" })`.
- `/subscriptions`: requiere login, lista de canales suscritos.
- `/you`: avatar grande, "Historial" (prompt 05), "Tus vídeos" placeholder.
- `/results?q=`: SearchBar prefilled + grid de `useSearch(q)`.

## Long-press detector

`hooks/useLongPress.ts` con threshold 5000 ms (configurable). Vibración (Vibration API) tras 4s para feedback.

## Criterios de aceptación

- En 360×800 (mobile) la UI se parece a YouTube real.
- Navegación entre tabs funciona; estado activo correcto.
- Long-press en logo → `/parental/login` (esa ruta puede ser placeholder hasta prompt 07).
- Sin warnings de Tailwind ni TypeScript.
