import {
  PARENTAL_COOLDOWN_MS,
  PARENTAL_MAX_PIN_ATTEMPTS,
} from "@/lib/parental/constants";

const SK_FAIL = "parentalPinFailCount";
const SK_COOL = "parentalPinCooldownUntil";

function readInt(key: string): number {
  if (typeof sessionStorage === "undefined") return 0;
  const v = sessionStorage.getItem(key);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeInt(key: string, n: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key, String(n));
}

function remove(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(key);
}

/** @internal tests */
export function getPinAttemptState(): {
  failCount: number;
  cooldownUntil: number;
} {
  return {
    failCount: readInt(SK_FAIL),
    cooldownUntil: readInt(SK_COOL),
  };
}

export function isPinCooldownActive(now: number): boolean {
  const { cooldownUntil } = getPinAttemptState();
  return cooldownUntil > now;
}

export function remainingCooldownMs(now: number): number {
  const { cooldownUntil } = getPinAttemptState();
  return Math.max(0, cooldownUntil - now);
}

export function recordPinFailure(now: number): void {
  if (typeof sessionStorage === "undefined") return;
  let fails = readInt(SK_FAIL) + 1;
  if (fails >= PARENTAL_MAX_PIN_ATTEMPTS) {
    writeInt(SK_COOL, now + PARENTAL_COOLDOWN_MS);
    fails = 0;
  }
  writeInt(SK_FAIL, fails);
}

export function clearPinAttempts(): void {
  remove(SK_FAIL);
  remove(SK_COOL);
}
