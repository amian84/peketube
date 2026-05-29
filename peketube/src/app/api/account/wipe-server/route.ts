import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { wipePeketubeUserServerStores } from "@/lib/blacklist/sqlite-store";

/**
 * POST — borra datos del usuario en SQLite (PIN parental, blacklist, historial
 * si existe tabla `watch_history`). Requiere sesión Google.
 */
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  wipePeketubeUserServerStores(userId);
  return NextResponse.json({ ok: true });
}
