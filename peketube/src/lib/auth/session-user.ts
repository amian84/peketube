import { auth } from "@/auth";
import { isLegacyAuthJsUuid } from "@/lib/auth/oauth-user-id";
import { lookupStableOAuthUserIdByEmail } from "@/lib/stats/store";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Detrás de Caddy el request interno es HTTP; el cliente usa HTTPS. */
export function isSecureAuthRequest(req: NextRequest): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
  }
  return req.nextUrl.protocol === "https:";
}

function repairLegacyUserId(
  id: string,
  email: string | null | undefined,
): string {
  if (!isLegacyAuthJsUuid(id)) return id;
  const norm = email?.trim();
  if (!norm) return id;
  return lookupStableOAuthUserIdByEmail(norm) ?? id;
}

/** `sub` estable del JWT (p. ej. id de Google OAuth). */
export async function getSessionUserId(
  req?: NextRequest,
): Promise<string | null> {
  const session = await auth();
  let email =
    typeof session?.user?.email === "string" && session.user.email.trim()
      ? session.user.email.trim()
      : null;

  let id: string | null =
    typeof session?.user?.id === "string" && session.user.id.length > 0
      ? session.user.id
      : null;

  if (!id && req) {
    const secret = authSecret();
    if (!secret) return null;
    const token = await getToken({
      req,
      secret,
      secureCookie: isSecureAuthRequest(req),
    });
    const sub = token?.sub;
    if (typeof sub === "string" && sub.length > 0) id = sub;
    if (
      !email &&
      typeof token?.email === "string" &&
      token.email.trim()
    ) {
      email = token.email.trim();
    }
  }

  if (!id) return null;
  return repairLegacyUserId(id, email);
}

export async function getSessionUserEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}
