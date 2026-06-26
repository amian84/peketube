import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const scope =
  "openid email profile https://www.googleapis.com/auth/youtube.readonly";

/**
 * Config compatible con Edge (middleware). Sin SQLite ni otros módulos Node.
 * Los callbacks jwt/session completos viven en `auth.ts`.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope,
          access_type: "offline",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
