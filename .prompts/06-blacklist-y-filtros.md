**Prompt type:** `implementation`

# 06 — Blacklist (canales y vídeos) + pipeline de filtrado

## Objetivo

Bloqueos definitivos del padre. Cualquier lista de vídeos que se renderice en la app pasa por el filtro y excluye lo bloqueado.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-06-001 | Granularidad | A) Solo canales B) Canales + vídeos individuales C) Canales + vídeos + palabras clave en título | B inicialmente; C como mejora futura |
| OQ-06-002 | Aplicar filtro en cliente o en route handlers | A) Cliente (más fácil, requiere que cada listado lo invoque) B) Servidor leyendo desde IndexedDB (no posible, IndexedDB es client) C) Cliente vía wrapper genérico | C — wrapper único `useFilteredVideos` |
| OQ-06-003 | Si tras filtrar quedan menos de N items | A) Pedir más páginas hasta N o agotar B) Mostrar lo que haya | A mejor UX |
| OQ-06-004 | Sincronizar entre dispositivos | A) No (uso personal, un dispositivo) B) Export/import JSON manual desde panel parental | B útil para backup; ya previsto en prompt 07 |

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## API

`src/lib/db/blacklist.ts`:
- `blockChannel(channelId)`, `unblockChannel(channelId)`, `listBlockedChannels()`.
- `blockVideo(videoId)`, `unblockVideo(videoId)`, `listBlockedVideos()`.
- `useBlacklist()` hook con cache en memoria + invalidación al cambiar.

## Pipeline

`src/lib/yt/filter.ts`:
```ts
export function applyBlacklist(items: Video[], bl: BlacklistSnapshot): Video[] {
  return items.filter(v => !bl.videos.has(v.id) && !bl.channels.has(v.channelId));
}
```

`src/hooks/useFilteredFeed.ts`:
- Wraps `useFeed` / `useSearch` / `useRelated`.
- Si `filteredCount < desired`, fetch siguiente página y reaplica filtro hasta llenar `desired` o agotar páginas.

## Integración

Todas las pantallas que listan vídeos (Home, Search, Subscriptions, Related) usan el hook filtrado.

## Criterios de aceptación

- Bloquear un canal lo elimina de Home, Search y Related en la siguiente carga.
- Bloquear un vídeo concreto lo oculta en cualquier lista.
- Test unitario de `applyBlacklist`.
