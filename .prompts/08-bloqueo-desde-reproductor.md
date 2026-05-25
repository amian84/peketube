**Prompt type:** `implementation`

# 08 — Bloqueo desde el reproductor (con PIN)

## Objetivo

Botón en `/watch/[id]` que permite bloquear el vídeo o el canal actual previo PIN, lo añade a la blacklist y vuelve atrás.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-08-001 | Tras bloquear ¿qué hacer? | A) `router.back()` B) Reproducir el siguiente filtrado C) Volver a Home | B continuidad para el niño |
| OQ-08-002 | Reusar sesión parental ya desbloqueada (5 min) | A) Sí (no pedir PIN otra vez en ventana) B) Siempre pedir PIN para bloquear (más seguro) | B coherente con OQ-07-003 |
| OQ-08-003 | Confirmación visual | A) Toast "Bloqueado" B) Modal con detalle | A no rompe flujo |

**Status:** `resolved`

**Resolución registrada (implementación 08 — alineada con la columna Notes / recomendaciones del propio prompt)**

| ID | Decisión aplicada en código |
|----|------------------------------|
| OQ-08-001 | **B** — Tras bloquear, navegar al **primer vídeo de “relacionados”** que siga pasando el filtro de blacklist tras `readBlacklistSnapshot()`; si no hay ninguno, **`/`**. Ver `navigateAfterWatchBlock`. |
| OQ-08-002 | **B** — **Siempre** se muestra `PinDialog` antes de bloquear (vídeo, canal o palabra); no se reutiliza la ventana de sesión parental de 5 min para saltar el PIN. |
| OQ-08-003 | **A** — Mensaje efímero “Bloqueado.” (banner fijo ~2,4 s), sin librería de toasts. |

## Componentes

- Botón **Bloquear** en la fila de acciones de `/watch` (`watch-page-client.tsx`; mismo rol que un `BlockButton` dedicado).
- `BlockSheet` — `src/components/player/block-sheet.tsx` (bottom sheet en móvil, panel centrado en `sm+`; vídeo, canal y palabra en título).
- `PinDialog` — `src/components/parental/pin-dialog.tsx` (reutilizable; `verifyPin` + cooldown vía `attempts.ts`).
- Navegación post-bloqueo — `src/lib/parental/navigate-after-watch-block.ts` (tests en `navigate-after-watch-block.test.ts`).

## Flujo

1. Tap en "Bloquear" → `<BlockSheet>`.
2. Elegir opción → `<PinDialog>`.
3. PIN OK → `blockVideo()` / `blockChannel()` / `blockTitleKeyword()` → mensaje “Bloqueado.” → navegación (OQ-08-001 B).

## Criterios de aceptación

- PIN incorrecto no bloquea y muestra error.
- Tras bloquear, el vídeo/canal desaparece de las próximas listas (verificable en Home y Related).
- Funciona en mobile (sheet adaptado).
