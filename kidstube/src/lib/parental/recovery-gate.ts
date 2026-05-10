const SK = "parentalRecoveryGateUntil";
const SK_PHRASE = "parentalRecoveryPhraseOneShot";

export function setRecoveryGateOk(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SK, String(Date.now() + 5 * 60 * 1000));
}

/** Tras verificar la frase en servidor: guardar normalizada para el PUT de nuevo PIN (TTL 5 min). */
export function setRecoveryPhraseOneShot(normalizedPhrase: string): void {
  if (typeof sessionStorage === "undefined") return;
  const payload = JSON.stringify({
    p: normalizedPhrase,
    e: Date.now() + 5 * 60 * 1000,
  });
  sessionStorage.setItem(SK_PHRASE, payload);
}

export function readRecoveryPhraseOneShot(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SK_PHRASE);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { p?: string; e?: number };
    if (typeof o.p !== "string" || typeof o.e !== "number") return null;
    if (o.e <= Date.now()) return null;
    return o.p;
  } catch {
    return null;
  }
}

export function clearRecoveryPhraseOneShot(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SK_PHRASE);
}

export function isRecoveryGateOk(now: number = Date.now()): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const v = sessionStorage.getItem(SK);
  if (!v) return false;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > now;
}

export function clearRecoveryGate(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SK);
  sessionStorage.removeItem(SK_PHRASE);
}
