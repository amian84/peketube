**Prompt type:** `implementation`

# 07 — Panel parental (PIN + pantallas de gestión)

## Objetivo

Acceso oculto vía long-press 5s en el logo. PIN PBKDF2 (Web Crypto). Pantallas: dashboard, bloqueados, vistos recientes (con bloqueo rápido), settings.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-07-001 | Longitud y tipo de PIN | A) 4 dígitos B) 6 dígitos C) Alfanumérico libre | B equilibrio fuerza/usabilidad |
| OQ-07-002 | PIN inicial | A) "0000" forzando cambio en primer acceso B) Wizard de bienvenida pidiendo PIN C) Hardcoded en `.env.local` para dev | B mejor UX |
| OQ-07-003 | Tiempo de sesión parental tras introducir PIN | A) Hasta cerrar app/pestaña B) 5 min de inactividad C) Pedir PIN en cada acción crítica (bloquear) | B + reautenticación para bloquear desde reproductor (prompt 08) |
| OQ-07-004 | Recuperación de PIN olvidado | A) Reset borrando IndexedDB (drástico) B) Frase de recuperación generada al crear PIN C) Email del usuario logado en Google → fuera de scope sin backend | A documentado |
| OQ-07-005 | Ocultar entrada al panel también con un código numérico en URL | A) Solo long-press B) Long-press + URL `#parental` directa | A más oculto |
| OQ-07-006 | Bloqueo de intentos | A) 5 intentos → cooldown 1 min, escalado B) Sin bloqueo C) Cooldown fijo 30s tras 3 fallos | A más seguro |

**Status:** `unresolved`
**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Cripto del PIN

`src/lib/parental/pin.ts`:
- `setPin(pin)`: genera salt 16B, deriva 32B con PBKDF2-SHA256 250k iter, guarda `{salt, hash, iter}` en `settings.parentalPin`.
- `verifyPin(pin)`: deriva con mismo salt e iter, comparación constante (`crypto.subtle.timingSafeEqual` shim si necesario).
- `hasPin()`: bool.

## Sesión parental

`src/lib/parental/session.ts`:
- `unlock()` → guarda `parentalUnlockUntil = Date.now() + 5*60*1000` en `sessionStorage`.
- `isUnlocked()` → comprueba ttl.
- `lock()`.

## Rutas

- `/parental/setup` — wizard si `!hasPin()`.
- `/parental/login` — input PIN, redirige a `/parental` si OK.
- `/parental` — dashboard: contadores (canales bloqueados, vídeos bloqueados, items en historial), accesos rápidos.
- `/parental/blocked` — listas con buscador y botón "Desbloquear".
- `/parental/recent` — últimos 50 del historial con botón "Bloquear canal" / "Bloquear vídeo".
- `/parental/settings`:
  - Categorías permitidas (multi-select, OQ-01-001).
  - Modo solo `madeForKids` (switch, OQ-01-002).
  - Cambiar PIN.
  - Cerrar sesión Google (signOut).
  - Borrar historial.
  - Export config a JSON / Import desde JSON (incluye blacklist + settings, NO el PIN).
  - "Reset de la app" (borra IndexedDB) con doble confirmación.

## Guard

Layout `/parental/(protected)/layout.tsx` redirige a `/parental/login` si no `isUnlocked()`. `/parental/login` y `/parental/setup` quedan fuera del guard.

## Criterios de aceptación

- Long-press 5s en logo navega a setup (primer uso) o login.
- PIN incorrecto bloquea según política OQ-07-006.
- Cambios de settings se reflejan en tiempo real (vía evento o re-render).
- Tests del módulo `pin.ts` (set, verify ok, verify ko).
