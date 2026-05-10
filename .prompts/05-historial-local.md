**Prompt type:** `implementation`

# 05 — Historial local (IndexedDB con Dexie)

## Objetivo

Registrar localmente los vídeos vistos y mostrar la pantalla "Historial" dentro de `/you`.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-05-001 | Cuándo registrar el vídeo | A) Al iniciar reproducción (primer `playing`) B) Tras 10s de visualización C) Al terminar | B evita registros accidentales |
| OQ-05-002 | Política de retención | A) Sin límite B) Últimos 1000 C) Últimos 90 días | B simple y acotado |
| OQ-05-003 | Permitir borrar historial desde panel parental | A) Sí, con confirmación + PIN B) También desde `/you` | A más control parental |
| OQ-05-004 | Mostrar progreso restante en `<VideoCard>` del historial | A) Sí (barra inferior como YouTube) B) No | A más fiel |

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Schema Dexie

`src/lib/db/db.ts`:

```ts
class KidsDB extends Dexie {
  watchHistory!: Table<WatchHistoryRow, string>; // pk videoId
  blockedChannels!: Table<{ channelId: string; addedAt: number }, string>;
  blockedVideos!: Table<{ videoId: string; addedAt: number }, string>;
  apiCache!: Table<{ key: string; payload: unknown; expiresAt: number }, string>;
  settings!: Table<{ key: string; value: unknown }, string>;
  constructor() {
    super("kidstube");
    this.version(1).stores({
      watchHistory: "videoId, watchedAt, channelId",
      blockedChannels: "channelId, addedAt",
      blockedVideos: "videoId, addedAt",
      apiCache: "key, expiresAt",
      settings: "key",
    });
  }
}
```

`WatchHistoryRow`: `{ videoId, title, channelId, channelTitle, thumbnailUrl, durationSec, watchedAt, progressSec }`.

## API

`src/lib/db/history.ts`:
- `recordWatch(video, progressSec)` — upsert y pone `watchedAt = Date.now()`.
- `updateProgress(videoId, sec)`.
- `listHistory({ offset, limit })` — orden `watchedAt desc`.
- `clearHistory()`.

## Integración

- `<YouTubePlayer onProgress={...}>`: a los 10s llamar `recordWatch()`, luego cada 10s `updateProgress()`.
- `/you` añade sección "Historial" usando `<VideoCard>` con barra de progreso si `progressSec / durationSec > 0`.

## Criterios de aceptación

- Tras ver un vídeo aparece en `/you` → Historial.
- Persiste tras reload y tras cerrar la PWA.
- `clearHistory()` desde panel parental funciona.
