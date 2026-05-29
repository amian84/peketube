import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** `sub` estable del JWT (p. ej. id de Google OAuth). */
export async function getSessionUserId(
  req: NextRequest,
): Promise<string | null> {
  const secret = authSecret();
  if (!secret) return null;
  const token = await getToken({ req, secret });
  const sub = token?.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}
