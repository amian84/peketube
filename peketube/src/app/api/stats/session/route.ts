import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { recordSessionPing } from "@/lib/stats/store";

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
  const sessionId = typeof o.sessionId === "string" ? o.sessionId : "";
  const deltaSeconds =
    typeof o.deltaSeconds === "number" ? o.deltaSeconds : 0;
  const endSession = o.ended === true;
  if (!sessionId.trim() || (!endSession && deltaSeconds <= 0)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const userId = await getSessionUserId(req);
  recordSessionPing(sessionId, userId, deltaSeconds, Date.now(), endSession);
  return NextResponse.json({ ok: true });
}
