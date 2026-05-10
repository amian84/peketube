**Prompt type:** `implementation`

# 12 — SQLite unificado: blacklist + historial de visionado

## Objetivo

Centralizar en **el mismo fichero SQLite** que ya usa la blacklist (prompt **06**) también el **historial de visionado** que hoy vive solo en **IndexedDB/Dexie** (prompt **05**). Un solo almacén servidor por usuario (`user_id` = `sub` del JWT), misma variable `BLACKLIST_DB_PATH` (o renombrar a algo neutro tipo `KIDSTUBE_SERVER_DB_PATH` si se prefiere).

## Contexto / dependencias

- **05** — modelo de historial (`WatchHistoryRow`, modos `historyRecordMode`, retención `historyRetentionDays`, UI `/you`, progreso en `VideoCard`).
- **06** — SQLite actual (`user_blacklist` JSON o columnas), APIs `/api/blacklist`, sync cliente ↔ servidor.
- **07** — panel parental: borrado de historial, ajustes de retención/modo; este prompt debe **compatibilizar** rutas y permisos (PIN) sin duplicar lógica de producto.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-12-001 | Fuente de verdad tras la migración | A) Solo servidor (Dexie `watchHistory` eliminado o solo caché efímera) B) Escritura dual Dexie + servidor con reconciliación C) Servidor + Dexie como caché offline de solo lectura | A más simple; C mejor si PWA offline importa |
| OQ-12-002 | Migración de datos existentes en Dexie | A) Una vez al primer `pull` tras login: volcar Dexie → servidor y vaciar/reemplazar local B) Export/import manual C) Sin migración automática | A mejor UX para usuarios actuales |
| OQ-12-003 | Límite de filas de historial por usuario en SQLite | A) Mismo criterio que 05 (días + podar al listar) B) Cap duro adicional (p. ej. 2000 filas) C) Solo por días | A alinea con 05; B evita crecimiento descontrolado |
| OQ-12-004 | API de historial | A) Rutas dedicadas `/api/watch-history` (GET lista, PATCH progreso, POST upsert, DELETE clear) B) Todo bajo `/api/kidstube-db` con acciones | A más claro para mantenimiento |
| OQ-12-005 | Renombrar env y fichero | A) Mantener `BLACKLIST_DB_PATH` y nombre fichero actual B) Renombrar a `KIDSTUBE_SERVER_DB_PATH` + migración de doc/env | B más honesto semánticamente; implica actualizar 06 y `.env.example` |

**Status:** `unresolved`

**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Esquema SQLite (orientativo)

- Reutilizar DB existente; añadir tabla(s), p. ej. `watch_history`:
  - `user_id TEXT NOT NULL`
  - `video_id TEXT NOT NULL`
  - `title`, `channel_id`, `channel_title`, `thumbnail_url`, `duration_sec`, `watched_at`, `progress_sec`
  - `PRIMARY KEY (user_id, video_id)` o clave surrogate según OQs
- Índices: `(user_id, watched_at DESC)` para listados.

## API (servidor)

- Autenticación igual que blacklist (`getSessionUserId`).
- Endpoints alineados con OQ-12-004 (ejemplo si A):
  - `GET` — página o lista completa acotada (límite + offset o cursor).
  - Upsert de fila (equivalente a `recordWatch`).
  - Actualización de progreso (equivalente a `updateProgress`).
  - `DELETE` o acción autenticada para `clearHistory` (panel parental 07).

## Cliente

- `src/lib/db/history.ts` (o módulo nuevo): dejar de escribir solo Dexie **o** implementar capa que delegue en fetch según OQ-12-001.
- `/watch` y `/you`: mismos contratos de UI que 05; cambia solo persistencia y sync.
- `BlacklistProvider` o provider unificado (`KidstubeServerDataProvider`) si conviene un solo `pull` de snapshot blacklist + historial (opcional; no obligatorio si se mantiene explícito por pantalla).

## Criterios de aceptación

- Un solo fichero SQLite contiene blacklist **e** historial por `user_id`.
- Tras login en dispositivo B, el historial coincide con el servidor (salvo reglas de OQ-12-001 si se permite caché).
- Retención por días (y límites de OQ-12-003) aplicados en servidor al listar/escribir.
- Tests: migración o helpers de merge (si aplica); tests de API con DB en memoria o fichero temporal **herméticos** (ver skill bundleport-developer).
- Documentar en `README` / `.env.example` el nombre final de la variable de ruta (OQ-12-005).

## No incluido en este prompt

- Rediseño completo del panel parental (sigue en **07**); aquí solo enlazar borrado/ajustes al nuevo backend si ya existían contra Dexie.
