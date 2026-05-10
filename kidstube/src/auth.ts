import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

if (process.env.NODE_ENV === "development") {
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    console.warn(
      "[auth] GOOGLE_CLIENT_ID no está definido o está vacío: el login con Google fallará (client_id).",
    );
  }
  if (!process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    console.warn(
      "[auth] GOOGLE_CLIENT_SECRET no está definido o está vacío: el login con Google fallará.",
    );
  }
}

const scope =
  "openid email profile https://www.googleapis.com/auth/youtube.readonly";

async function refreshGoogleAccessToken(token: {
  refresh_token?: string;
  expires_at?: number;
  access_token?: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !token.refresh_token) {
    throw new Error("Missing OAuth env or refresh_token");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok) {
    throw new Error(json.error_description ?? json.error ?? "refresh_failed");
  }
  const expiresIn = json.expires_in ?? 3600;
  return {
    access_token: json.access_token!,
    expires_at: Math.floor(Date.now() / 1000 + expiresIn),
    refresh_token: json.refresh_token ?? token.refresh_token,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  /** Auth.js v5: define `AUTH_SECRET` o `NEXTAUTH_SECRET` en `.env.local` (obligatorio). */
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.access_token && user) {
        const expiresIn = Number(account.expires_in ?? 3600);
        const expires_at = Math.floor(
          Date.now() / 1000 + (Number.isFinite(expiresIn) ? expiresIn : 3600),
        );
        return {
          ...token,
          sub: user.id ?? token.sub,
          name: user.name,
          email: user.email,
          picture: user.image,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at,
        };
      }

      if (!token.refresh_token) return token;

      const expiresAtMs = ((token.expires_at as number) ?? 0) * 1000;
      if (Date.now() < expiresAtMs - 60_000) {
        return token;
      }

      try {
        const refreshed = await refreshGoogleAccessToken(token);
        return {
          ...token,
          access_token: refreshed.access_token,
          expires_at: refreshed.expires_at,
          refresh_token: refreshed.refresh_token,
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshAccessTokenError" as const };
      }
    },
    async session({ session, token }) {
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});
