# PekeTube (PWA)

Next.js 14 + App Router + Tailwind + shadcn (base-nova) + `next-pwa`.

Cliente YouTube infantil con **panel parental** (bloqueos, PIN, timeouts del reproductor), **modo invitado** (API key del proyecto) y **sesión Google** (OAuth + cuota del usuario). Datos de servidor (PIN, blacklist, historial por cuenta) en **SQLite** (`better-sqlite3`).

## Qué incluye la app

| Área | Rutas / notas |
|------|----------------|
| Feed, búsqueda, watch, shorts, suscripciones, You | `src/app/(main)/` |
| Inicio de sesión Google | `/sign-in` |
| Panel parental (PIN 4 dígitos, bloqueos, ajustes) | `/parental/*` — enlace **Control parental** en la nav con sesión OAuth |
| Sobre / privacidad / contacto (ES·EN) | `/about`, `/privacy`, `/contact` |
| Landing pública (mismo contenedor) | `/info` — en producción suele servirse en un subdominio (`PEKETUBE_INFO_HOST`); capturas con lightbox al clic |
| Formulario de contacto | `/contact` y sección `#contact` en la landing — envío por **SMTP** (`CONTACT_TO_EMAIL`, etc.) |

Despliegue en TrueNAS + Caddy, landing, SMTP y volumen SQLite: [`docs/deploy-truenas.md`](docs/deploy-truenas.md).

## Requisitos

- Node 20+ y [pnpm](https://pnpm.io/)
- Variables en `.env.local` (plantilla: [`.env.example`](.env.example))

### Google OAuth (NextAuth)

En [Google Cloud Console](https://console.cloud.google.com/) → Credenciales → OAuth 2.0 Client ID (tipo **Web**):

- **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google` (y la URL HTTPS de producción si aplica).
- **Authorized JavaScript origins:** `http://localhost:3000`

Rellena `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` (o `NEXTAUTH_SECRET`), `NEXTAUTH_URL` en `.env.local`.

### Modo invitado (sin login)

`YOUTUBE_API_KEY` — clave de YouTube Data API v3 del proyecto. Obligatoria para navegar sin cuenta Google.

### SQLite en servidor

PIN parental, lista de bloqueos e historial por `user_id` (Google `sub`) se guardan en SQLite. Por defecto `./data/peketube.sqlite`; en Docker usar volumen en `/data` y `PEKETUBE_SERVER_DB_PATH` (ver `.env.example`).

### Landing y contacto (opcional en dev)

```env
PEKETUBE_INFO_HOST=peketubeinfo.amian.es
NEXT_PUBLIC_PEKETUBE_APP_URL=https://peketube.amian.es
# SMTP — ver .env.example (CONTACT_TO_EMAIL, SMTP_HOST, …)
```

### Error `MissingSecret` al arrancar `pnpm dev`

No es el prompt 03: falta el **secret** para firmar la sesión JWT.

```bash
cd peketube
openssl rand -base64 32
```

Pega el resultado en `.env.local`:

```env
AUTH_SECRET=<resultado_de_openssl>
NEXTAUTH_URL=http://localhost:3000
```

También vale `NEXTAUTH_SECRET=` con el mismo valor. Reinicia `pnpm dev` tras guardar.

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm dev:lan      # accesible en la red local (0.0.0.0)
pnpm test
pnpm typecheck
pnpm lint
pnpm build && pnpm start   # PWA + Service Worker en producción
```

Si ves **`Cannot find module './XXX.js'`** en desarrollo: caché `.next` corrupta.

```bash
pnpm clean   # borra .next
pnpm dev
```

Cierra otros `next dev` en el mismo `peketube/`.

Tras `pnpm build`, el Service Worker se genera en `public/sw.js` (está en `.gitignore`).

### Logs rotativos (`/logs`) y estadísticas (`/stats`)

Ficheros diarios en `PEKETUBE_LOG_DIR` (default `./data/logs`), retención 7 días.
Visores `/logs` y `/stats` con HTTP Basic Auth (`LOG_VIEWER_USER`, `LOG_VIEWER_PASS`).
Las métricas de uso (logins Google, vídeos, tiempo de pantalla) van en el mismo SQLite.
Detalle: [`docs/deploy-truenas.md`](docs/deploy-truenas.md) §12–13.

### Probar landing en local

- `http://localhost:3000/info`
- O en `/etc/hosts`: `127.0.0.1 peketubeinfo.amian.es` → `http://peketubeinfo.amian.es:3000`

## Estructura

- `src/app/(main)/` — app principal (home, watch, about, privacy, contact, …)
- `src/app/info/` — landing pública
- `src/app/parental/` — login, setup PIN, panel protegido
- `src/app/api/` — contacto, parental-pin, YouTube, auth, …
- `src/components/` — UI, layout (side/bottom nav), landing, legal, contacto, player
- `src/lib/` — `yt`, `db`, `auth`, `parental`, `contact`, `loading`, `theme`
- `public/landing/` — capturas de la landing
- `docs/deploy-truenas.md` — producción (Docker, Caddy, landing, SMTP)

## Prompts

Ver `../.prompts/` en la raíz del repo.
