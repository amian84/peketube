import { getPeketubeDb } from "@/lib/db/schema";
import { devClientLog } from "@/lib/dev/client-log";
import {
  isValidPinFormat,
  normalizeRecoveryPhrase,
} from "@/lib/parental/pin-format";

export { isValidPinFormat, normalizeRecoveryPhrase } from "@/lib/parental/pin-format";

const LEGACY_PIN_KEY = "parentalPin";
const LEGACY_RECOVERY_KEY = "parentalRecovery";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

async function clearLegacyPinDexie(): Promise<void> {
  const dex = getPeketubeDb();
  if (!dex) return;
  await dex.settings.delete(LEGACY_PIN_KEY);
  await dex.settings.delete(LEGACY_RECOVERY_KEY);
}

export function isParentalAuthError(e: unknown): boolean {
  return e instanceof Error && e.message === "AUTH_REQUIRED";
}

const PIN_STATE_RETRY_DELAYS_MS = [0, 300, 600, 1000];
const PIN_FALSE_RECHECK_DELAY_MS = 800;

const PIN_FETCH_INIT: RequestInit = {
  credentials: "same-origin",
  cache: "no-store",
};

export async function hasPin(): Promise<boolean> {
  const res = await fetch("/api/parental-pin", PIN_FETCH_INIT);
  if (res.status === 401) {
    devClientLog("[ParentalPin]", { event: "hasPin", status: 401, hasPin: null });
    throw new Error("AUTH_REQUIRED");
  }
  if (!res.ok) {
    devClientLog("[ParentalPin]", {
      event: "hasPin",
      status: res.status,
      hasPin: null,
      error: "PIN_STATE_FAILED",
    });
    throw new Error("PIN_STATE_FAILED");
  }
  const j = (await res.json()) as { hasPin?: boolean };
  const has = Boolean(j.hasPin);
  devClientLog("[ParentalPin]", { event: "hasPin", status: res.status, hasPin: has });
  return has;
}

export type HasPinWithRetryOptions = {
  /** Tras un `false`, reconsulta una vez (carrera tras login o recién guardado). */
  recheckIfFalse?: boolean;
};

/** Reintenta tras refrescar sesión si la API devuelve 401 al cargar (carrera de cookies). */
export async function hasPinWithRetry(
  refreshSession?: () => Promise<unknown>,
  options?: HasPinWithRetryOptions,
): Promise<boolean> {
  let last: unknown;
  let attempt = 0;
  for (const delay of PIN_STATE_RETRY_DELAYS_MS) {
    attempt += 1;
    if (delay > 0) {
      devClientLog("[ParentalPin]", {
        event: "retry-wait",
        attempt,
        delayMs: delay,
        recheckIfFalse: Boolean(options?.recheckIfFalse),
      });
      await new Promise((r) => setTimeout(r, delay));
      if (refreshSession) await refreshSession();
    }
    try {
      const has = await hasPin();
      if (has || !options?.recheckIfFalse) {
        devClientLog("[ParentalPin]", {
          event: "check-done",
          attempt,
          hasPin: has,
          recheckIfFalse: Boolean(options?.recheckIfFalse),
        });
        return has;
      }
      devClientLog("[ParentalPin]", {
        event: "recheck-after-false",
        attempt,
        delayMs: PIN_FALSE_RECHECK_DELAY_MS,
      });
      await new Promise((r) => setTimeout(r, PIN_FALSE_RECHECK_DELAY_MS));
      if (refreshSession) await refreshSession();
      const rechecked = await hasPin();
      devClientLog("[ParentalPin]", {
        event: "check-done",
        attempt,
        hasPin: rechecked,
        afterRecheck: true,
      });
      return rechecked;
    } catch (e) {
      last = e;
      devClientLog("[ParentalPin]", {
        event: "check-error",
        attempt,
        error: e instanceof Error ? e.message : String(e),
      });
      if (!isParentalAuthError(e)) throw e;
    }
  }
  throw last;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch("/api/parental-pin/verify", {
    ...PIN_FETCH_INIT,
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ pin }),
  });
  if (res.status === 401) return false;
  if (!res.ok) return false;
  const j = (await res.json()) as { ok?: boolean };
  return Boolean(j.ok);
}

export async function verifyRecoveryPhrase(phrase: string): Promise<boolean> {
  const res = await fetch("/api/parental-pin/verify-recovery", {
    ...PIN_FETCH_INIT,
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ phrase }),
  });
  if (res.status === 401) return false;
  if (!res.ok) return false;
  const j = (await res.json()) as { ok?: boolean };
  return Boolean(j.ok);
}

/** Primer alta: PIN + frase (servidor SQLite, mismo usuario OAuth que blacklist). */
export async function createParentalPinWithRecovery(
  pin: string,
  recoveryPhrase: string,
): Promise<void> {
  if (!isValidPinFormat(pin)) throw new Error("PIN_INVALID_FORMAT");
  const norm = normalizeRecoveryPhrase(recoveryPhrase);
  if (norm.length < 8) throw new Error("RECOVERY_PHRASE_TOO_SHORT");
  const res = await fetch("/api/parental-pin", {
    ...PIN_FETCH_INIT,
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ pin, recoveryPhrase }),
  });
  if (res.status === 409) throw new Error("PIN_ALREADY_EXISTS");
  if (res.status === 401) throw new Error("AUTH_REQUIRED");
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (j.error === "SERVER_STORAGE") throw new Error("SERVER_STORAGE");
    throw new Error("PIN_SAVE_FAILED");
  }
  await clearLegacyPinDexie();
}

export type ChangeParentalPinResult =
  | "ok"
  | "OLD_PIN_WRONG"
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "NETWORK_ERROR";

export async function changeParentalPin(
  oldPin: string,
  newPin: string,
): Promise<ChangeParentalPinResult> {
  if (!isValidPinFormat(oldPin) || !isValidPinFormat(newPin)) {
    return "BAD_REQUEST";
  }
  const res = await fetch("/api/parental-pin", {
    ...PIN_FETCH_INIT,
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ oldPin, pin: newPin }),
  });
  if (res.status === 401) return "AUTH_REQUIRED";
  if (res.status === 400) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (j.error === "OLD_PIN_WRONG") return "OLD_PIN_WRONG";
    return "BAD_REQUEST";
  }
  if (!res.ok) return "NETWORK_ERROR";
  await clearLegacyPinDexie();
  return "ok";
}

export type ResetParentalPinResult =
  | "ok"
  | "RECOVERY_WRONG"
  | "NO_RECOVERY"
  | "BAD_REQUEST"
  | "AUTH_REQUIRED"
  | "NETWORK_ERROR";

/** Tras verificar la frase (p. ej. gate + frase en sessionStorage). */
export async function resetParentalPinWithRecoveryPhrase(
  pin: string,
  recoveryPhraseNormalized: string,
): Promise<ResetParentalPinResult> {
  if (!isValidPinFormat(pin)) return "BAD_REQUEST";
  const norm = normalizeRecoveryPhrase(recoveryPhraseNormalized);
  if (norm.length < 8) return "BAD_REQUEST";
  const res = await fetch("/api/parental-pin", {
    ...PIN_FETCH_INIT,
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ pin, recoveryPhrase: norm }),
  });
  if (res.status === 401) return "AUTH_REQUIRED";
  if (res.status === 400) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (j.error === "RECOVERY_WRONG") return "RECOVERY_WRONG";
    if (j.error === "NO_RECOVERY") return "NO_RECOVERY";
    return "BAD_REQUEST";
  }
  if (!res.ok) return "NETWORK_ERROR";
  await clearLegacyPinDexie();
  return "ok";
}

export async function clearPinAndRecovery(): Promise<void> {
  const res = await fetch("/api/parental-pin", {
    ...PIN_FETCH_INIT,
    method: "DELETE",
  });
  if (res.status === 401) return;
  await clearLegacyPinDexie();
}

/** Palabras para frase de recuperación (OQ-07-004 B). */
const RECOVERY_WORDS = [
  "luna",
  "rio",
  "nube",
  "mesa",
  "casa",
  "gato",
  "sol",
  "flor",
  "libro",
  "agua",
  "viento",
  "campo",
  "norte",
  "sur",
  "mar",
  "cielo",
  "arbol",
  "piedra",
  "fuego",
  "nieve",
  "oro",
  "plata",
  "cobre",
  "hoja",
  "nido",
  "pez",
  "ave",
  "lluvia",
  "trueno",
  "rayo",
  "estrella",
  "mapa",
  "llave",
  "puerta",
  "ventana",
  "silla",
  "luz",
  "sombra",
  "camino",
  "puente",
  "barco",
  "vela",
  "ancla",
  "faro",
  "playa",
  "duna",
  "roca",
  "coral",
  "ola",
  "brisa",
  "arena",
  "concha",
  "perla",
  "red",
  "anzuelo",
  "timon",
  "brujula",
  "rosa",
  "tulipan",
  "clavel",
  "pino",
  "roble",
  "sauce",
  "fuente",
  "pozo",
  "cerca",
  "senda",
  "collar",
  "abrazo",
  "risa",
  "canto",
] as const;

export function generateRecoveryPhrase(): string {
  const words: string[] = [];
  for (let i = 0; i < 6; i++) {
    const idx =
      crypto.getRandomValues(new Uint8Array(1))[0]! % RECOVERY_WORDS.length;
    words.push(RECOVERY_WORDS[idx]!);
  }
  return words.join(" ");
}
