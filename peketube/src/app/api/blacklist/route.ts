import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  clampBlacklistWire,
  getUserBlacklistRow,
  replaceUserBlacklistRow,
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

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const row = getUserBlacklistRow(userId);
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest) {
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
  const wire = parseWire(body);
  if (!wire) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  replaceUserBlacklistRow(userId, clampBlacklistWire(wire));
  return NextResponse.json(getUserBlacklistRow(userId));
}
