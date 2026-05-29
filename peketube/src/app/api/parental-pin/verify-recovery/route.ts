import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getParentalPinRow } from "@/lib/blacklist/sqlite-store";
import { normalizeRecoveryPhrase } from "@/lib/parental/pin-format";
import { verifyPinRecord } from "@/lib/parental/pin-node";

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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const phraseRaw = b.phrase;
  const phrase = typeof phraseRaw === "string" ? phraseRaw : "";
  const norm = normalizeRecoveryPhrase(phrase);
  if (norm.length < 8) {
    return NextResponse.json({ ok: false });
  }
  const row = getParentalPinRow(userId);
  if (
    !row ||
    row.recoverySaltB64 == null ||
    row.recoveryHashB64 == null ||
    row.recoveryIter == null
  ) {
    return NextResponse.json({ ok: false });
  }
  const ok = verifyPinRecord(
    norm,
    row.recoverySaltB64,
    row.recoveryHashB64,
    row.recoveryIter,
  );
  return NextResponse.json({ ok });
}
