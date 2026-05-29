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

**Status:** `resolved` (formulario interactivo + matiz usuario)

**Resolución registrada:**

- **OQ-05-001 — A + configurable en panel parental:** por defecto registrar al **primer `PLAYING`** (inicio de reproducción). Ajuste persistido en Dexie: `historyRecordMode`: `on_play` | `after_10s` | `on_end` (panel parental prompt 07).
- **OQ-05-002 — Días configurables, default 30:** retención por **antigüedad** (`historyRetentionDays`, default **30**, rango razonable p. ej. 1–365). Panel parental (07) editará el valor; al registrar/listar se **poda** lo más antiguo.
- **OQ-05-003 — A:** borrar historial **solo** desde panel parental (confirmación + PIN en prompt 07). **No** botón de borrado en `/you`.
- **OQ-05-004 — A:** barra de progreso en tarjetas del historial cuando hay `progressSec` / `durationSec`.

## Schema Dexie

`watchHistory` en versión 2 de IndexedDB (`peketube/src/lib/db/schema.ts`). Tablas de blacklist en prompt 06.

`WatchHistoryRow`: `{ videoId, title, channelId, channelTitle, thumbnailUrl, durationSec, watchedAt, progressSec }`.

## API

`src/lib/db/history.ts`:

- `recordWatch(video, progressSec)` — upsert y pone `watchedAt = Date.now()`.
- `updateProgress(videoId, sec)`.
- `listHistory({ offset, limit })` — orden `watchedAt desc`; aplica poda por retención.
- `clearHistory()`.

## Integración

- `/watch`: según `historyRecordMode`, disparar `recordWatch` / `updateProgress` (player + progreso cada 10s).
- `/you`: sección **Historial** con `VideoCard` y barra de progreso.

## Criterios de aceptación

- Tras ver un vídeo aparece en `/you` → Historial (según modo y umbral).
- Persiste tras reload y tras cerrar la PWA.
- `clearHistory()` disponible para el panel parental (prompt 07); no desde `/you`.
