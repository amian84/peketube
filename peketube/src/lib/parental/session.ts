import { getSettingsFromDexie } from "@/lib/db/settings";
import { DEFAULT_PARENTAL_SESSION_TTL_MS } from "@/lib/parental/constants";

const SK_UNTIL = "parentalSessionExpiresAt";

function readUntil(): number {
  if (typeof sessionStorage === "undefined") return 0;
  const v = sessionStorage.getItem(SK_UNTIL);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeUntil(ts: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SK_UNTIL, String(ts));
}

function remove(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SK_UNTIL);
}

/** Extiende la sesión parental (ventana deslizante por inactividad). */
export async function touchParentalSession(): Promise<void> {
  const s = await getSettingsFromDexie();
  const ttl =
    typeof s.parentalSessionTtlMs === "number" &&
    Number.isFinite(s.parentalSessionTtlMs)
      ? s.parentalSessionTtlMs
      : DEFAULT_PARENTAL_SESSION_TTL_MS;
  writeUntil(Date.now() + ttl);
}

export async function unlockParentalSession(): Promise<void> {
  await touchParentalSession();
}

export function isParentalSessionUnlocked(now: number = Date.now()): boolean {
  return readUntil() > now;
}

export function lockParentalSession(): void {
  remove();
}
