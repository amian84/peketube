# Despliegue en TrueNAS SCALE 25 (Docker nativo) + Caddy existente

Guía para desplegar **PekeTube** como contenedor Docker en TrueNAS SCALE 25
(Electric Eel/Fangtooth) detrás de una instancia de **Caddy** ya corriendo como
App en el mismo TrueNAS, con HTTPS automático.

> Si tu Caddy corre fuera de TrueNAS, salta a la sección [Caddy externo](#caddy-en-otro-host).

---

## 1. Preparación en Google Cloud (OAuth en producción)

Hasta ahora estabas en modo **Testing** (lista blanca de cuentas). Para abrirlo
al uso normal con tu dominio final hay que **publicar** la app o, como mínimo,
añadir los URIs definitivos.

1. Ir a [Google Cloud Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).
2. **OAuth consent screen** → `PUBLISH APP` (estado **In production**).
   - Tipo **External**.
   - Si no quieres pasar la *brand verification* completa, déjalo en
     `Testing` pero **añade explícitamente** las cuentas Google que vayan a
     entrar (cada Gmail real).
3. **Credentials** → tu **OAuth 2.0 Client ID (Web)** → editar:
   - **Authorized JavaScript origins:**
     - `https://peketube.tu-dominio.com`
   - **Authorized redirect URIs:**
     - `https://peketube.tu-dominio.com/api/auth/callback/google`
   - Quita los `http://localhost:3000` si ya no los usas, o déjalos para dev.
4. **Scopes verificados:** la app usa `openid email profile` +
   `https://www.googleapis.com/auth/youtube.readonly`. El scope de YouTube es
   **sensible**; en `Testing` no exige verificación, en `Production` Google
   pedirá *brand verification* tras superar ~100 usuarios. Para uso familiar
   puedes mantenerlo en `Testing` con tus cuentas en la lista.
5. Copia `Client ID` y `Client Secret` para el `.env` del compose.

---

## 2. Construir y publicar la imagen Docker

El repo trae `peketube/Dockerfile` multi-stage:

- `node:20-alpine` con `python3 make g++` solo en *build* (necesario para
  compilar `better-sqlite3` nativamente).
- Salida `output: "standalone"` de Next.js → imagen final ~150–200 MB.
- Usuario `nextjs` no-root, volumen `/data` para el SQLite.

### Build local

```bash
cd peketube
docker build -t peketube:latest .
```

### Publicar en un registry (opción A — GHCR)

```bash
echo "<GH_TOKEN_classic_con_write:packages>" | docker login ghcr.io -u TU_USUARIO --password-stdin
docker build -t ghcr.io/TU_USUARIO/peketube:latest .
docker push ghcr.io/TU_USUARIO/peketube:latest
```

### Publicar en un registry (opción B — Docker Hub)

```bash
docker login
docker build -t TU_USUARIO/peketube:latest .
docker push TU_USUARIO/peketube:latest
```

> En TrueNAS SCALE 25 puedes también copiar la imagen sin registry: en otra
> máquina haz `docker save peketube:latest | gzip > peketube.tar.gz`, copia el
> tarball al NAS y en una shell del NAS `docker load < peketube.tar.gz`. Después
> referencia `image: peketube:latest` en el compose.

---

## 3. Preparar dataset y red en TrueNAS

### 3.1 Dataset para datos persistentes

En TrueNAS → **Datasets** crea (o reutiliza) un dataset, por ejemplo:

```
tank/apps/peketube/data
```

Permisos: dueño `apps:apps` (UID/GID 568 por defecto en SCALE Apps) o el UID
que use tu contenedor (`1001` en este Dockerfile). Lo más simple:

```bash
sudo chown -R 1001:1001 /mnt/tank/apps/peketube/data
sudo chmod 750 /mnt/tank/apps/peketube/data
```

Aquí vivirá `peketube.sqlite` (blacklist, PIN parental, historial de visionado).

### 3.2 Red Docker compartida con Caddy

Para que Caddy llegue al contenedor por **nombre DNS** (sin exponer puertos al
host), ambos deben compartir red Docker.

Comprueba la red de tu Caddy desde una shell del NAS:

```bash
docker network ls
docker inspect <nombre_o_id_contenedor_caddy> | grep -A 3 Networks
```

Si Caddy está en una red llamada, por ejemplo, `ix-caddy_default` o similar,
puedes:

- **A)** Cambiar `networks.caddy_net.name` en el compose por la red real, o
- **B)** Crear una red dedicada y conectar Caddy a ella:

```bash
docker network create caddy_net
docker network connect caddy_net <contenedor_caddy>
```

El `docker-compose.yml` del repo asume `caddy_net` como **red externa**.

---

## 4. Desplegar como Custom App en TrueNAS SCALE 25

1. TrueNAS → **Apps** → **Discover Apps** → arriba a la derecha **Custom App**.
2. **Application Name:** `peketube`.
3. Pega el contenido de `peketube/docker-compose.yml` adaptando:
   - `image:` a tu registry.
   - `volumes:` la ruta absoluta del dataset (`/mnt/tank/apps/peketube/data`).
   - `networks.caddy_net` si tu red Caddy tiene otro nombre.
4. **Save** → Install.
5. En la pestaña de la app puedes definir el `.env` (variables del entorno) o
   incluirlas inline en el YAML bajo `environment:`. Mínimas:

   ```env
   NEXTAUTH_URL=https://peketube.tu-dominio.com
   AUTH_SECRET=<openssl rand -base64 32>
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   YOUTUBE_API_KEY=...
   ```

   `AUTH_TRUST_HOST=true` ya va en el compose (necesario detrás de proxy).

6. Verifica logs: en la página de la app, **Logs** → debes ver
   `▲ Next.js 14.2.x  - Local: http://0.0.0.0:3000`.

7. Healthcheck: `GET /api/health` devuelve `{ ok: true, ts }`.

---

## 5. Configurar Caddy (HTTPS automático)

Edita el **Caddyfile** de tu App de Caddy en TrueNAS (normalmente vivirá en un
dataset del estilo `/mnt/tank/apps/caddy/config/Caddyfile`). Añade un bloque:

```caddy
peketube.tu-dominio.com {
    encode zstd gzip

    # Cabeceras de seguridad razonables (la app ya tiene CSP estricta para iframes)
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "fullscreen=(self https://www.youtube-nocookie.com)"
    }

    reverse_proxy peketube:3000 {
        # Mantiene el host original para NextAuth.
        header_up Host {host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-For   {remote_host}
        flush_interval -1
    }
}
```

Recarga Caddy:

```bash
docker exec <contenedor_caddy> caddy reload --config /etc/caddy/Caddyfile
```

DNS: apunta `peketube.tu-dominio.com` a la IP pública del router con port
forward 80/443 → IP del TrueNAS donde escucha Caddy. Caddy obtiene cert ACME
automáticamente.

### Caddy en otro host

Si Caddy corre fuera de TrueNAS, no hay red Docker común. Opciones:

- Quita `networks: [caddy_net]` del compose y publica el puerto al LAN:

  ```yaml
  ports:
    - "127.0.0.1:3000:3000"   # o "192.168.X.Y:3000:3000"
  ```

- En el Caddyfile externo:

  ```caddy
  reverse_proxy IP_DEL_TRUENAS:3000
  ```

---

## 6. Variables de entorno (resumen)

| Var | Obligatoria | Notas |
|-----|-------------|-------|
| `NEXTAUTH_URL` | sí | URL pública HTTPS final (`https://peketube.tu-dominio.com`) |
| `AUTH_SECRET` | sí | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | sí | `true` (estamos detrás de proxy) |
| `GOOGLE_CLIENT_ID` | sí | OAuth Web Client |
| `GOOGLE_CLIENT_SECRET` | sí | OAuth Web Client |
| `YOUTUBE_API_KEY` | sí (para invitado) | Cuota del proyecto para modo guest |
| `PEKETUBE_SERVER_DB_PATH` | no | Default `/data/peketube.sqlite` en la imagen |
| `BLACKLIST_DB_PATH` | no | Alias deprecado, solo si migras de versión vieja |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | no* | *Obligatorias para el formulario de contacto |
| `CONTACT_TO_EMAIL` | no | Destino (default en código: `amiansito84@gmail.com`) |
| `PEKETUBE_LOG_DIR` | no | Default `/data/logs` (junto al SQLite en Docker) |
| `PEKETUBE_LOG_RETENTION_DAYS` | no | Default `7` |
| `LOG_VIEWER_USER` / `LOG_VIEWER_PASS` | no* | *Obligatorias para abrir `/logs` (HTTP Basic Auth) |
| `NODE_ENV` | recomendado | `production` |

---

## 7. Primer arranque y verificación

1. Abre `https://peketube.tu-dominio.com` → debería cargar la home como invitado.
2. **Sign in with Google** → consent screen → vuelve a la app autenticado.
3. En TrueNAS, comprueba que se crea el fichero
   `/mnt/tank/apps/peketube/data/peketube.sqlite`.
4. Añade un canal a la blacklist → cierra sesión → vuelve a entrar: la blacklist
   sigue (servidor autoritativo).
5. Reproduce un vídeo → entra en `/you`: aparece en historial. Borra en panel
   parental y confirma que se vacía servidor + caché local.

---

## 8. Actualizaciones

```bash
# en tu equipo de build
cd peketube
docker build -t ghcr.io/TU_USUARIO/peketube:latest .
docker push ghcr.io/TU_USUARIO/peketube:latest

# en TrueNAS
# Apps → peketube → "Pull Image" (o reinstala). El volumen /data persiste.
```

Migraciones SQLite: el código aplica `CREATE TABLE IF NOT EXISTS` al arrancar
(blacklist, PIN parental, watch_history), así que actualizar es seguro mientras
solo se añadan tablas/columnas opcionales.

---

## 9. Troubleshooting

| Síntoma | Causa probable | Arreglo |
|---------|----------------|---------|
| 500 en `/api/auth/...` con `MissingSecret` | Falta `AUTH_SECRET` | Definir en `.env` y reiniciar |
| Redirect a `http://` tras login | Falta `AUTH_TRUST_HOST=true` o `NEXTAUTH_URL` mal | Ambas correctas; reiniciar |
| `redirect_uri_mismatch` de Google | URI no incluido en credenciales | Añadir `https://.../api/auth/callback/google` en Google Cloud |
| `Error: Cannot find module 'better-sqlite3'` en runtime | Build sin toolchain o arch distinta | Reconstruir en mismo arch (TrueNAS = amd64); el Dockerfile ya lo cubre |
| Historial no se ve entre dispositivos | Volumen no persistente o usuarios distintos | Verificar `/data/peketube.sqlite` y que `sub` Google sea el mismo |
| Pide **Configurar PIN** cada vez que entras | SQLite en capa efímera del contenedor (sin volumen `/data`) | Montar dataset persistente → `/data` y `PEKETUBE_SERVER_DB_PATH=/data/peketube.sqlite`; comprobar que el fichero existe tras crear el PIN |
| Caddy 502 | Red no compartida o nombre DNS incorrecto | `docker network connect` y usar `peketube` como host en `reverse_proxy` |

---

## 10. Landing pública (`peketubeinfo.amian.es`)

La app incluye una landing informativa en la ruta interna `/info`, servida en la
raíz del subdominio **`peketubeinfo.amian.es`** (mismo contenedor Docker).

### 10.1 DNS en OVH

En el panel DNS de `amian.es`:

| Tipo | Subdominio | Destino |
|------|------------|---------|
| **CNAME** | `peketubeinfo` | `peketube.amian.es.` (si ya apunta al servidor) **o** |
| **A** | `peketubeinfo` | Misma IP pública que `peketube` |

Espera la propagación (minutos–horas). Comprueba: `dig peketubeinfo.amian.es`.

### 10.2 Caddy

Añade un bloque al Caddyfile (mismo `reverse_proxy` que la app):

```caddy
peketubeinfo.amian.es {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    reverse_proxy peketube:3000 {
        header_up Host {host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Forwarded-For   {remote_host}
        flush_interval -1
    }
}
```

Recarga Caddy. El middleware detecta el host `peketubeinfo.amian.es` y sirve
la landing; el botón **Ir a PekeTube** enlaza a `https://peketube.amian.es`.

### 10.3 Variables opcionales

En el `.env` del compose (si cambias dominios):

```env
PEKETUBE_INFO_HOST=peketubeinfo.amian.es
NEXT_PUBLIC_PEKETUBE_APP_URL=https://peketube.amian.es
```

### 10.4 Probar en local

- Landing: `http://localhost:3000/info`
- Simular subdominio: añade en `/etc/hosts`  
  `127.0.0.1 peketubeinfo.amian.es` y abre `http://peketubeinfo.amian.es:3000`

Tras desplegar: copia `public/landing/` + `src/` y **rebuild** del contenedor.

---

## 11. Formulario de contacto (SMTP)

La landing (`peketubeinfo.amian.es#contact`) y la página `/contact` envían correo
vía **SMTP**. El destinatario (`CONTACT_TO_EMAIL`) no se muestra al usuario.

Añade al `.env` del compose y reinicia el contenedor:

```env
CONTACT_TO_EMAIL=amiansito84@gmail.com
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contacto@amian.es
SMTP_PASS=tu_contraseña
CONTACT_FROM_EMAIL=peketube@amian.es
```

**OVH:** usa el servidor SMTP de tu dominio (`ssl0.ovh.net`, puerto 587 STARTTLS
o 465 con `SMTP_SECURE=true`). El usuario suele ser la cuenta de correo completa.

**Gmail como destino:** no hace falta configurar nada en Gmail; solo que el SMTP
de envío pueda entregar a `amiansito84@gmail.com`.

Si faltan `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`, el formulario responde **503**
con mensaje de que el envío no está configurado.

El formulario en la landing llama a `POST /api/contact` en el mismo host
(`peketubeinfo.amian.es`); el middleware ya permite rutas `/api/*` en ese subdominio.

---

## 12. Logs rotativos y visor `/logs`

Los `console.log` / `warn` / `error` del servidor y los logs del cliente
(`[ParentalPin]`, `[HomeFeed]`, etc.) se escriben en ficheros diarios bajo
`PEKETUBE_LOG_DIR` (por defecto `/data/logs/peketube-YYYY-MM-DD.log`).
Los ficheros con más de **7 días** (configurable) se borran automáticamente.

### 12.1 Variables

```env
PEKETUBE_LOG_DIR=/data/logs
PEKETUBE_LOG_RETENTION_DAYS=7
LOG_VIEWER_USER=admin
LOG_VIEWER_PASS=una-contraseña-segura
```

Si faltan `LOG_VIEWER_USER` o `LOG_VIEWER_PASS`, la ruta `/logs` responde **404**
(el visor desactivado).

### 12.2 Acceso al visor

1. Abre `https://peketube.tu-dominio.com/logs`
2. El navegador pedirá usuario y contraseña (**HTTP Basic Auth**, equivalente a
   `.htaccess` en Apache).
3. Elige fecha, filtra por texto y pulsa **Actualizar**.

Los logs del cliente se ingieren en `POST /api/logs/ingest` (mismo origen, sin
Basic Auth). El visor y `GET /api/logs` sí exigen credenciales.

### 12.3 Caddy (opcional, doble capa)

Puedes añadir `basicauth` en Caddy además del de la app:

```caddy
peketube.tu-dominio.com {
    @logs path /logs* /api/logs*
    basicauth @logs {
        admin JDJhJDEwJ...   # caddy hash-password
    }
    reverse_proxy peketube:3000
}
```

No es obligatorio si ya usas `LOG_VIEWER_USER` / `LOG_VIEWER_PASS` en el contenedor.

### 12.4 Error `EACCES: permission denied, mkdir './data/logs'`

Si en los logs del contenedor aparece `mkdir './data/logs'` (ruta relativa bajo `/app`),
la app no está usando el volumen `/data`. Consecuencias típicas:

- Login Google → `CallbackRouteError` / página *Server error (Configuration)*.
- `/parental/login` → *No se pudo cargar el estado del PIN*.
- `/logs` → *Error 404 al cargar índice de logs* o lista vacía.

**Solución en el contenedor** — asegura estas variables (ya vienen en `docker-compose.yml`):

```env
PEKETUBE_SERVER_DB_PATH=/data/peketube.sqlite
PEKETUBE_LOG_DIR=/data/logs
```

**Solución en el host TrueNAS** — el dataset montado en `/data` debe ser escribible
por el usuario del contenedor (`nextjs`, UID **1001**):

```bash
mkdir -p /mnt/tank/apps/peketube/data/logs
chown -R 1001:1001 /mnt/tank/apps/peketube/data
```

Tras corregir variables o permisos, reinicia el contenedor. A partir de vNext el
código usa `/data/logs` por defecto en producción y, si aun así falla el disco,
degrada a consola sin tumbar auth ni APIs.

---

## 13. Estadísticas de uso (`/stats`)

Métricas en **SQLite** (mismas tablas que PIN/blacklist/historial):

| Métrica | Origen |
|---------|--------|
| Usuarios Google registrados | Primer login OAuth (`stats_oauth_user`) |
| Logins por día/mes y medias | `stats_login_event` |
| Vídeos reproducidos | `stats_video_play` (al empezar reproducción) |
| Tiempo de pantalla / sesión | `stats_app_session` (ping cada ~30 s en la PWA) |

### 13.1 Acceso

Mismas credenciales que `/logs`:

```env
LOG_VIEWER_USER=admin
LOG_VIEWER_PASS=una-contraseña-segura
```

Abre `https://peketube.tu-dominio.com/stats` → HTTP Basic Auth → panel con
totales, medias diarias/mensuales y desglose invitado vs cuenta Google.

Los endpoints de ingesta (`POST /api/stats/session`, `POST /api/stats/video`)
no exigen Basic Auth (mismo origen); el panel `GET /api/stats` sí.
