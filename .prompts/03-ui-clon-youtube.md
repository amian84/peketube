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

**Status:** `resolved` — **revisable** (se ejecutó el prompt sin responder el formulario OQ; se aplicó la **opción sugerida en la columna Notes** de cada fila).

### OQs que se asumieron automáticamente (para revisar / cambiar de opinión)

| ID | Pregunta | **Se eligió (automático)** | Otras opciones que podías preferir |
|----|----------|----------------------------|-------------------------------------|
| **OQ-03-001** | Logo en top bar | **B** — SVG inspirado (variación legal; icono fino en prompt 09) | **A** — solo texto “YouTube” con tipografía similar |
| **OQ-03-002** | Botón “+” central en bottom nav | **C** — **quitar** el “+” (decisión usuario) | **A** — decorativo · **B** — toast “No disponible” |
| **OQ-03-003** | Sección Shorts | **C** — `useSearch` + `videoDuration=short` en API + query fija `shorts infantiles` (no feed vertical real) | **A** — feed vertical tipo TikTok · **B** — placeholder “Próximamente” |
| **OQ-03-004** | Chips de categorías bajo la top bar | **A** — sí, lista hardcodeada infantil (`home-chips.ts`) | **B** — sin chips |
| **OQ-03-005** | Miniaturas | **A** — `next/image` + `remotePatterns` (`i.ytimg.com`, etc.) | **B** — `<img>` simple |

**Si cambias de opinión:** edita la tabla de arriba (marca la opción nueva), indica el ID en chat o en un PR, y se ajusta solo el delta de UI/código afectado.

**Resolución registrada (vinculada a implementación actual):**

- **OQ-03-001 B** — logo SVG en `youtube-logo.tsx`.
- **OQ-03-002 C** — sin botón “+” en `bottom-nav.tsx` (solo 4 pestañas).
- **OQ-03-003 C** — Shorts en `shorts-feed.tsx` (`useSearch` + `videoDuration: "short"`).
- **OQ-03-004 A** — chips en `home-chips.ts` + `category-chips.tsx`.
- **OQ-03-005 A** — `next/image` en cards + `next.config.mjs` `remotePatterns`.

## Componentes (`src/components/layout` y `/video`)

- `<TopBar>`: logo (long-press 5s → `router.push("/parental/login")`), buscador, icono notificaciones (decorativo), avatar.
- `<BottomNav>`: Home, Shorts, Suscripciones, Tú (OQ-03-002 **C**: sin “+”). Activo según pathname.
- `<CategoryChips>`: lista horizontal de filtros.
- `<VideoCard>`: thumbnail 16:9, duración overlay, título 2 líneas, canal + vistas + tiempo.
- `<ShortCard>`: thumbnail 9:16, título 2 líneas.
- `<ChannelRow>`: avatar + nombre + suscriptores.

## Páginas (`src/app/(main)`)

- `/` Home: chips + grid `<VideoCard>` (datos de `useFeed`).
- `/shorts`: carrusel horizontal de `useSearch` con `videoDuration=short` (API) + query fija (ver `shorts-feed.tsx`).
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
