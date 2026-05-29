import { getPeketubeDb } from "@/lib/db/schema";
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

export async function hasPin(): Promise<boolean> {
  const res = await fetch("/api/parental-pin", { credentials: "same-origin" });
  if (res.status === 401) return false;
  if (!res.ok) throw new Error("PIN_STATE_FAILED");
  const j = (await res.json()) as { hasPin?: boolean };
  return Boolean(j.hasPin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const res = await fetch("/api/parental-pin/verify", {
    method: "POST",
    credentials: "same-origin",
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
    method: "POST",
    credentials: "same-origin",
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
    method: "PUT",
    credentials: "same-origin",
    headers: JSON_HEADERS,
    body: JSON.stringify({ pin, recoveryPhrase }),
  });
  if (res.status === 409) throw new Error("PIN_ALREADY_EXISTS");
  if (!res.ok) throw new Error("PIN_SAVE_FAILED");
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
    method: "PUT",
    credentials: "same-origin",
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
    method: "PUT",
    credentials: "same-origin",
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
    method: "DELETE",
    credentials: "same-origin",
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
