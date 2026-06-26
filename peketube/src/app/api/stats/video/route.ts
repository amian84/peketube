import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { recordVideoPlay } from "@/lib/stats/store";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const videoId = typeof o.videoId === "string" ? o.videoId : "";
  const watchSeconds =
    typeof o.watchSeconds === "number" ? o.watchSeconds : 0;
  if (!videoId.trim()) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const userId = await getSessionUserId(req);
  recordVideoPlay(videoId, watchSeconds, userId);
  return NextResponse.json({ ok: true });
}
