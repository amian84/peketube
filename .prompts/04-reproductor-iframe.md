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

**Status:** `resolved` (formulario interactivo + matiz usuario)

**Resolución registrada:**

- **OQ-04-001 — A + configurable:** autoplay del siguiente **activado por defecto**; conmutable desde **panel parental** (Dexie `autoPlayNext`, default `true`). Hasta el prompt 07 se puede cambiar solo vía Dexie/consola o extensión futura del panel.
- **OQ-04-002 — C:** “Siguientes” = **mezcla** búsqueda por título del vídeo actual + **uploads** del canal (implementado vía `GET /api/yt/related`).
- **OQ-04-003 — Por defecto no + configurable:** **`showVideoComments` default `false`** en Dexie; si `true`, se muestran comentarios vía API dedicada. Panel parental (prompt 07) expondrá el interruptor.
- **OQ-04-004 — A:** fullscreen **nativo** del iframe (YouTube).
- **OQ-04-005 — Listado + reproducción:** contenido no infantil **no debe aparecer en listados** donde aplique filtro; si se accede por URL a un vídeo `madeForKids=false` con modo solo infantil **ON** → **bloquear reproducción** (`NotAvailable`), alineado con **A**.

## Componente Player

`src/components/player/YouTubePlayer.tsx`:

- Carga script `https://www.youtube.com/iframe_api` solo una vez (singleton).
- Props: `videoId`, `onStateChange`, `onEnded`, `onProgress(seconds)`.
- Params iframe: `playsinline=1`, `modestbranding=1`, `rel=0`, `enablejsapi=1`, `origin={location.origin}`.
- Polling cada 10s para `getCurrentTime()` → `onProgress` (registro de historial, prompt 05).

## Página `/watch/[id]`

- Cliente: datos con `useVideo` + `useRelated` + ajustes Dexie.
- Render: `<YouTubePlayer />`, título, métricas, expander de descripción, fila de acciones (Like decorativo, Share decorativo, **Bloquear** → placeholder hasta prompt 08), `<RelatedList>`.
- Si `madeForKids === false` y modo only-kids ON → `<NotAvailable />`.

## Lista de siguientes

`src/components/player/RelatedList.tsx`: datos de `useRelated` (API `related`). Click → `router.push(/watch/[id])`.

## Criterios de aceptación

- Reproduce vídeos `madeForKids=true` correctamente (modo solo infantil ON).
- Autoplay del siguiente según `autoPlayNext` (default ON).
- Botón Bloquear visible (sin lógica todavía).
- Sin errores en consola del navegador (salvo avisos conocidos de terceros).
