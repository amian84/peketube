**Prompt type:** `implementation`

# 11 — Seguridad embed, home por categoría, Me gusta real, compartir interno, descripción sin clics, scroll infinito en búsqueda

## Objetivo

Unificar varios cambios de producto/técnica para **reducir salidas a youtube.com** desde el reproductor, **alinear expectativas del Home** con categorías reales, **Me gusta** contra la API de YouTube, **compartir** como copia de URL **interna** de la app, **bloquear clics en enlaces** dentro de la descripción del vídeo, y **paginación / scroll infinito** en resultados de búsqueda (y opcionalmente Home).

## Diagnóstico previo (revisión de código — ejecutar antes de implementar)

### 1) Home: ¿por qué “no salen vídeos de esa categoría”?

**No es que falte el wiring del chip → API**: `HomeFeed` ya llama a `useFeed(categoryId)` y el feed usa `GET /api/yt/feed?videoCategoryId=…` con Bearer.

**Sí hay un desajuste de expectativas UX:**

- En [`kidstube/src/lib/yt/home-chips.ts`](../kidstube/src/lib/yt/home-chips.ts) el chip etiquetado **«Todo»** usa **`categoryId: 24`** (Entertainment), **no** “todas las categorías permitidas”.
- Con **`strictKidsOnly`** activo (Dexie, default `true`), el servidor filtra a **`madeForKids === true`**. En **Trending por categoría** muchos vídeos populares **no** tienen `madeForKids=true` → la lista puede quedar **vacía o muy corta** para algunas categorías.

**Tareas de producto en este prompt:**

- Renombrar chip “Todo” → algo honesto (“Tendencias”, “Variedad”, etc.) **o** implementar un modo “Todo” real (ver OQ-11-001).
- Mostrar mensaje explícito cuando `items.length === 0` distinguiendo: sin cuota / sin sesión / filtro estricto / categoría sin MFK.
- Opcional: paginación en Home con `nextPageToken` (hoy solo primera página).

### 2) Búsqueda: scroll no carga más

**Causa técnica:** [`kidstube/src/app/(main)/results/results-client.tsx`](../kidstube/src/app/(main)/results/results-client.tsx) solo usa `useSearch(q)` **sin** `pageToken` ni acumulación de páginas. `fetchSearchPage` en [`kidstube/src/lib/yt/client.ts`](../kidstube/src/lib/yt/client.ts) ya soporta `pageToken`; falta UI + estado (SWR infinito o botón “Cargar más” / `IntersectionObserver`).

### 3) Iframe: logo YouTube, enlace a YouTube, “más vídeos”

El reproductor está en [`kidstube/src/components/player/youtube-player.tsx`](../kidstube/src/components/player/youtube-player.tsx) con IFrame API y `playerVars` (`modestbranding`, `rel`, etc.).

**Limitación importante:** el reproductor embebido es **controlado por YouTube**. No hay parámetro documentado que **elimine por completo** el branding o todos los enlaces externos en todas las plataformas; hay que:

- Afinar `playerVars` según [YouTube Embedded Players Parameters](https://developers.google.com/youtube/player_parameters) (`modestbranding`, `rel`, `controls`, `fs`, `iv_load_policy`, dominio `youtube-nocookie.com` si aplica, etc.).
- Valorar **capa UI** encima de zonas del chrome (riesgo: bloquear controles legítimos; mantener accesibilidad).
- Documentar **límites legales/ToS** si se intenta ocultar agresivamente el player.

**Objetivo del usuario:** minimizar salidas a `youtube.com` (niños). Incluir en implementación prueba manual en Chrome móvil + desktop.

### 4) Me gusta “real” en YouTube

La API **`videos.rate`** requiere scope de **escritura** (no basta con `youtube.readonly`). Hoy [`kidstube/src/auth.ts`](../kidstube/src/auth.ts) solo pide `youtube.readonly`.

→ Ver **OQ-11-002** (re-consentimiento Google + pantalla de consentimiento).

### 5) Compartir = URL interna

Generar URL absoluta de la app, p. ej. `{origin}/watch/{videoId}` (o con query si en el futuro hay rutas virtuales). **Copiar al portapapeles** + feedback (toast). No copiar `https://youtube.com/watch?...`.

### 6) Descripción: enlaces no clicables

En [`kidstube/src/app/(main)/watch/[id]/watch-page-client.tsx`](../kidstube/src/app/(main)/watch/[id]/watch-page-client.tsx) la descripción es texto plano hoy; si en el futuro se renderiza HTML o autolink:

- Sanitizar / escapar HTML.
- Quitar `href` o envolver con `pointer-events: none` + estilos, o mostrar URLs como texto sin `<a>`.

## Pasos de implementación (resumen)

1. **Home / chips:** Resolver OQ-11-001; mejorar vacíos y mensajes; opcional scroll infinito en feed.
2. **Búsqueda:** `IntersectionObserver` o botón al final; acumular `items` con `nextPageToken` hasta fin; loading y errores.
3. **Player:** Revisar `playerVars`, probar `youtube-nocookie.com` si encaja; capas anti-clic documentadas; quitar/reducir UI nativa donde la API lo permita.
4. **Me gusta:** Ruta `POST /api/yt/videos/[id]/rate` (o similar) que llame `videos.rate` con Bearer; UI en watch; manejo de ya votado / error.
5. **Compartir:** Reemplazar botón decorativo por copiar URL interna.
6. **Descripción:** política única de “sin navegación” para enlaces.

## Open questions (bloquean detalles de implementación hasta resolver)

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-11-001 | Chip “Todo” en Home | A) Renombrar a la categoría real (p. ej. “Tendencias · 24”) B) “Todo” = rotar o mezclar varias categorías permitidas en cliente C) “Todo” = una sola categoría default pero configurable en panel parental | Hoy 24 ≠ “todo el YouTube” |
| OQ-11-002 | Scope OAuth para `videos.rate` (Me gusta) | A) Añadir `https://www.googleapis.com/auth/youtube` (o el scope mínimo documentado para `videos.rate`) y volver a pasar consentimiento B) Me gusta solo “local” (Dexie) sin YouTube hasta que el usuario acepte ampliar scope en otro flujo | Revisar doc actual de `videos.rate` |
| OQ-11-003 | Estrategia anti-salida desde iframe | A) Solo `playerVars` + `nocookie` B) A + overlay puntual en zonas del chrome (definir mockups) C) Aceptar límites y solo documentar | ToS / UX |
| OQ-11-004 | Paginación búsqueda | A) Scroll infinito B) Botón “Cargar más” C) Ambos | Misma lógica reutilizable en Home si se desea |

**Status:** `unresolved`

**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Criterios de aceptación

- Home: el usuario entiende por qué una categoría puede estar vacía; chip “Todo” no engaña (según OQ-11-001).
- Búsqueda: con scroll (o acción explícita) se cargan más resultados mientras exista `nextPageToken`.
- Watch: compartir copia URL **de KidsTube**; descripción sin navegación a URLs externas por clic.
- Watch: Me gusta llama API y refleja error/red de Google de forma legible (tras OQ-11-002).
- Watch: menos superficie obvia para abrir youtube.com desde el embed (según OQ-11-003 y límites reales).
- Tests donde aplique: helper de URL interna; sanitización de descripción; reducer de paginación de búsqueda (sin red).

## Referencias

- YouTube IFrame API: `https://developers.google.com/youtube/iframe_api_reference`
- Player parameters: `https://developers.google.com/youtube/player_parameters`
- `videos.rate`: `https://developers.google.com/youtube/v3/docs/videos/rate`
