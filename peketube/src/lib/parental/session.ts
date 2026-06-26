import { getSettingsFromDexie } from "@/lib/db/settings";
import { DEFAULT_PARENTAL_SESSION_TTL_MS } from "@/lib/parental/constants";

const SK_UNTIL = "parentalSessionExpiresAt";
const SK_USER = "parentalSessionOAuthUserId";

function readUntil(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const v = sessionStorage.getItem(SK_UNTIL);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function readBoundUser(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const v = sessionStorage.getItem(SK_USER);
  return v && v.length > 0 ? v : null;
}

function writeUntil(ts: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SK_UNTIL, String(ts));
}

function writeBoundUser(oauthUserId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SK_USER, oauthUserId);
}

function remove(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SK_UNTIL);
  sessionStorage.removeItem(SK_USER);
}

/** Extiende la sesión parental (ventana deslizante por inactividad). */
export async function touchParentalSession(oauthUserId: string): Promise<void> {
  const s = await getSettingsFromDexie();
  const ttl =
    typeof s.parentalSessionTtlMs === "number" &&
    Number.isFinite(s.parentalSessionTtlMs)
      ? s.parentalSessionTtlMs
      : DEFAULT_PARENTAL_SESSION_TTL_MS;
  writeUntil(Date.now() + ttl);
  writeBoundUser(oauthUserId);
}

export async function unlockParentalSession(oauthUserId: string): Promise<void> {
  await touchParentalSession(oauthUserId);
}

/**
 * Desbloqueo válido solo para el mismo usuario OAuth que introdujo el PIN.
 * Sesiones antiguas sin `SK_USER` no cuentan (hay que volver a introducir el PIN).
 */
export function isParentalSessionUnlocked(
  oauthUserId: string,
  now: number = Date.now(),
): boolean {
  if (!oauthUserId) return false;
  if (readUntil() <= now) return false;
  return readBoundUser() === oauthUserId;
}

export function lockParentalSession(): void {
  remove();
}
