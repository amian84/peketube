import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import {
  isLegacyAuthJsUuid,
  stableOAuthUserId,
} from "@/lib/auth/oauth-user-id";
import { migrateLegacyOAuthUserId } from "@/lib/auth/user-id-migration";
import {
  lookupStableOAuthUserIdByEmail,
  recordOAuthSignIn,
} from "@/lib/stats/store";

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

async function repairTokenSub(token: {
  sub?: string;
  email?: string | null;
}): Promise<string | undefined> {
  const sub = typeof token.sub === "string" ? token.sub : undefined;
  const email =
    typeof token.email === "string" && token.email.trim()
      ? token.email.trim()
      : null;
  if (!sub || !isLegacyAuthJsUuid(sub) || !email) return sub;
  const stable = lookupStableOAuthUserIdByEmail(email);
  if (stable && stable !== sub) {
    migrateLegacyOAuthUserId(sub, stable, email);
    return stable;
  }
  return sub;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.access_token && user) {
        const stableSub = stableOAuthUserId(
          account,
          profile,
          user,
          typeof token.sub === "string" ? token.sub : null,
        );
        const legacySub =
          typeof token.sub === "string" && isLegacyAuthJsUuid(token.sub)
            ? token.sub
            : isLegacyAuthJsUuid(user.id ?? "")
              ? user.id
              : null;
        if (stableSub && legacySub && legacySub !== stableSub) {
          migrateLegacyOAuthUserId(legacySub, stableSub, user.email);
        }
        if (stableSub) {
          try {
            recordOAuthSignIn(stableSub, user.email);
          } catch (e) {
            const { logServerError } = await import("@/lib/logging/server-log");
            logServerError("auth", e);
          }
        }
        const expiresIn = Number(account.expires_in ?? 3600);
        const expires_at = Math.floor(
          Date.now() / 1000 + (Number.isFinite(expiresIn) ? expiresIn : 3600),
        );
        return {
          ...token,
          sub: stableSub ?? token.sub,
          name: user.name,
          email: user.email,
          picture: user.image,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at,
        };
      }

      const repairedSub = await repairTokenSub(token);
      if (repairedSub && repairedSub !== token.sub) {
        token = { ...token, sub: repairedSub };
      }

      const expiresAtMs = ((token.expires_at as number) ?? 0) * 1000;
      const accessValid = Date.now() < expiresAtMs - 60_000;

      if (!token.refresh_token) {
        if (accessValid) return token;
        return {
          ...token,
          access_token: undefined,
          error: "RefreshAccessTokenError" as const,
        };
      }

      if (accessValid) return token;

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
        return {
          ...token,
          access_token: undefined,
          error: "RefreshAccessTokenError" as const,
        };
      }
    },
    async session({ session, token }) {
      if (typeof token.sub === "string" && token.sub.length > 0) {
        session.user.id = token.sub;
      }
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});
