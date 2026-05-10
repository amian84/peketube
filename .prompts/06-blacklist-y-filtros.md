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
| OQ-06-004 | Sincronizar entre dispositivos | A) No B) Solo JSON manual C) Servidor por usuario D) Servidor + JSON | Ver resolución |

**Status:** `resolved`

**Assumptions if deferred:** —

> **Do not start implementation until open questions in this file are resolved or explicitly deferred with recorded assumptions.**

## Resolución registrada (usuario)

| ID | Decisión |
|----|----------|
| OQ-06-001 | **C** — Canales + vídeos + **palabras clave en título** (el filtro debe considerar coincidencia de título frente a lista de términos bloqueados). |
| OQ-06-002 | **A** — Cliente: **cada listado invoca el filtro de forma explícita** (no obligatorio un único hook tipo `useFilteredFeed`; puede haber helpers compartidos, pero la integración es explícita por pantalla). |
| OQ-06-003 | **A** (recomendación aceptada por el usuario: “tú decides”) — Si tras filtrar quedan menos de **N** ítems, **seguir pidiendo páginas** hasta alcanzar **N** o **agotar** la fuente. |
| OQ-06-004 | **Servidor + export/import JSON**: sync de blacklist **asociada al usuario autenticado** (identidad de sesión, p. ej. `user.id` de OAuth; no usar el correo como clave primaria). **Persistencia en servidor:** **SQLite3** en **un fichero** (alcance modesto; si crece el uso, **migrar** a otro motor de persistencia). **Además:** export e import JSON desde **panel parental** (backup, portabilidad, recuperación). Comportamiento exacto del import (**sustituir vs fusionar**) — definir en implementación o coordinar con prompt **07**. |

### Notas técnicas OQ-06-004

- Añadir dependencia/driver SQLite acorde al runtime de Next (p. ej. `better-sqlite3` o alternativa válida en el despliegue elegido).
- Ruta del fichero vía variable de entorno (`KIDSTUBE_SERVER_DB_PATH` o `BLACKLIST_DB_PATH`) con default `./data/kidstube.sqlite` en desarrollo; documentar que en serverless puro el fichero puede no ser adecuado (si aplica al hosting del usuario).
- Rutas API autenticadas: lectura/escritura de snapshot de blacklist por usuario; el **cliente sigue aplicando el filtro** sobre listas ya obtenidas (YouTube API), usando el snapshot **sincronizado** (más caché local opcional si se desea offline).

## API (cliente local + servidor)

**Cliente** — `src/lib/db/blacklist.ts` (o equivalente):

- `blockChannel` / `unblockChannel` / `listBlockedChannels`
- `blockVideo` / `unblockVideo` / `listBlockedVideos`
- Términos título: `blockTitleKeyword` / `unblockTitleKeyword` / `listBlockedTitleKeywords` (nombres orientativos; alinear con esquema)
- `useBlacklist()` hook con caché en memoria + invalidación al cambiar; tras mutaciones, **sincronizar con API** cuando haya sesión

**Servidor** — SQLite:

- Esquema mínimo: tabla por usuario (o JSON blob por `userId`) con canales, vídeos y keywords
- Handlers bajo `/api/...` protegidos con sesión

**Panel parental (07)** — además de CRUD:

- Export JSON (descarga)
- Import JSON (merge o replace — pendiente de cierre fino)

## Pipeline

`src/lib/yt/filter.ts` (tipos alineados con `VideoDTO` / listas reales del proyecto):

```ts
export type BlacklistSnapshot = {
  channels: Set<string>;
  videos: Set<string>;
  /** Frases o términos; matching definido en implementación (p. ej. includes case-insensitive). */
  titleKeywords: Set<string>;
};

export function applyBlacklist(
  items: VideoDTO[],
  bl: BlacklistSnapshot,
): VideoDTO[] {
  return items.filter((v) => {
    if (bl.videos.has(v.id)) return false;
    if (bl.channels.has(v.channelId)) return false;
    const t = v.title.toLowerCase();
    for (const kw of bl.titleKeywords) {
      if (kw && t.includes(kw.toLowerCase())) return false;
    }
    return true;
  });
}
```

**Paginación tras filtro (OQ-06-003-A):** helper o hook reutilizable que, si `filteredCount < desired`, pida la siguiente página a la fuente (feed / búsqueda / related / subs) y vuelva a aplicar `applyBlacklist` hasta llenar o agotar.

## Integración

Todas las pantallas que listan vídeos (Home, Search, Subscriptions, Related) **aplican explícitamente** el filtro con el snapshot actual (OQ-06-002-A) y la lógica de re-paginación cuando aplique (OQ-06-003-A).

## Criterios de aceptación

- Bloquear un canal lo elimina de Home, Search y Related en la siguiente carga (tras sync/refetch del snapshot).
- Bloquear un vídeo concreto lo oculta en cualquier lista.
- Bloquear por palabra clave en título oculta vídeos cuyo título coincida según la regla acordada.
- Con sesión, cambios de blacklist **persisten en SQLite** y se reflejan al iniciar sesión en otro dispositivo.
- Export/import JSON disponibles desde panel parental (detalle en 07).
- Test unitario de `applyBlacklist` (canales, vídeos, keywords).
