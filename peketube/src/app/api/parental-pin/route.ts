import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionUserId, getSessionUserEmail } from "@/lib/auth/session-user";
import { ensureParentalPinMigratedToStableUser } from "@/lib/auth/user-id-migration";
import {
  deleteParentalPinRow,
  getParentalPinRow,
  upsertParentalPinRow,
  type ParentalPinRow,
} from "@/lib/blacklist/sqlite-store";
import { logServerError, logServerInfo } from "@/lib/logging/server-log";
import { PBKDF2_ITERATIONS } from "@/lib/parental/constants";
import { isValidPinFormat, normalizeRecoveryPhrase } from "@/lib/parental/pin-format";
import {
  derivePinHashB64,
  randomPinSalt,
  verifyPinRecord,
} from "@/lib/parental/pin-node";

function pinUserIdKind(id: string): string {
  if (/^\d{10,}$/.test(id)) return "google-sub";
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    return "uuid";
  }
  return "other";
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
      logServerInfo("parental-pin", "GET auth_required (sin userId en sesión)");
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const email = await getSessionUserEmail();
    ensureParentalPinMigratedToStableUser(userId, email);
    const row = getParentalPinRow(userId);
    logServerInfo(
      "parental-pin",
      `GET user=${userId.length > 10 ? `${userId.slice(0, 6)}…${userId.slice(-4)}` : userId} idKind=${pinUserIdKind(userId)} hasPin=${row != null}`,
    );
    return NextResponse.json(
      {
        hasPin: row != null,
        hasRecovery:
          row != null &&
          row.recoveryHashB64 != null &&
          row.recoverySaltB64 != null &&
          row.recoveryIter != null,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    logServerError("parental-pin", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }
  const email = await getSessionUserEmail();
  ensureParentalPinMigratedToStableUser(userId, email);
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
    try {
      upsertParentalPinRow(userId, next, email);
      const uid =
        userId.length > 10
          ? `${userId.slice(0, 6)}…${userId.slice(-4)}`
          : userId;
      logServerInfo("parental-pin", `PUT create ok user=${uid} idKind=${pinUserIdKind(userId)}`);
    } catch (e) {
      logServerError("parental-pin", e);
      return NextResponse.json({ error: "SERVER_STORAGE" }, { status: 500 });
    }
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
    upsertParentalPinRow(userId, next, email);
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
    upsertParentalPinRow(userId, next, email);
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
