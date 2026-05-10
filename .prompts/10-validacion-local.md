**Prompt type:** `documentation`

# 10 — Validación en local (PC + móvil)

## Objetivo

Probar la PWA en `localhost` y, vía túnel HTTPS, instalarla en el móvil. Smoke tests funcionales.

## Prerequisites

- Entorno de `setup-entorno-pc.md` completado.
- `.env.local` con `YOUTUBE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
- Prompts `00`–`09` ejecutados.
- **No implementation OQ gate.**

## Pasos

### 1. Build y arranque local

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm start          # producción, con Service Worker activo
# o
pnpm dev            # desarrollo, sin SW
```

Abrir `http://localhost:3000` en Chrome del PC.

### 2. Lighthouse (PWA)

DevTools → Lighthouse → categoría **Progressive Web App** → Analyze.

- Esperado: "Installable" ✓, manifest sin errores, Service Worker activo, viewport correcto.

### 3. Probar en el móvil (HTTPS via túnel)

Terminal A:

```bash
pnpm start
```

Terminal B:

```bash
cloudflared tunnel --url http://localhost:3000
# copiar la URL https://xxxxx.trycloudflare.com
```

Importante:
- Añadir esa URL a **Authorized JavaScript origins** y **Authorized redirect URIs** en Google Cloud (`/api/auth/callback/google`).
- Añadir el dominio a la **API key restriction** (HTTP referrers).
- Ajustar `.env.local` con `NEXTAUTH_URL=https://xxxxx.trycloudflare.com` y reiniciar `pnpm start`.

En Chrome del móvil → abrir la URL del túnel → menú **⋮** → **Add to Home Screen** / **Install app**.

### 4. Smoke tests manuales (checklist)

- [ ] Icono "YouTube" en el home del móvil; tap abre standalone (sin barra del navegador).
- [ ] Splash visible al arrancar.
- [ ] Home muestra grid de vídeos infantiles (Lighthouse no requerido, solo verificación visual).
- [ ] Buscar un término infantil ("Pocoyo") devuelve resultados; un término adulto debe no devolver nada inapropiado (gracias a `safeSearch=strict`).
- [ ] Reproducir un vídeo: el player carga, la barra de YouTube no aparece.
- [ ] Iniciar sesión Google funciona; avatar aparece en top bar.
- [ ] `/subscriptions` lista canales suscritos (si la cuenta tiene).
- [ ] Long-press 5s en el logo → `/parental/setup` o `/parental/login`.
- [ ] Crear PIN, entrar al panel, bloquear un canal visto recientemente.
- [ ] Volver a Home: el canal bloqueado ya no aparece.
- [ ] Bloquear vídeo desde `/watch/[id]` con PIN: desaparece de listas.
- [ ] Cerrar la PWA y volver a abrir: historial persiste, blacklist persiste, sesión persiste.
- [ ] Forzar offline (DevTools → Network → Offline): la shell carga (gracias al SW), las llamadas API fallan elegantemente.
- [ ] Cerrar sesión Google desde panel parental funciona.

### 5. Tests automáticos mínimos

Si se añadió `vitest` (recomendado):

```bash
pnpm test
```

Cobertura mínima esperada:
- `src/lib/yt/filter.ts` → `applyBlacklist` (incluye/excluye).
- `src/lib/db/cache.ts` → respeta TTL.
- `src/lib/parental/pin.ts` → set/verify ok y ko.
- `src/lib/yt/mappers.ts` → snapshots de DTOs.

### 6. Troubleshooting

- **OAuth `redirect_uri_mismatch`**: la URL del túnel cambia cada vez con `cloudflared` sin cuenta. Solución: cuenta cloudflare con subdominio fijo, o añadir varias URLs autorizadas, o usar `ngrok` con dominio reservado.
- **Cuota YouTube agotada**: revisar Google Cloud → APIs → Quotas. Aumentar TTL de cache o esperar reset diario.
- **PWA no instalable**: revisar Lighthouse → todas las check de PWA deben estar verdes; manifest accesible en `/manifest.webmanifest`; HTTPS válido.
- **Service Worker cacheando vídeo viejo**: DevTools → Application → Service Workers → Unregister + hard reload.
