import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import { getParentalPinRow } from "@/lib/blacklist/sqlite-store";
import { isValidPinFormat } from "@/lib/parental/pin-format";
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
  const pinRaw = b.pin;
  const pin = typeof pinRaw === "string" ? pinRaw : "";
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ ok: false });
  }
  const row = getParentalPinRow(userId);
  if (!row) {
    return NextResponse.json({ ok: false });
  }
  const ok = verifyPinRecord(pin, row.pinSaltB64, row.pinHashB64, row.pinIter);
  return NextResponse.json({ ok });
}
