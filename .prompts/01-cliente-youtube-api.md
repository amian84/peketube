**Prompt type:** `implementation`

# 01 — Cliente YouTube Data API v3 (proxy + cache)

## Objetivo

Cliente para YouTube Data API v3 con **API key server-side** (Route Handlers), aplicando filtros infantiles obligatorios. Cache en cliente con SWR + TTL en IndexedDB para reducir cuota.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-01-001 | Categorías infantiles permitidas por defecto | A) Solo 15 (Pets), 1 (Film & Animation), 24 (Entertainment), 10 (Music) B) Todas + filtro `madeForKids` C) Configurable en panel parental con default A | C ofrece flexibilidad sin sacrificar seguridad |
| OQ-01-002 | Modo "solo madeForKids=true" | A) Forzado siempre B) Activable en panel parental, default ON C) Default OFF | B equilibra contenido y seguridad |
| OQ-01-003 | Fuente del feed Home (sin login) | A) `videos.list chart=mostPopular videoCategoryId=15&regionCode=ES` B) `search.list q="" type=video safeSearch=strict` (no permitido q vacío → usar trending) C) Lista de queries semilla rotativa ("dibujos infantiles", "canciones infantiles", ...) | A consume menos cuota |
| OQ-01-004 | TTL cache feeds vs videos | A) feeds 30 min, video 24 h B) feeds 1 h, video 7 días C) configurable | A razonable y conservador |
| OQ-01-005 | Manejo de cuota agotada | A) Mostrar mensaje + reintentar en 1 h B) Caer a último cache aunque expirado C) Ambos: cache stale + banner | C mejor UX |
| OQ-01-006 | regionCode + relevanceLanguage | A) `ES` + `es` fijos B) Detectar del navegador C) Configurable | A simple para uso personal |

**Status:** `resolved` (respuestas explícitas del usuario en chat)

**Resolución registrada:**

- **OQ-01-001:** **C** — categorías configurables vía Dexie (`allowedCategoryIds`); servidor solo acepta IDs en `PARENT_CATEGORY_OPTIONS`; default `[15,1,24,10]`.
- **OQ-01-002:** **B** — `strictKidsOnly` en settings, **default `true`**; se envía como `strictKids=1` a la API.
- **OQ-01-003:** **A** — feed `/api/yt/feed` con `videos.list` `chart=mostPopular` + `videoCategoryId` obligatorio.
- **OQ-01-004:** **C** — `feedTtlMs` y `videoTtlMs` en Dexie (defaults 30 min / 24 h hasta panel parental).
- **OQ-01-005:** **C** — `fetchJsonWithCache` devuelve datos stale + `stale` / `quotaExceeded` para banner en UI (prompt 03+).
- **OQ-01-006:** **C con default ES + es** — `regionCode` / `relevanceLanguage` en settings y query a la API; por defecto `ES` y `es`.

**Implementación:** aplicada en `kidstube/` según la resolución anterior.

## Endpoints proxy (Route Handlers)

`src/app/api/yt/`:

- `search/route.ts` → GET `?q=&pageToken=` → llama `search.list` con `safeSearch=strict`, `videoEmbeddable=true`, `type=video`, `videoCategoryId` permitidos, `regionCode=ES`, `relevanceLanguage=es`.
- `feed/route.ts` → GET `?categoryId=&pageToken=` → `videos.list chart=mostPopular`.
- `video/[id]/route.ts` → GET → `videos.list part=snippet,contentDetails,statistics,status,topicDetails`. Rechaza si `status.madeForKids === false` y modo "solo kids" activo.
- `channel/[id]/route.ts` → GET → `channels.list`.
- `playlist/[id]/items/route.ts` → GET → `playlistItems.list`.
- `subscriptions/route.ts` → GET (requiere sesión NextAuth) → `subscriptions.list mine=true` con token del usuario.

Todas devuelven JSON normalizado (DTO interno) en lugar del raw de Google.

## Cliente

`src/lib/yt/`:

- `types.ts` — `Video`, `Channel`, `Playlist`, `Page<T>`.
- `mappers.ts` — Google snippet → DTO.
- `client.ts` — `fetchSearch`, `fetchFeed`, `fetchVideo`, `fetchChannel`, `fetchSubscriptions` (apuntan a `/api/yt/...`).
- `swr.ts` — hooks `useSearch`, `useFeed`, `useVideo`, `useSubscriptions` con SWR + key estable.

## Cache IndexedDB (TTL)

`src/lib/db/cache.ts` con Dexie tabla `apiCache(key, payload, expiresAt)`. Wrapper `cached(key, ttlMs, fn)`.

## Criterios de aceptación

- Llamadas cliente nunca exponen la API key.
- Toda respuesta de YouTube pasa por filtros infantiles obligatorios.
- `useFeed()` muestra vídeos en Home tras prompt 03.
- Tests unitarios para mappers y `cached()`.
