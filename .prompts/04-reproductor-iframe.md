**Prompt type:** `implementation`

# 04 — Reproductor con YouTube IFrame Player API

## Objetivo

Página `/watch/[id]` con reproductor embebido (IFrame Player API), título, canal, descripción, lista de "siguientes" filtrados, y botón nativo para bloquear vídeo/canal (la lógica completa de bloqueo está en prompt 08).

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-04-001 | Autoplay del siguiente | A) Sí, automático tras `onEnded` B) Sí pero con confirmación visual C) No | A más parecido a YouTube; aceptamos riesgo de mantener al niño viendo |
| OQ-04-002 | Fuente de "siguientes" (relatedToVideoId está deprecated) | A) `search.list q=<title del actual> type=video` B) Vídeos del mismo canal vía `playlistItems.list uploads` C) Mezcla | C combina relevancia y diversidad |
| OQ-04-003 | Mostrar comentarios | A) No (no aporta y puede tener contenido inapropiado) B) Sí, vía `commentThreads.list` filtrado | A |
| OQ-04-004 | Pantalla completa | A) Botón nativo del player B) Forzar landscape al entrar fullscreen C) Solo portrait | A nativo |
| OQ-04-005 | Si el vídeo destino tiene `madeForKids=false` y está activo el modo solo-kids | A) Bloquear con mensaje "No disponible" B) Permitir con warning | A consistente con la promesa |

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Componente Player

`src/components/player/YouTubePlayer.tsx`:

- Carga script `https://www.youtube.com/iframe_api` solo una vez (singleton).
- Props: `videoId`, `onStateChange`, `onEnded`, `onProgress(seconds)`.
- Params iframe: `playsinline=1`, `modestbranding=1`, `rel=0`, `enablejsapi=1`, `origin={location.origin}`.
- Polling cada 10s para `getCurrentTime()` → `onProgress` (registro de historial, prompt 05).

## Página `/watch/[id]`

- Server component que llama `/api/yt/video/[id]` y `/api/yt/channel/[channelId]`.
- Render: `<YouTubePlayer />`, título, métricas, expander de descripción, fila de acciones (Like decorativo, Share decorativo, **Bloquear** real → modal placeholder hasta prompt 08), `<RelatedList>`.
- Si `madeForKids === false` y modo only-kids ON → render `<NotAvailable />`.

## Lista de siguientes

`src/components/player/RelatedList.tsx`: usa `useRelated(videoId)` que mezcla resultados de búsqueda por título + uploads del canal. Aplica filtros (prompt 06) antes de renderizar. Click → `router.push(`/watch/${id}`)`.

## Criterios de aceptación

- Reproduce vídeos `madeForKids=true` correctamente.
- Autoplay del siguiente filtrado funciona.
- Botón Bloquear visible (sin lógica todavía).
- Sin errores en consola del navegador.
