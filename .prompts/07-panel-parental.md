**Prompt type:** `implementation`

# 07 — Panel parental (PIN + pantallas de gestión)

## Objetivo

Acceso oculto vía long-press 5s en el logo. PIN PBKDF2 (Web Crypto). Pantallas: dashboard, bloqueados, vistos recientes (con bloqueo rápido), settings.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-07-001 | Longitud y tipo de PIN | A) 4 dígitos B) 6 dígitos C) Alfanumérico libre | B equilibrio fuerza/usabilidad |
| OQ-07-002 | PIN inicial | A) "0000" forzando cambio B) Wizard C) Hardcoded `.env` dev | B mejor UX |
| OQ-07-003 | Tiempo de sesión parental tras PIN | A) Hasta cerrar B) 5 min inactividad C) PIN cada acción crítica | B + re-PIN en 08 |
| OQ-07-004 | Recuperación PIN olvidado | A) Reset IndexedDB B) Frase recuperación C) Email Google | Ver resolución |
| OQ-07-005 | URL numérica / directa al panel | A) Solo long-press B) Long-press + URL | Ver resolución |
| OQ-07-006 | Bloqueo de intentos | A) 5 intentos / 1 min escalado B) Sin C) 3 fallos / 30s | Ver resolución |

**Status:** `resolved`

**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Resolución registrada (usuario — formulario interactivo)

| ID | Decisión |
|----|----------|
| OQ-07-001 | **A** — PIN de **4 dígitos numéricos** únicamente. |
| OQ-07-002 | **B** — **Wizard de bienvenida** que pide definir el PIN en el primer uso (sin PIN por defecto tipo 0000). |
| OQ-07-003 | **B configurable** — Sesión parental con **TTL por inactividad** (valor por defecto alineado con el borrador: **5 minutos**), **persistido en ajustes** (p. ej. `parentalSessionTtlMs` o minutos enteros) editable en `/parental/settings`. Mantener coherencia con **prompt 08** (reautenticación para bloquear desde reproductor si aplica). |
| OQ-07-004 | **B** como camino principal: **frase de recuperación** generada al crear el PIN (mostrar una vez, confirmación de guardado). **Opcionalmente** dejar preparado o documentado un camino **C** (recuperación vía email del usuario Google) **solo si** más adelante hay backend/flujo explícito; hasta entonces **no obligatorio** en UI. |
| OQ-07-005 | **B** — **Long-press 5 s en el logo** **y** acceso por **URL directa** (p. ej. `/parental/login` o ruta acordada en implementación; hash `#parental` si encaja con scroll en `/you` no sustituye el flujo de login PIN). |
| OQ-07-006 | Política elegida por el usuario: **3 intentos fallidos** → **cooldown de 5 minutos** (sin escalado adicional salvo que implementación decida loguear intentos en Dexie/localStorage de forma determinista). |

## Cripto del PIN

**Persistencia (cross-device):** mismo SQLite servidor que la blacklist (`user_parental_pin` por `user_id` = `sub` del JWT; ruta `KIDSTUBE_SERVER_DB_PATH` o `BLACKLIST_DB_PATH`; ver prompt **12**). Solo salt + hash + iter; nunca PIN ni frase en claro.

**Servidor:** `src/lib/parental/pin-node.ts` — PBKDF2-SHA256, 250k iter, 32 B salida (alineado con `src/lib/parental/constants.ts`), comparación constante (`timingSafeEqual`).

**Cliente:** `src/lib/parental/pin.ts` — `hasPin`, `verifyPin`, `verifyRecoveryPhrase`, `createParentalPinWithRecovery`, `changeParentalPin`, `resetParentalPinWithRecoveryPhrase`, `clearPinAndRecovery` vía `fetch` a `/api/parental-pin` (credenciales same-origin). Tras operaciones exitosas se borran claves legacy en Dexie (`parentalPin` / `parentalRecovery`) si existían.

**Sesión Google:** flujos `/parental/setup`, `/parental/login`, `/parental/recover`, `/parental/reset-pin` requieren usuario autenticado para leer/escribir el PIN en servidor; sin sesión, enlace a `/sign-in?callbackUrl=…`.

**Frase en cliente (solo transitoria):** `recovery-gate.ts` guarda la frase normalizada en `sessionStorage` unos minutos tras verificación, para el PUT de nuevo PIN tras recuperación (no sustituye el hash en servidor).

Validación de entrada acorde a **OQ-07-001** (exactamente 4 dígitos); frase normalizada (`pin-format.ts`).

## Sesión parental

`src/lib/parental/session.ts`:

- `unlock()` → guarda tiempo de desbloqueo hasta `Date.now() + ttlMs` (TTL desde settings, default 5 min) en `sessionStorage` (o mecanismo equivalente).
- `isUnlocked()` → comprueba TTL y **opcionalmente** reinicia temporizador de inactividad en eventos de navegación dentro de `/parental/*` si se define así en implementación.
- `lock()`.

## Rutas

- `/parental/setup` — wizard si `!hasPin()` (OQ-07-002 B).
- `/parental/login` — input PIN; política OQ-07-006; redirige a `/parental` si OK.
- `/parental` — dashboard: contadores (canales bloqueados, vídeos bloqueados, items en historial), accesos rápidos.
- `/parental/blocked` — listas con buscador y botón "Desbloquear".
- `/parental/recent` — últimos 50 del historial con botón "Bloquear canal" / "Bloquear vídeo".
- `/parental/settings`:
  - Categorías permitidas (multi-select, OQ-01-001).
  - Modo solo `madeForKids` (switch, OQ-01-002).
  - TTL sesión parental (OQ-07-003).
  - Cambiar PIN (y flujo frase recuperación OQ-07-004 B).
  - Cerrar sesión Google (`signOut`).
  - Borrar historial (confirmación; alineado con **05**).
  - Ajustes historial **05**: `historyRecordMode`, `historyRetentionDays`.
  - Export config JSON / Import (blacklist + settings, **sin** PIN ni hash); ver **06**.
  - "Reset de la app" (borra IndexedDB) con doble confirmación (alineado con OQ-07-004 A como último recurso, documentado).

## Guard

Layout `/parental/(protected)/layout.tsx` redirige a `/parental/login` si no `isUnlocked()`. `/parental/login` y `/parental/setup` quedan fuera del guard.

## Criterios de aceptación

- Long-press 5s en logo navega a **setup** (primer uso) o **login** (OQ-07-005 B: también accesible por URL).
- PIN incorrecto: **3 intentos** → **cooldown 5 min** (OQ-07-006).
- Cambios de settings se reflejan en tiempo real (evento o re-render).
- Tests: formato PIN y `generateRecoveryPhrase` en `pin.test.ts`; PBKDF2 servidor en `pin-node.test.ts` (importa `pin-pbkdf2-node`, sin `server-only`).
