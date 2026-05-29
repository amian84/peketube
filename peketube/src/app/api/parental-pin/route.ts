import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  deleteParentalPinRow,
  getParentalPinRow,
  upsertParentalPinRow,
  type ParentalPinRow,
} from "@/lib/blacklist/sqlite-store";
import { PBKDF2_ITERATIONS } from "@/lib/parental/constants";
import { isValidPinFormat, normalizeRecoveryPhrase } from "@/lib/parental/pin-format";
import {
  derivePinHashB64,
  randomPinSalt,
  verifyPinRecord,
} from "@/lib/parental/pin-node";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const row = getParentalPinRow(userId);
  return NextResponse.json({
    hasPin: row != null,
    hasRecovery:
      row != null &&
      row.recoveryHashB64 != null &&
      row.recoverySaltB64 != null &&
      row.recoveryIter != null,
  });
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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const pin = typeof o.pin === "string" ? o.pin : "";
  const oldPin = typeof o.oldPin === "string" ? o.oldPin : "";
  const recoveryPhrase =
    typeof o.recoveryPhrase === "string" ? o.recoveryPhrase : "";

  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN_INVALID_FORMAT" }, { status: 400 });
  }

  const row = getParentalPinRow(userId);

  if (!row) {
    if (oldPin) {
      return NextResponse.json({ error: "NO_PIN" }, { status: 400 });
    }
    const norm = normalizeRecoveryPhrase(recoveryPhrase);
    if (norm.length < 8) {
      return NextResponse.json(
        { error: "RECOVERY_PHRASE_TOO_SHORT" },
        { status: 400 },
      );
    }
    const pinSalt = randomPinSalt();
    const recSalt = randomPinSalt();
    const next: ParentalPinRow = {
      pinSaltB64: pinSalt.toString("base64"),
      pinHashB64: derivePinHashB64(pin, pinSalt, PBKDF2_ITERATIONS),
      pinIter: PBKDF2_ITERATIONS,
      recoverySaltB64: recSalt.toString("base64"),
      recoveryHashB64: derivePinHashB64(norm, recSalt, PBKDF2_ITERATIONS),
      recoveryIter: PBKDF2_ITERATIONS,
    };
    upsertParentalPinRow(userId, next);
    return NextResponse.json({ ok: true });
  }

  if (oldPin) {
    if (!isValidPinFormat(oldPin)) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const okOld = verifyPinRecord(
      oldPin,
      row.pinSaltB64,
      row.pinHashB64,
      row.pinIter,
    );
    if (!okOld) {
      return NextResponse.json({ error: "OLD_PIN_WRONG" }, { status: 400 });
    }
    const pinSalt = randomPinSalt();
    const next: ParentalPinRow = {
      pinSaltB64: pinSalt.toString("base64"),
      pinHashB64: derivePinHashB64(pin, pinSalt, PBKDF2_ITERATIONS),
      pinIter: PBKDF2_ITERATIONS,
      recoverySaltB64: row.recoverySaltB64,
      recoveryHashB64: row.recoveryHashB64,
      recoveryIter: row.recoveryIter,
    };
    upsertParentalPinRow(userId, next);
    return NextResponse.json({ ok: true });
  }

  if (recoveryPhrase) {
    const norm = normalizeRecoveryPhrase(recoveryPhrase);
    if (norm.length < 8) {
      return NextResponse.json(
        { error: "RECOVERY_PHRASE_TOO_SHORT" },
        { status: 400 },
      );
    }
    if (
      row.recoverySaltB64 == null ||
      row.recoveryHashB64 == null ||
      row.recoveryIter == null
    ) {
      return NextResponse.json({ error: "NO_RECOVERY" }, { status: 400 });
    }
    const okRec = verifyPinRecord(
      norm,
      row.recoverySaltB64,
      row.recoveryHashB64,
      row.recoveryIter,
    );
    if (!okRec) {
      return NextResponse.json({ error: "RECOVERY_WRONG" }, { status: 400 });
    }
    const pinSalt = randomPinSalt();
    const next: ParentalPinRow = {
      pinSaltB64: pinSalt.toString("base64"),
      pinHashB64: derivePinHashB64(pin, pinSalt, PBKDF2_ITERATIONS),
      pinIter: PBKDF2_ITERATIONS,
      recoverySaltB64: row.recoverySaltB64,
      recoveryHashB64: row.recoveryHashB64,
      recoveryIter: row.recoveryIter,
    };
    upsertParentalPinRow(userId, next);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "MISSING_OPERATION" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  deleteParentalPinRow(userId);
  return NextResponse.json({ ok: true });
}
