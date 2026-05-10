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

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Componentes

- `<BlockButton videoId channelId channelTitle videoTitle>` en la fila de acciones del watch.
- `<BlockSheet>`: bottom sheet con dos opciones: "Bloquear vídeo", "Bloquear canal". Tras elegir → `<PinDialog>`.
- `<PinDialog>` reutilizable (importable también desde otros sitios).

## Flujo

1. Tap en "Bloquear" → `<BlockSheet>`.
2. Elegir opción → `<PinDialog>`.
3. PIN OK → `blockVideo()` o `blockChannel()` → toast → según OQ-08-001.

## Criterios de aceptación

- PIN incorrecto no bloquea y muestra error.
- Tras bloquear, el vídeo/canal desaparece de las próximas listas (verificable en Home y Related).
- Funciona en mobile (sheet adaptado).
