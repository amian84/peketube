import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  clampBlacklistWire,
  mergeUserBlacklistRow,
  type BlacklistRowWire,
} from "@/lib/blacklist/sqlite-store";

function parseWire(body: unknown): BlacklistRowWire | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const channelIds = Array.isArray(o.channelIds)
    ? o.channelIds.filter((x): x is string => typeof x === "string")
    : [];
  const videoIds = Array.isArray(o.videoIds)
    ? o.videoIds.filter((x): x is string => typeof x === "string")
    : [];
  const titleKeywords = Array.isArray(o.titleKeywords)
    ? o.titleKeywords.filter((x): x is string => typeof x === "string")
    : [];
  return { channelIds, videoIds, titleKeywords };
}

/** Importación con fusión (unión) sobre la blacklist del usuario. */
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const partial = parseWire(body);
  if (!partial) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const merged = mergeUserBlacklistRow(userId, clampBlacklistWire(partial));
  return NextResponse.json(merged);
}
