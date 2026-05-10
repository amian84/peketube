**Prompt type:** `documentation`

# KidsTube — Preparar entorno (PC Fedora) para PWA Next.js

## Prerequisites

- Fedora reciente con `sudo`.
- **No implementation OQ gate.**

## 1. Node.js 20 LTS + pnpm

Opción A (paquete del sistema):

```bash
sudo dnf install -y nodejs npm
node -v   # debe ser >= 20
```

Opción B (recomendada, multi-versión con `nvm`):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

Activar `pnpm` vía Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

## 2. Navegador para probar PWA

- Chrome o Chromium (mejor soporte de PWA y DevTools → Lighthouse, Application).
- Opcional: extensión Lighthouse, aunque DevTools ya la trae.

## 3. Túnel HTTPS para instalar la PWA en el móvil

La instalación de PWA exige HTTPS (excepto `localhost`). Para probar en el móvil necesitas una URL pública HTTPS. Elige una:

- **cloudflared** (recomendado, sin cuenta):
  ```bash
  sudo dnf install -y cloudflared
  # Más adelante, con `pnpm dev` corriendo:
  cloudflared tunnel --url http://localhost:3000
  ```
- **ngrok**: descarga binario, `ngrok http 3000`.

## 4. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com/) → crear proyecto **KidsTube**.
2. **APIs & Services → Library** → habilitar **YouTube Data API v3**.
3. **Credentials:**
   - **API key** restringida por **HTTP referrers**: añadir `http://localhost:3000/*` y la URL HTTPS del túnel (`https://*.trycloudflare.com/*` o tu subdominio).
   - **OAuth 2.0 Client ID** tipo **Web application**:
     - Authorized JavaScript origins: `http://localhost:3000`, URL del túnel.
     - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` y la equivalente del túnel.
4. **OAuth consent screen:** External, modo Testing; añadir tu cuenta Google como test user. Scopes: `email`, `profile`, `openid`, `https://www.googleapis.com/auth/youtube.readonly`.

## 5. Variables `.env.local` (se usarán a partir del prompt `00`)

```bash
YOUTUBE_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000
```

## 6. Verificación

```bash
node -v && pnpm -v
cloudflared --version   # si lo instalaste
```

Listo para ejecutar `00-bootstrap-nextjs.md`.
