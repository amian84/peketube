**Prompt type:** `implementation`

# 02 — NextAuth + Google + scope youtube.readonly

## Objetivo

Login Google con NextAuth v5, scope `youtube.readonly`, refresh automático de access token. El token solo vive en JWT cifrado server-side, nunca expuesto al cliente.

## Open questions

| ID | Question | Options | Notes |
|----|----------|---------|-------|
| OQ-02-001 | Login obligatorio o opcional | A) Opcional: la app funciona sin login (feed público) y solo requiere login para "Suscripciones" / "Tú" B) Obligatorio al abrir | A más amigable y reduce fricción |
| OQ-02-002 | Persistencia de sesión | A) Cookie httpOnly con JWT (default NextAuth) B) Database adapter (innecesario para uso personal) | A |
| OQ-02-003 | Mostrar avatar/nombre real en top bar | A) Sí (más realista) B) Genérico | A |
| OQ-02-004 | Logout disponible solo en panel parental | A) Sí (evita que el niño cierre sesión) B) También en menú "Tú" | A |

**Status:** `resolved` (respuestas explícitas: 02-001 **B**, 02-002 **A**, 02-003 **A**, 02-004 **A**)

**Resolución registrada:**

- **OQ-02-001 B:** middleware exige sesión; solo `/sign-in`, `/api/auth/*` y estáticos sin auth.
- **OQ-02-002 A:** JWT en cookie (NextAuth por defecto).
- **OQ-02-003 A:** `UserAvatar` en `AppTopBar` con nombre e imagen de Google (`next/image` + `lh3.googleusercontent.com`).
- **OQ-02-004 A:** sin `signOut` en `/you`; texto indica que el cierre de sesión irá al panel parental (prompt 07).

**Implementación:** `next-auth@5.0.0-beta.31`, `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `AuthProvider`, `/sign-in`, `getYouTubeAccessToken` → **todas** las rutas `/api/yt/*`.

## Pasos

1. `pnpm add next-auth@beta` (v5).
2. `src/lib/auth/auth.ts`:
   ```ts
   export const { handlers, auth, signIn, signOut } = NextAuth({
     providers: [Google({
       clientId: process.env.GOOGLE_CLIENT_ID!,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       authorization: { params: { scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly", access_type: "offline", prompt: "consent" } }
     })],
     callbacks: { jwt, session },
     session: { strategy: "jwt" },
   });
   ```
3. Callback `jwt`: al primer login guarda `access_token`, `refresh_token`, `expires_at`. En llamadas posteriores, si `expires_at - 60s < now`, refrescar contra `https://oauth2.googleapis.com/token` con `grant_type=refresh_token`.
4. Callback `session`: expone solo `user` y `error?: "RefreshAccessTokenError"` al cliente. NUNCA expone tokens.
5. `src/app/api/auth/[...nextauth]/route.ts` → `export const { GET, POST } = handlers`.
6. Helper `getYouTubeAccessToken()` server-side para **todos** los Route Handlers `/api/yt/*` (no solo subscriptions; con login obligatorio, todas las llamadas a YouTube usan Bearer del usuario en vez de API key).
7. Componente `<UserAvatar />` que llama `useSession()` → si autenticado muestra foto/nombre, si no muestra placeholder + botón login en menú "Tú".
8. Página `/you` con CTA "Iniciar sesión con Google" cuando no hay sesión.

## Criterios de aceptación

- Login funciona en `localhost:3000` y devuelve a la home.
- Refresh automático sin pedir login otra vez.
- Todas las rutas `/api/yt/*` devuelven 401 si no hay sesión, 200 con datos si la hay (Bearer del usuario, sin API key).
- Avatar del usuario aparece en top bar cuando está logado.
