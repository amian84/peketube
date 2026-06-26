import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { isSecureAuthRequest } from "@/lib/auth/session-user";

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Token OAuth de YouTube solo en servidor (no va en `session` del cliente). */
export async function getYouTubeAccessToken(
  req: NextRequest,
): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const token = await getToken({
    req,
    secret,
    secureCookie: isSecureAuthRequest(req),
  });
  if (token?.error === "RefreshAccessTokenError") return null;
  const at = token?.access_token;
  return typeof at === "string" && at.length > 0 ? at : null;
}
