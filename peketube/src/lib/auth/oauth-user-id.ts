import type { Account, Profile, User } from "next-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** UUID efímero que Auth.js v5 asigna a `user.id` en cada login OAuth. */
export function isLegacyAuthJsUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Identificador estable del usuario OAuth (p. ej. Google `sub` numérico).
 * No usar `user.id` de Auth.js v5 en JWT: puede ser un UUID nuevo en cada login.
 */
export function stableOAuthUserId(
  account: Account | null | undefined,
  profile: Profile | undefined,
  user: User | undefined,
  tokenSub?: string | null,
): string | null {
  if (account?.providerAccountId?.trim()) {
    return account.providerAccountId.trim();
  }
  const profileSub =
    profile &&
    typeof profile === "object" &&
    "sub" in profile &&
    typeof profile.sub === "string" &&
    profile.sub.trim()
      ? profile.sub.trim()
      : null;
  if (profileSub) return profileSub;
  const userId = user?.id?.trim();
  if (userId && !isLegacyAuthJsUuid(userId)) return userId;
  const sub = tokenSub?.trim();
  if (sub && sub.length > 0 && !isLegacyAuthJsUuid(sub)) return sub;
  return null;
}

/** Solo diagnóstico en dev/logs. */
export function describeOAuthUserId(id: string): "google-sub" | "uuid" | "other" {
  if (/^\d{10,}$/.test(id)) return "google-sub";
  if (isLegacyAuthJsUuid(id)) return "uuid";
  return "other";
}
