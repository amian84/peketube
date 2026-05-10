# KidsTube (PWA)

Next.js 14 + App Router + Tailwind + shadcn (base-nova) + `next-pwa`.

## Requisitos

- Node 20+ y [pnpm](https://pnpm.io/)
- Variables en `.env.local` (plantilla: `.env.example`)

### Google OAuth (NextAuth)

En [Google Cloud Console](https://console.cloud.google.com/) → Credenciales → OAuth 2.0 Client ID (tipo **Web**):

- **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google` (y la URL HTTPS de producción o túnel si aplica).
- **Authorized JavaScript origins:** `http://localhost:3000`

Rellena `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (o `NEXTAUTH_SECRET`), `NEXTAUTH_URL` en `.env.local`.

### Error `MissingSecret` al arrancar `pnpm dev`

No es el prompt 03: falta el **secret** para firmar la sesión JWT.

En `kidstube/.env.local` añade **al menos** (genera un valor aleatorio):

```bash
cd kidstube
openssl rand -base64 32
```

Pega el resultado como:

```env
AUTH_SECRET=<resultado_de_openssl>
NEXTAUTH_URL=http://localhost:3000
```

También vale `NEXTAUTH_SECRET=` con el mismo valor. Reinicia `pnpm dev` tras guardar.

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Si ves **`Cannot find module './XXX.js'`** en desarrollo: caché `.next` corrupta (p. ej. servidor viejo en otro puerto o build interrumpido).

```bash
pnpm clean   # borra .next
pnpm dev
```

Cierra otros `next dev` que tengas en el mismo proyecto (mismo `kidstube/`).

```bash
pnpm dev:lan      # accesible en la red local (0.0.0.0)
pnpm typecheck
pnpm lint
pnpm build && pnpm start   # PWA + Service Worker en producción
```

Tras `pnpm build`, el Service Worker se genera en `public/sw.js` (está en `.gitignore`).

## Estructura

- `src/app/(main)/` — rutas de la app (home, shorts, watch, …)
- `src/components/ui/` — shadcn
- `src/lib/` — `yt`, `db`, `auth` (prompts siguientes)

## Prompts

Ver `../.prompts/` en la raíz del repo KidsTube.
